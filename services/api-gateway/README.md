# API Gateway

API Gateway service built with NestJS and Fastify adapter.

## Features

- NestJS framework with Fastify adapter for high performance
- Health check endpoint
- Basic module structure ready for expansion

## Development

```bash
# Install dependencies (from root)
pnpm install

# Start development server
pnpm --filter @unite-discord/api-gateway dev

# Build
pnpm --filter @unite-discord/api-gateway build

# Start production
pnpm --filter @unite-discord/api-gateway start
```

## Endpoints

- `GET /health` - Health check endpoint

## Configuration

- `PORT` - Server port (default: 3000)
