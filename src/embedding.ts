import { readFileSync } from 'fs'

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { QdrantClient } from '@qdrant/js-client-rest'

const bedrock = new BedrockRuntimeClient({ region: process.env.REGION || 'us-east-1' })
const client = new QdrantClient({ url: 'http://localhost:6333' })
const sqlSchema = readFileSync('/home/daniel/welbe/Backend.Backoffice.Context/src/use-cases/ai/database.sql', 'utf-8')

const chunks = sqlSchema
  .split(';')
  .map(c => c.trim())
  .filter(Boolean)

async function getEmbedding(text: string) {
  const input = {
    inputText: text,
  }
  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v1',
    contentType: 'application/json',
    accept: 'application/json',
    body: new TextEncoder().encode(JSON.stringify(input)),
  })
  const response = await bedrock.send(command)
  const raw = await response.body?.transformToString()
  const output = raw ? JSON.parse(raw) : {}
  return output.embedding
}

// Push embeddings to Qdrant
;(async () => {
  for (const [i, chunk] of chunks.entries()) {
    const vector = await getEmbedding(chunk)
    await client.upsert('sql_schema_1', {
      points: [
        {
          id: i,
          vector,
          payload: { text: chunk },
        },
      ],
    })
  }
})()

export async function queryRAG(prompt: string) {
  const promptVector = await getEmbedding(prompt)

  const searchResult = await client.search('sql_schema_1', {
    vector: promptVector,
    limit: 5, // top 5 relevant chunks
  })

  const context = searchResult.map(p => p.payload?.text).join('\n')

  return context
}
