# User Service

NestJS-based microservice for managing user operations in uniteDiscord.

## Features

- NestJS with Fastify adapter
- Prisma ORM integration via `@unite-discord/db-models`
- Health check endpoint
- TypeScript 5.x

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Run in development mode
pnpm --filter @unite-discord/user-service dev

# Build
pnpm --filter @unite-discord/user-service build

# Start production build
pnpm --filter @unite-discord/user-service start
```

## API Endpoints

- `GET /health` - Health check endpoint

## Port

Default: `3001` (configurable via `PORT` environment variable)
