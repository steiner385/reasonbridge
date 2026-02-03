# Quickstart: Real-Time Preview Feedback

**Feature**: 014-realtime-preview-feedback
**Date**: 2026-02-02

## Prerequisites

- Node.js 20 LTS
- pnpm 9.x
- Docker (for Redis, Qdrant, PostgreSQL)
- Valid JWT token (for authenticated requests)

## Quick Test

### 1. Start Infrastructure

```bash
# From repository root
docker compose up -d postgres redis

# Start Qdrant (if not in docker-compose)
docker run -d -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

### 2. Start AI Service

```bash
cd services/ai-service
pnpm install
pnpm dev
```

Service runs on `http://localhost:3003`

### 3. Test the Endpoint

**Without authentication (will fail after auth guard is added):**

```bash
curl -X POST http://localhost:3003/feedback/preview \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I think anyone who disagrees with me is completely wrong and probably an idiot."
  }'
```

**Expected response:**

```json
{
  "feedback": [
    {
      "type": "INFLAMMATORY",
      "subtype": "personal_attack",
      "suggestionText": "Consider rephrasing to focus on ideas rather than personal characteristics.",
      "reasoning": "Detected 1 instance(s) of potentially inflammatory language (e.g., \"idiot\").",
      "confidenceScore": 0.75,
      "shouldDisplay": true,
      "educationalResources": {
        "links": [
          {
            "title": "Constructive Communication Guide",
            "url": "https://en.wikipedia.org/wiki/Nonviolent_Communication"
          }
        ]
      }
    }
  ],
  "primary": { ... },
  "readyToPost": false,
  "summary": "Consider revising before posting. See suggestions below.",
  "analysisTimeMs": 245
}
```

### 4. Test Constructive Content

```bash
curl -X POST http://localhost:3003/feedback/preview \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I understand your perspective and while I disagree, I think we can find common ground on the underlying goals."
  }'
```

**Expected response:**

```json
{
  "feedback": [
    {
      "type": "AFFIRMATION",
      "suggestionText": "Your response contributes to constructive dialogue.",
      "reasoning": "No logical fallacies, inflammatory language, or clarity issues detected.",
      "confidenceScore": 0.85,
      "shouldDisplay": true
    }
  ],
  "readyToPost": true,
  "summary": "Looking good! Your response is constructive and well-reasoned.",
  "analysisTimeMs": 198
}
```

## API Reference

### POST /feedback/preview

**Request:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes | Draft text (min 20 chars) |
| discussionId | UUID | No | Context for caching |
| topicId | UUID | No | Context for caching |
| sensitivity | enum | No | LOW, MEDIUM (default), HIGH |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| feedback | array | All detected feedback items |
| primary | object | Highest priority item |
| readyToPost | boolean | No critical issues |
| summary | string | User-friendly message |
| analysisTimeMs | number | Performance metric |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Validation error (content too short) |
| 401 | Authentication required |
| 429 | Rate limit exceeded (10/min) |

## Development Workflow

### Running Tests

```bash
# Unit tests
cd services/ai-service
pnpm test

# Specific test file
pnpm test feedback.service

# Watch mode
pnpm test:watch
```

### Testing Cache Performance

```bash
# First request (cold cache)
time curl -X POST http://localhost:3003/feedback/preview \
  -H "Content-Type: application/json" \
  -d '{"content": "This is a test message for cache performance testing."}'

# Second request (should hit Redis cache, ~10ms)
time curl -X POST http://localhost:3003/feedback/preview \
  -H "Content-Type: application/json" \
  -d '{"content": "This is a test message for cache performance testing."}'

# Similar content (should hit semantic cache, ~50ms)
time curl -X POST http://localhost:3003/feedback/preview \
  -H "Content-Type: application/json" \
  -d '{"content": "This is a test message for testing cache performance."}'
```

### Viewing Cache State

```bash
# Redis cache entries
docker exec -it redis redis-cli KEYS "preview:*"

# Qdrant collection info
curl http://localhost:6333/collections/feedback_cache
```

## Frontend Integration

### Using the Hook

```tsx
import { usePreviewFeedback } from '@/hooks/usePreviewFeedback';

function ComposeArea() {
  const [content, setContent] = useState('');
  const { feedback, isLoading, readyToPost } = usePreviewFeedback(content);

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your response..."
      />

      {content.length >= 20 && (
        <PreviewFeedbackPanel
          feedback={feedback}
          isLoading={isLoading}
          readyToPost={readyToPost}
        />
      )}
    </div>
  );
}
```

### Hook Implementation Pattern

```typescript
// hooks/usePreviewFeedback.ts
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export function usePreviewFeedback(content: string) {
  const debouncedContent = useDebouncedValue(content, 400);

  return useQuery({
    queryKey: ['preview-feedback', debouncedContent],
    queryFn: () => fetchPreviewFeedback(debouncedContent),
    enabled: debouncedContent.length >= 20,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
  });
}
```

## Troubleshooting

### "Content must be at least 20 characters"

Content is too short. Preview feedback requires meaningful content to analyze.

### 429 Too Many Requests

Rate limit exceeded (10 requests per minute). Wait and retry, or check frontend debounce implementation.

### Slow Response Times (>500ms)

1. Check Redis is running: `docker ps | grep redis`
2. Check Qdrant is running: `curl http://localhost:6333/health`
3. First request after restart will be slow (cold cache)

### Empty Feedback Array

Content may be too generic or pass all checks. This is normal - the `readyToPost: true` response indicates the content is constructive.

## Next Steps

1. **Add authentication guard** to enforce FR-015
2. **Configure rate limiting** for FR-016
3. **Build frontend components** for inline feedback panel
4. **Write E2E tests** for compose + feedback flow
