# Quick Start Guide

Get ReasonBridge running locally in under 10 minutes.

## Prerequisites

- **Node.js 20 LTS**: `node --version` should show v20.x
- **pnpm 9.x**: `npm install -g pnpm`
- **Docker**: For database and cache services

## Setup Steps

### 1. Clone and Install

```bash
git clone https://github.com/steiner385/reasonbridge.git
cd reasonbridge
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (5432), Redis (6379), and supporting services.

### 3. Configure Environment

```bash
cp .env.example .env
```

The defaults work for local development. Edit if needed.

### 4. Initialize Database

```bash
pnpm --filter=@reason-bridge/db-models exec prisma generate
pnpm --filter=@reason-bridge/db-models exec prisma migrate dev
```

### 5. Build Packages

```bash
pnpm -r --filter="@reason-bridge/*" build
```

### 6. Start Development

```bash
pnpm dev
```

### 7. Open the App

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs

## Verify Setup

```bash
# Check service health
curl http://localhost:3000/health

# Run tests
pnpm test:unit
```

## Common Commands

| Command          | Description        |
| ---------------- | ------------------ |
| `pnpm dev`       | Start all services |
| `pnpm test:unit` | Run unit tests     |
| `pnpm lint`      | Check code quality |
| `pnpm format`    | Format code        |

## Troubleshooting

**Port in use?**

```bash
lsof -i :5173  # Find process
kill -9 <PID>  # Kill it
```

**Database connection failed?**

```bash
docker compose ps     # Check services running
docker compose logs postgres  # View logs
```

**Build errors?**

```bash
pnpm install          # Reinstall dependencies
pnpm -r build         # Rebuild packages
```

## Next Steps

- Read [Developer Guide](./DEVELOPER.md) for detailed workflow
- Review [Architecture](./ARCHITECTURE.md) for system design
- Check [Deployment Guide](./DEPLOYMENT.md) for production setup
