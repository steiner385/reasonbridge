# Quickstart Guide: Discussion Participation

**Feature**: Discussion Participation (Feature 009)
**Purpose**: Local development setup and testing guide
**Last Updated**: 2026-01-27

## Prerequisites

Ensure the following are installed and configured:

- **Node.js**: 20 LTS
- **pnpm**: 8.x or later
- **PostgreSQL**: 14+ running locally
- **Git**: Latest version
- **Docker** (optional): For running PostgreSQL in a container

Verify your environment:

```bash
node --version   # Should be v20.x.x
pnpm --version   # Should be 8.x.x
psql --version   # Should be 14+
```

## Project Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone https://github.com/steiner385/reasonbridge.git
cd reasonbridge

# Install all workspace dependencies
pnpm install

# Build shared packages
pnpm -r build
```

### 2. Environment Configuration

Create environment files for backend and frontend:

**Backend** (`packages/api/.env`):

```env
# Database
DATABASE_URL="postgresql://reasonbridge:reasonbridge@localhost:5432/reasonbridge_dev"

# Authentication
JWT_SECRET="your-dev-jwt-secret-change-in-production"
JWT_EXPIRATION="7d"

# Redis (for rate limiting)
REDIS_URL="redis://localhost:6379"

# Application
NODE_ENV="development"
PORT=3000
LOG_LEVEL="DEBUG"

# CORS
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
```

**Frontend** (`packages/web/.env`):

```env
VITE_API_URL="http://localhost:3000/api"
VITE_WS_URL="ws://localhost:3000"
```

### 3. Database Setup

#### Option A: Local PostgreSQL

```bash
# Create database and user
psql -U postgres <<EOF
CREATE DATABASE reasonbridge_dev;
CREATE USER reasonbridge WITH PASSWORD 'reasonbridge';
GRANT ALL PRIVILEGES ON DATABASE reasonbridge_dev TO reasonbridge;
EOF

# Run migrations
cd packages/db-models
pnpm prisma migrate dev

# Seed database with test data
pnpm prisma db seed
```

#### Option B: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run -d \
  --name reasonbridge-postgres \
  -e POSTGRES_DB=reasonbridge_dev \
  -e POSTGRES_USER=reasonbridge \
  -e POSTGRES_PASSWORD=reasonbridge \
  -p 5432:5432 \
  postgres:14-alpine

# Run migrations
cd packages/db-models
pnpm prisma migrate dev
pnpm prisma db seed
```

### 4. Start Development Servers

**Terminal 1 - Backend API:**

```bash
cd packages/api
pnpm dev
```

The API server will start on `http://localhost:3000`

**Terminal 2 - Frontend:**

```bash
cd packages/web
pnpm dev
```

The frontend will start on `http://localhost:5173`

**Terminal 3 - Redis (for rate limiting):**

```bash
# If Redis is not installed, use Docker:
docker run -d --name reasonbridge-redis -p 6379:6379 redis:7-alpine
```

## Testing the Feature

### Manual Testing Flow

#### 1. User Authentication

First, authenticate to get a JWT token:

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!"
  }'

# Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Save the returned JWT token for subsequent requests.

#### 2. Create a Discussion

```bash
export TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3000/api/discussions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "topicId": "uuid-of-existing-topic",
    "title": "Should we prioritize climate change mitigation?",
    "initialResponse": {
      "content": "I believe climate change should be our top priority because the scientific consensus is clear: we have a limited window to act. The longer we wait, the more expensive and difficult mitigation becomes. What are your thoughts on balancing economic growth with environmental protection?",
      "citations": [
        {
          "url": "https://www.ipcc.ch/report/ar6/",
          "title": "IPCC Sixth Assessment Report"
        }
      ]
    }
  }'
```

#### 3. Post a Response

```bash
curl -X POST http://localhost:3000/api/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "discussionId": "uuid-from-created-discussion",
    "content": "While I agree climate change is important, I think we need a more nuanced approach. Economic stability enables us to invest in green technology. We should focus on incentivizing innovation rather than imposing strict regulations that might harm developing economies."
  }'
```

