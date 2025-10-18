import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { readFileSync } from "fs";
const sqlSchema = readFileSync("./schema.sql", "utf-8");

const REGION = process.env.REGION || "us-east-1";
const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

const bedrock = new BedrockRuntimeClient({ region: REGION });

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const prompt = body.prompt;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing 'prompt' in request body." }),
      };
    }
    
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Aqui está o schema ao qual você deve se basear: ${sqlSchema}` },
              { type: "text", text: prompt }
            ],
          },          
        ],
        system: "Você é um especialista em bancos de dados relacionais que cria queries SQL precisas e otimizadas.",
      }),
    });

    const response = await bedrock.send(command);
    
    const rawOutput = await response.body?.transformToString();
    const output = rawOutput ? JSON.parse(rawOutput) : {};

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        response: output.output_text || output.completion || output,
      }),
    };
  } catch (error: any) {
    console.error("Error invoking Bedrock:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to invoke Bedrock",
        details: error.message || error,
      }),
    };
  }
};
