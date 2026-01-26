# User Service

NestJS-based microservice for managing user operations in reasonBridge.

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
pnpm --filter @reason-bridge/user-service dev

# Build
pnpm --filter @reason-bridge/user-service build

# Start production build
pnpm --filter @reason-bridge/user-service start
```

## API Endpoints

- `GET /health` - Health check endpoint

## Port

Default: `3001` (configurable via `PORT` environment variable)
