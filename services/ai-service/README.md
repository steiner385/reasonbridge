# AI Service

AI service for content analysis and moderation using AWS Bedrock.

## Overview

This service provides AI-powered capabilities for the reasonBridge platform, including:

- Content analysis and classification
- Automated moderation
- Sentiment analysis
- Integration with AWS Bedrock

## Technology Stack

- **Framework**: NestJS 10.x
- **Runtime**: Node.js 20 LTS
- **HTTP Server**: Fastify
- **Database ORM**: Prisma (via @reason-bridge/db-models)
- **AI Provider**: AWS Bedrock (via @reason-bridge/ai-client)

## Project Structure

```
src/
├── ai/               # AI service logic (Bedrock integration)
│   ├── ai.module.ts
│   └── bedrock.service.ts
├── health/           # Health check endpoints
│   ├── health.controller.ts
│   └── health.module.ts
├── prisma/           # Database integration
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── app.module.ts     # Root application module
└── main.ts           # Application entry point
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start:prod

# Type checking
pnpm typecheck
```

## API Endpoints

### Health Check

- **GET** `/health` - Service health status

## Environment Variables

| Variable       | Description                  | Default |
| -------------- | ---------------------------- | ------- |
| `PORT`         | Service port                 | `3002`  |
| `DATABASE_URL` | PostgreSQL connection string | -       |

## Current Implementation Status

- ✅ NestJS base setup with Fastify
- ✅ Health check endpoint
- ✅ Prisma module integration
- ⚠️ Bedrock service (stub/placeholder - awaiting full implementation)

## Future Enhancements

- Full AWS Bedrock integration with actual AI models
- Content analysis endpoints
- Moderation workflows
- Rate limiting and caching
- Comprehensive test coverage
