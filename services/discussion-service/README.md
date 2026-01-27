# Discussion Service

NestJS-based microservice for managing discussion operations in reasonBridge.

## Features

- NestJS with Fastify adapter
- Prisma ORM integration via `@reason-bridge/db-models`
- Health check endpoint
- TypeScript 5.x

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Run in development mode
pnpm --filter @reason-bridge/discussion-service dev

# Build
pnpm --filter @reason-bridge/discussion-service build

# Start production build
pnpm --filter @reason-bridge/discussion-service start
```

## API Endpoints

- `GET /health` - Health check endpoint

## Port

Default: `3002` (configurable via `PORT` environment variable)