#### 4. Reply to a Response

```bash
curl -X POST http://localhost:3000/api/responses/{responseId}/replies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "That is a fair point about developing economies. However, climate impacts disproportionately affect those same economies. Perhaps we need differentiated responsibility frameworks where developed nations shoulder more initial costs?"
  }'
```

#### 5. Edit a Response (with optimistic locking)

```bash
curl -X PUT http://localhost:3000/api/responses/{responseId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "Updated response content with additional context...",
    "version": 1,
    "citations": [
      {
        "url": "https://example.com/new-source",
        "title": "Additional supporting evidence"
      }
    ]
  }'
```

**Note**: The `version` field must match the current database version. If another user edited the response, you'll get a 409 Conflict error.

#### 6. Delete a Response

```bash
# Soft delete (if response has replies)
curl -X DELETE http://localhost:3000/api/responses/{responseId} \
  -H "Authorization: Bearer $TOKEN"

# Response:
# - 200 with {"deletionType": "SOFT"} if response has replies (content replaced with "[deleted by author]")
# - 204 if response has no replies (permanently deleted)
```

#### 7. List Discussions for a Topic

```bash
curl "http://localhost:3000/api/discussions?topicId={topicId}&sortBy=activity&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

#### 8. Get Discussion Details with Threaded Responses

```bash
curl http://localhost:3000/api/discussions/{discussionId} \
  -H "Authorization: Bearer $TOKEN"
```

### Automated Testing

#### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests for discussion module
pnpm test discussions

# Run tests for response module
pnpm test responses

# Run tests with coverage
pnpm test:coverage
```

#### Integration Tests

```bash
# Start test database (Docker)
docker run -d \
  --name reasonbridge-test-db \
  -e POSTGRES_DB=reasonbridge_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 \
  postgres:14-alpine

# Run integration tests
pnpm test:integration

# Cleanup
docker stop reasonbridge-test-db
docker rm reasonbridge-test-db
```

#### E2E Tests (Playwright)

```bash
# Install Playwright browsers
pnpm exec playwright install

# Run E2E tests
pnpm test:e2e

# Run E2E tests in UI mode (interactive)
pnpm exec playwright test --ui

# Run specific test file
pnpm exec playwright test discussion-creation.spec.ts
```

**Example E2E Test Scenarios:**

- Create discussion and verify it appears in topic list
- Post response and verify threading
- Edit response and verify version conflict handling
- Delete response with replies and verify soft delete behavior
- Test rate limiting (attempt to post 11 responses rapidly)

## Troubleshooting

### Database Issues

**Problem**: `Error: P1001: Can't reach database server`

**Solution**:
```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Check DATABASE_URL in .env
echo $DATABASE_URL

# Restart PostgreSQL
# macOS: brew services restart postgresql
# Linux: sudo systemctl restart postgresql
# Docker: docker restart reasonbridge-postgres
```

**Problem**: Migration fails with "relation already exists"

**Solution**:
```bash
# Reset database (WARNING: destroys all data)
cd packages/db-models
pnpm prisma migrate reset

# Or manually drop and recreate
psql -U postgres -c "DROP DATABASE reasonbridge_dev;"
psql -U postgres -c "CREATE DATABASE reasonbridge_dev;"
pnpm prisma migrate deploy
```

### Rate Limiting Issues

**Problem**: Getting 429 Too Many Requests during testing

**Solution**:
```bash
# Flush Redis to clear rate limit counters
redis-cli FLUSHALL

# Or disable rate limiting in development
# In packages/api/src/modules/discussions/discussions.controller.ts
# Comment out @Throttle() decorators temporarily
```

### Optimistic Locking Conflicts

**Problem**: Getting 409 Conflict when editing responses

**Solution**:
```bash
# Fetch current version before editing
curl http://localhost:3000/api/responses/{responseId} \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.version'

# Use the returned version number in your PUT request
```

### SSRF Validation Errors

**Problem**: Citation URLs rejected with "SSRF risk detected"

