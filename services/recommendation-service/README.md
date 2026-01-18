# Recommendation Service

Recommendation service for personalized content suggestions.

## Overview

This service provides personalized recommendation capabilities for the uniteDiscord platform, including:

- Content discovery and suggestions
- User interest profiling
- Trending topics and discussions
- Personalized feed curation

## Technology Stack

- **Framework**: NestJS 10.x
- **Runtime**: Node.js 20 LTS
- **HTTP Server**: Fastify
- **Database ORM**: Prisma (via @unite-discord/db-models)

## Project Structure

```
src/
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
| `PORT`         | Service port                 | `3004`  |
| `DATABASE_URL` | PostgreSQL connection string | -       |

## Current Implementation Status

- ✅ NestJS base setup with Fastify
- ✅ Health check endpoint
- ✅ Prisma module integration
- ⚠️ Recommendation algorithms (awaiting implementation)

## Future Enhancements

- Collaborative filtering algorithms
- Content-based recommendation engine
- User behavior tracking
- Trending content analysis
- Machine learning model integration
- Comprehensive test coverage
