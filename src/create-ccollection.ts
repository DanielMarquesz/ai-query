import { QdrantClient } from '@qdrant/js-client-rest'

const client = new QdrantClient({ url: 'http://localhost:6333' })

async function createCollection() {
  await client.createCollection('sql_schema_1', {
    vectors: {
      size: 1536, // embedding size (check your model)
      distance: 'Cosine', // similarity metric
    },
  })
}

;(async () => {
  try {
    await createCollection()
    console.log('Created')
  } catch (error) {
    console.log(error)
  }
})()
