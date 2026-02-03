# Demo Environment - Quick Reference

## One-Command Start

```bash
./scripts/start-demo.sh
```

## Service URLs

### Frontend & API

- Frontend: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

### Backend Services

- User Service: http://localhost:3001
- AI Service: http://localhost:3002
- Moderation: http://localhost:3003
- Recommendation: http://localhost:3004
- Notification: http://localhost:3005
- Fact Check: http://localhost:3006

### Infrastructure

- PostgreSQL: localhost:5432 (reasonbridge/reasonbridge/reasonbridge_dev)
- Redis: localhost:6379
- LocalStack: localhost:4566
- MailHog: http://localhost:8025
- Jaeger: http://localhost:16686
- Qdrant: http://localhost:6333

## Health Checks

```bash
# Check infrastructure
docker compose ps

# Check AI service
curl http://localhost:3002/health

# Check all services
for port in 3001 3002 3003 3004 3005 3006; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r .status 2>/dev/null || echo 'not responding')"
done
```

## Common Commands

### Start/Stop

```bash
# Start infrastructure only
docker compose up -d

# Stop infrastructure
docker compose down

# Stop everything and clean up
docker compose down -v
```

### Development

```bash
# Install dependencies
pnpm install

# Build packages
pnpm -r --filter="@reason-bridge/*" build

# Run tests
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Lint
pnpm lint
pnpm lint:fix

# Type check
pnpm typecheck
```

### Database

```bash
# Run migrations
cd packages/db-models
DATABASE_URL="postgresql://reasonbridge:reasonbridge@localhost:5432/reasonbridge_dev" npx prisma migrate deploy

# Open Prisma Studio
pnpm db:studio

# Seed database
pnpm db:seed
```

## Troubleshooting

### Port in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill <PID>
```

### Database issues

```bash
# Check PostgreSQL
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres
```

### Clear everything and restart

```bash
# Stop all services
docker compose down -v

# Kill any remaining processes
ps aux | grep -E "node.*tsx|node.*vite" | awk '{print $2}' | xargs kill

# Start fresh
./scripts/start-demo.sh
```

## Documentation

- Full setup guide: [docs/DEMO_SETUP.md](./docs/DEMO_SETUP.md)
- Complete summary: [docs/DEMO_COMPLETE.md](./docs/DEMO_COMPLETE.md)
- Architecture: [CLAUDE.md](../CLAUDE.md)
- Main README: [README.md](../README.md)
