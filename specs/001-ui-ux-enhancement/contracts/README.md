# API Contracts: UI/UX Enhancement

**Feature**: 001-ui-ux-enhancement
**Type**: Frontend-Only Enhancement
**Date**: 2026-02-04

## Overview

This feature is a **frontend-only** UI/UX enhancement that does **not introduce new API endpoints**. All functionality leverages existing backend APIs. This document catalogs the existing API interactions that the enhanced UI components will utilize.

---

## Existing API Dependencies

### 1. Authentication APIs (User Service)

**Base URL**: `/api/auth` (proxied through API Gateway)

#### POST /api/auth/register
**Purpose**: User registration (used by enhanced RegisterPage with RHF + Zod)

**Request Body**:
```json
{
  "email": "user@example.com",
  "displayName": "John Doe",
  "password": "SecurePassword123!"
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "createdAt": "2026-02-04T10:00:00Z"
  },
  "token": "jwt-token-here"
}
```

**Error Responses**:
- 400: Validation error (email format, password requirements)
- 409: Email already exists
- 500: Internal server error

**Frontend Usage**:
- RegisterPage.tsx (enhanced with React Hook Form + Zod validation)
- Schema: `src/schemas/auth.ts` → `registrationSchema`

---

#### POST /api/auth/login
**Purpose**: User login (used by enhanced LoginPage with RHF + Zod)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe"
  },
  "token": "jwt-token-here"
}
```

**Error Responses**:
- 401: Invalid credentials
- 429: Too many login attempts (rate limiting)

**Frontend Usage**:
- LoginPage.tsx (enhanced with React Hook Form + Zod validation)
- Schema: `src/schemas/auth.ts` → `loginSchema`

---

### 2. Onboarding APIs (User Service)

**Base URL**: `/api/onboarding`

#### GET /api/onboarding/progress
**Purpose**: Fetch user's onboarding progress (tour completion status)

**Response** (200 OK):
```json
{
  "orientationViewed": true,
  "tourProgress": {
    "completed": false,
    "skipped": true,
    "lastStepViewed": 2,
    "completedAt": null,
    "skippedAt": "2026-02-03T15:30:00Z"
  }
}
```

**Frontend Usage**:
- OnboardingTourContext.tsx (sync tour state from backend)
- Auto-start logic for new users

---

#### PUT /api/onboarding/tour-progress
**Purpose**: Update user's tour progress (completion, skip, step tracking)

**Request Body**:
```json
{
  "completed": true,
  "skipped": false,
  "lastStepViewed": 5,
  "completedAt": "2026-02-04T10:15:00Z"
}
```

**Response** (200 OK):
```json
{
  "success": true
}
```

**Frontend Usage**:
- OnboardingTourContext.tsx (persist tour state to backend)
- Called when user completes or skips tour

---

### 3. Topics APIs (Discussion Service)

**Base URL**: `/api/topics` (proxied through API Gateway)

#### GET /api/topics
**Purpose**: Fetch topic list (used by enhanced TopicsPage with skeleton screens)

**Query Parameters**:
- `status`: Filter by status (ACTIVE, SEEDING, ARCHIVED)
- `page`: Pagination page number (default: 1)
- `limit`: Results per page (default: 20)

**Response** (200 OK):
```json
{
  "topics": [
    {
      "id": "uuid",
      "title": "Topic Title",
      "description": "Topic description",
      "status": "ACTIVE",
      "participantCount": 42,
      "createdAt": "2026-02-01T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

**Frontend Usage**:
- TopicsPage.tsx (enhanced with skeleton shimmer screens during loading)
- LoadingState management for async data fetching

---

#### GET /api/topics/search
**Purpose**: Search topics by query and filters (used by enhanced search feature)

**Query Parameters**:
- `q`: Search query string
- `status`: Filter by status (multi-select: ACTIVE, SEEDING, ARCHIVED)
- `dateFrom`: ISO 8601 date (start of date range)
- `dateTo`: ISO 8601 date (end of date range)
- `minParticipants`: Minimum participant count
- `maxParticipants`: Maximum participant count

**Response** (200 OK):
```json
{
  "results": [
    {
      "id": "uuid",
      "type": "topic",
      "title": "Search Result Title",
      "excerpt": "...highlighted text...",
      "relevance": 0.85,
      "participantCount": 42
    }
  ],
  "total": 25,
  "query": "climate change"
}
```

**Frontend Usage**:
- SearchPage.tsx (enhanced with debounced search and filter pills)
- SearchState management with URL query parameter sync

---

#### GET /api/topics/:id
**Purpose**: Fetch topic details (used by enhanced TopicDetailPage with loading states)

**Response** (200 OK):
```json
{
  "id": "uuid",
  "title": "Topic Title",
  "description": "Detailed description",
  "status": "ACTIVE",
  "participantCount": 42,
  "responses": [ /* ... */ ],
  "createdAt": "2026-02-01T10:00:00Z"
}
```

**Error Responses**:
- 404: Topic not found (custom 404 page with navigation links)

**Frontend Usage**:
- TopicDetailPage.tsx (enhanced with skeleton screens and error handling)
- Custom 404 page with search bar and popular topics links

---

### 4. Notification APIs (Notification Service)

**Base URL**: `/api/notifications`

#### GET /api/notifications/unread-count
**Purpose**: Fetch unread notification count (used by navigation badge)

**Response** (200 OK):
```json
{
  "count": 5
}
```

**Frontend Usage**:
- Header.tsx (notification icon badge)
- NavigationState (unread count tracking)

---

## Frontend State Management

All API interactions follow this pattern:

1. **Loading State Initialization**:
   ```typescript
   const [state, setState] = useState<LoadingState>({
     status: 'idle',
     error: null,
     data: null,
     showSkeleton: false,
   });
   ```

2. **API Call with Loading States**:
   ```typescript
   async function fetchData() {
     setState({ status: 'pending', showSkeleton: true, ... });

     try {
       const data = await apiClient.get('/endpoint');
       setState({ status: 'success', data, showSkeleton: false, ... });
     } catch (error) {
       setState({ status: 'error', error, showSkeleton: false, ... });
       toast.error('Failed to load data');
     }
   }
   ```

3. **UI Rendering**:
   ```typescript
   if (state.showSkeleton) return <SkeletonScreen />;
   if (state.status === 'error') return <ErrorMessage />;
   return <DataDisplay data={state.data} />;
   ```

---

## Error Handling Patterns

### User-Friendly Error Messages

All API errors are transformed into user-friendly toast notifications:

| HTTP Status | User-Facing Message | Recovery Action |
|-------------|-------------------|----------------|
| 400 | "Please check your input and try again" | Field-level validation errors displayed |
| 401 | "Please log in to continue" | Redirect to login page |
| 403 | "You don't have permission to perform this action" | Link to help article |
| 404 | Custom 404 page with search | Navigation to popular topics |
| 429 | "Too many requests. Please try again in a moment." | Auto-retry after 3 seconds |
| 500 | "Something went wrong. We've been notified." | Auto-retry after 3 seconds |
| Network Error | "You appear to be offline. Please check your connection." | Retry button |

**Implementation**:
- Toast notifications via enhanced NotificationContext
- Custom 404 page component
- Exponential backoff for auto-retry logic

---

## Validation Strategy

### Client-Side Validation (Zod Schemas)

All form inputs validated before API calls using Zod schemas:

```typescript
// Registration form validation (client-side)
const registrationSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(12, 'Min 12 characters')
    .regex(/[a-z]/, 'Lowercase required')
    .regex(/[A-Z]/, 'Uppercase required')
    .regex(/[0-9]/, 'Number required')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Special character required'),
});
```

**Benefits**:
- Immediate feedback (no network round-trip)
- Reduced backend load (invalid requests blocked)
- Type-safe validation (TypeScript inference)

### Server-Side Validation (Backend)

Backend performs additional validation:
- Email uniqueness check (database query)
- Rate limiting enforcement
- Business logic validation

**Coordinated Validation**:
- Client schema matches backend RegisterDto
- Error messages aligned between frontend/backend
- Server errors displayed via toast notifications

---

## No New Endpoints Required

This feature **does not introduce new API endpoints**. All functionality is achieved through:

1. **Enhanced UI Components**: Better loading states, error handling, accessibility
2. **Client-Side State Management**: localStorage, React Context API
3. **Existing API Interactions**: Improved UX around existing endpoints

**Backend Impact**: Zero changes required (frontend-only feature)

---

## Testing Strategy

### Contract Tests

Verify frontend assumptions about API responses match backend reality:

```typescript
// Example contract test
describe('POST /api/auth/register contract', () => {
  it('should return 201 with user object on success', async () => {
    const response = await apiClient.post('/auth/register', validPayload);

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('user');
    expect(response.data).toHaveProperty('token');
    expect(response.data.user).toMatchSchema(userSchema);
  });

  it('should return 409 on duplicate email', async () => {
    await apiClient.post('/auth/register', validPayload);
    const response = await apiClient.post('/auth/register', validPayload);

    expect(response.status).toBe(409);
    expect(response.data.message).toContain('already exists');
  });
});
```

### E2E Tests

Verify complete user flows with enhanced UI:

```typescript
// Example E2E test
test('registration flow with validation', async ({ page }) => {
  await page.goto('/register');

  // Fill invalid email
  await page.fill('[data-testid="email-input"]', 'invalid-email');
  await page.blur('[data-testid="email-input"]');

  // Verify inline error appears
  await expect(page.locator('[role="alert"]')).toContainText('Invalid email');

  // Fill valid data
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
  await page.click('[data-testid="submit-button"]');

  // Verify redirect after successful registration
  await expect(page).toHaveURL(/\/(dashboard|verify-email)/);
});
```

---

## References

- **API Gateway**: `/services/api-gateway/src/proxy/`
- **User Service**: `/services/user-service/src/api/`
- **Discussion Service**: `/services/discussion-service/src/api/`
- **Notification Service**: `/services/notification-service/src/api/`

- **Frontend API Client**: `/frontend/src/lib/apiClient.ts`
- **Error Handling**: `/frontend/src/lib/errorHandler.ts`
- **Loading States**: `/frontend/src/types/loading.ts`