**Solution**:
```bash
# Avoid localhost/private IPs in citations
# ❌ http://localhost/file
# ❌ http://192.168.1.1/admin
# ❌ http://127.0.0.1

# Use public URLs only
# ✅ https://example.com/article
# ✅ https://ipcc.ch/report
```

### Thread Depth Visualization Issues

**Problem**: Deeply nested threads (>5 levels) not displaying correctly

**Solution**:
- Frontend automatically flattens threads beyond level 5
- Check browser console for React recursion warnings
- Verify `threadDepth` calculation in response serialization

## Seeded Test Data

The database seed script creates the following test data:

- **3 Topics**: "Climate Change", "Healthcare Policy", "Education Reform"
- **5 Discussions** per topic
- **10-20 Responses** per discussion (with 2-3 levels of threading)
- **3 Test Users**: `alice@example.com`, `bob@example.com`, `charlie@example.com` (password: `password123`)

Use these accounts for testing multi-user interactions:

```bash
# Login as Alice
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }'
```

## Development Workflow

### TDD Approach

1. **Write failing test** for new feature
2. **Run tests** to confirm failure
3. **Implement minimum code** to pass test
4. **Run tests** to confirm pass
5. **Refactor** while keeping tests green

Example TDD cycle for adding "like" feature to responses:

```bash
# 1. Write test in responses.service.spec.ts
# 2. Run test
pnpm test responses.service.spec.ts

# 3. Implement likeResponse() method
# 4. Run test again
pnpm test responses.service.spec.ts

# 5. Refactor and verify
pnpm test
```

### Git Workflow

```bash
# Create feature branch
git checkout -b 009-discussion-participation

# Make changes, run tests
pnpm test
pnpm lint

# Commit (pre-commit hooks will run)
git add .
git commit -m "feat(discussions): implement response threading"

# Push and create PR
git push -u origin 009-discussion-participation
```

**IMPORTANT**: Never use `git commit --no-verify` - pre-commit hooks enforce code quality.

## Performance Testing

### Load Testing with Artillery

```bash
# Install Artillery
pnpm add -D artillery

# Create load test config (artillery.yml)
cat > artillery.yml <<EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 120
      arrivalRate: 50
      name: Sustained load
scenarios:
  - name: Create and view discussions
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "alice@example.com"
            password: "password123"
          capture:
            - json: "$.token"
              as: "token"
      - post:
          url: "/api/discussions"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            topicId: "{{ topicId }}"
            title: "Test Discussion {{ \$randomString() }}"
            initialResponse:
              content: "This is a test response with sufficient length to meet validation requirements."
      - get:
          url: "/api/discussions?topicId={{ topicId }}"
          headers:
            Authorization: "Bearer {{ token }}"
EOF

# Run load test
pnpm exec artillery run artillery.yml
```

**Success Criteria**:
- p95 latency <500ms for discussion creation
- p99 latency <2s for threaded response retrieval
- 0% error rate under 100 concurrent users

## Next Steps

After completing local testing:

1. **Run full test suite**: `pnpm test && pnpm test:integration && pnpm test:e2e`
2. **Check test coverage**: `pnpm test:coverage` (must be ≥80%)
3. **Lint code**: `pnpm lint`
4. **Review API contracts**: Open `contracts/*.yaml` in Swagger UI
5. **Create PR** following the Git Workflow above
6. **Monitor CI pipeline**: Jenkins will run all tests automatically

## Additional Resources

- **API Documentation**: `http://localhost:3000/api/docs` (Swagger UI)
- **Database Schema**: `packages/db-models/prisma/schema.prisma`
- **OpenAPI Specs**: `specs/009-discussion-participation/contracts/`
- **Feature Spec**: `specs/009-discussion-participation/spec.md`
- **Implementation Plan**: `specs/009-discussion-participation/plan.md`

## Support

If you encounter issues not covered in this guide:

1. Check the **Troubleshooting** section above
2. Review **spec.md** for edge cases and assumptions
3. Search existing GitHub issues
4. Create a new issue with reproduction steps
