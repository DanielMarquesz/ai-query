/* eslint-disable no-console */
import { APIGatewayProxyEventV2 } from 'aws-lambda'
// import { readFileSync } from 'fs'

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

import { queryRAG } from './embedding'
// const sqlSchema = readFileSync('./database.sql', 'utf-8')

const REGION = process.env.REGION || 'us-east-1'
const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0'

const bedrock = new BedrockRuntimeClient({ region: REGION })

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    console.time('Tempo')
    const body = event.body ? JSON.parse(event.body) : {}
    const prompt =
      body?.prompt ||
      'How many payment orders for exam purchases exist in the system today? And are they for appointment payments?'

    const context = await queryRAG(prompt)

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "missing 'prompt' in the request body." }),
      }
    }

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Relevant Context:\n${context}` },
              // { type: 'text', text: `Here is the schema you should base your work on.: ${sqlSchema}` },
              { type: 'text', text: prompt },
            ],
          },
        ],
        system: `
          - You are an expert in relational databases who creates accurate and optimized SQL queries.
          - Return only the raw query, ready to be copied and executed in the database, in the most optimized and performative way.
          - Return the SQL without line breaks.
        `,
        max_tokens: 500, // sets the maximum number of output tokens
        temperature: 0.2, // optional, to control creativity
        anthropic_version: 'bedrock-2023-05-31', // mandatory for claude models
      }),
    })

    const response = await bedrock.send(command)

    const rawOutput = await response.body?.transformToString()
    const output = rawOutput ? JSON.parse(rawOutput) : {}

    console.log(output.content[0].text)
    console.timeEnd('Tempo')
    // console.log(output)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        response: output.output_text || output.completion || output,
      }),
    }
  } catch (error: any) {
    console.error('Error invoking Bedrock:', error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to invoke Bedrock',
        details: error.message || error,
      }),
    }
  }
}
