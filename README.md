# AI Query - RAG-Powered SQL Generation System

A sophisticated Retrieval-Augmented Generation (RAG) system that converts natural language queries into optimized SQL statements using AWS Bedrock and vector embeddings. This project leverages Claude 3 Haiku for intelligent SQL generation and Qdrant for semantic search over database schemas.

## 🎯 Project Objectives

This system addresses the challenge of translating business questions into accurate SQL queries by:

- **Natural Language Processing**: Converting human-readable questions into precise SQL statements
- **Context-Aware Generation**: Using RAG to provide relevant database schema context to the AI model
- **Optimized Performance**: Generating efficient, production-ready SQL queries
- **Scalable Architecture**: Built on AWS serverless infrastructure for high availability

## 🏗️ Architecture Overview

The system implements a modern RAG architecture with the following components:

```
User Query → API Gateway → Lambda Function → RAG Pipeline → Claude 3 → SQL Response
                                    ↓
                            Vector Database (Qdrant)
                                    ↓
                            Database Schema Embeddings
```

### Core Components

1. **API Gateway**: HTTP endpoint for receiving natural language queries
2. **Lambda Function**: Serverless compute handling request processing
3. **RAG Pipeline**: Semantic search and context retrieval system
4. **Vector Database**: Qdrant instance storing schema embeddings
5. **AI Model**: Claude 3 Haiku for SQL generation
6. **Embedding Model**: Amazon Titan for text vectorization

## 🔧 RAG Implementation Details

### Embedding Generation

The system uses **Amazon Titan Embed Text v1** to create vector representations of:
- Database schema definitions
- Table structures and relationships
- User queries for semantic matching

```typescript
async function getEmbedding(text: string) {
  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v1',
    contentType: 'application/json',
    body: JSON.stringify({ inputText: text })
  });
  // Returns 1536-dimensional vector
}
```

### Vector Storage & Retrieval

**Qdrant** serves as the vector database, storing schema embeddings with metadata:

```typescript
// Store schema chunks with embeddings
await client.upsert('sql_schema_1', {
  points: [{
    id: chunkId,
    vector: embedding,
    payload: { text: schemaChunk }
  }]
});

// Retrieve relevant context
const searchResult = await client.search('sql_schema_1', {
  vector: queryEmbedding,
  limit: 5 // Top 5 most relevant schema parts
});
```

### SQL Generation

**Claude 3 Haiku** generates optimized SQL using retrieved context:

```typescript
const messages = [{
  role: 'user',
  content: [
    { type: 'text', text: `Relevant Context:\n${context}` },
    { type: 'text', text: userQuery }
  ]
}];

const systemPrompt = `
- You are an expert in relational databases who creates accurate and optimized SQL queries.
- Return only the raw query, ready to be copied and executed in the database.
- Return the SQL without line breaks for optimal performance.
`;
```

## 🚀 AWS Deployment Guide

### Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 20.x or later
- AWS CDK v2 installed globally

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure AWS Environment

```bash
# Configure AWS credentials
aws configure

# Bootstrap CDK (first time only)
npx cdk bootstrap
```

### Step 3: Deploy Infrastructure

```bash
# Build the project
npm run build

# Deploy to AWS
npx cdk deploy
```

### Step 4: Set Up Vector Database

The current implementation uses a local Qdrant instance. For production deployment:

1. **Option A: Self-hosted Qdrant on EC2**
   ```bash
   # Launch EC2 instance with Qdrant
   docker run -p 6333:6333 qdrant/qdrant
   ```

2. **Option B: Qdrant Cloud**
   - Sign up at [Qdrant Cloud](https://cloud.qdrant.io/)
   - Update the connection URL in `embedding.ts`

3. **Option C: AWS OpenSearch with vector support**
   - Modify the vector storage implementation
   - Use OpenSearch's k-NN capabilities

### Step 5: Initialize Schema Embeddings

```bash
# Run the embedding generation script
node -r ts-node/register src/embedding.ts
```

## 📊 Database Schema

The system works with a ticket ordering database containing:

- **Users**: Customer information and authentication
- **Tickets**: Event tickets with types, pricing, and availability
- **Orders**: Purchase records linking users to tickets

```sql
-- Example schema structure
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `ticket` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('General Area','Grand Stand','VIP','Golden Circle'),
  `availableUnits` int NOT NULL,
  `price` int NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `order` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticketId` int NOT NULL,
  `userId` int NOT NULL,
  `status` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`ticketId`) REFERENCES `ticket` (`id`),
  FOREIGN KEY (`userId`) REFERENCES `user` (`id`)
);
```

## 🔌 API Usage

### Endpoint

```
POST https://your-api-gateway-url/chat
```

### Request Format

```json
{
  "prompt": "How many VIP tickets were sold this month?"
}
```

### Response Format

```json
{
  "prompt": "How many VIP tickets were sold this month?",
  "response": "SELECT COUNT(*) FROM `order` o JOIN `ticket` t ON o.ticketId = t.id WHERE t.type = 'VIP' AND MONTH(o.createdAt) = MONTH(CURRENT_DATE()) AND YEAR(o.createdAt) = YEAR(CURRENT_DATE());"
}
```

### Example Queries

- "Show me all pending orders for today"
- "What's the total revenue from Grand Stand tickets?"
- "List users who bought VIP tickets in the last week"
- "How many tickets are still available for each type?"

## 🛠️ Development Commands

```bash
# Compile TypeScript
npm run build

# Watch for changes
npm run watch

# Run tests
npm run test

# Deploy to AWS
npx cdk deploy

# Compare deployed stack with current state
npx cdk diff

# Generate CloudFormation template
npx cdk synth
```

## 🔧 Configuration

### Environment Variables

- `REGION`: AWS region for Bedrock services (default: us-east-1)
- `QDRANT_URL`: Vector database connection URL

### Model Configuration

- **Embedding Model**: `amazon.titan-embed-text-v1`
- **Generation Model**: `anthropic.claude-3-haiku-20240307-v1:0`
- **Max Tokens**: 500
- **Temperature**: 0.2 (low creativity for precise SQL)

## 🔒 Security Considerations

- Lambda functions use IAM roles with minimal required permissions
- API Gateway configured with CORS for controlled access
- No hardcoded credentials in source code
- Vector database should be secured in production environments

## 📈 Performance Optimization

- **Chunking Strategy**: Database schema split into logical chunks for better retrieval
- **Embedding Caching**: Consider caching embeddings for frequently accessed schemas
- **Lambda Configuration**: 1024MB memory, 30-second timeout for optimal performance
- **Vector Search**: Limited to top 5 results for context efficiency

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
