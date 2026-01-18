# Moderation Service

Moderation service for content review and policy enforcement.

## Overview

This service provides moderation capabilities for the uniteDiscord platform, including:

- Content review workflows
- Policy enforcement
- User and content flagging
- Automated and manual moderation processes

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
| `PORT`         | Service port                 | `3003`  |
| `DATABASE_URL` | PostgreSQL connection string | -       |

## Current Implementation Status

- ✅ NestJS base setup with Fastify
- ✅ Health check endpoint
- ✅ Prisma module integration
- ⚠️ Moderation workflows (awaiting implementation)

## Future Enhancements

- Content review API endpoints
- Policy rules engine
- Moderation queue management
- Integration with AI service for automated moderation
- Appeal workflows
- Comprehensive test coverage
