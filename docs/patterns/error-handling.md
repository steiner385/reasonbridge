# Error Handling Patterns Reference

This document provides concrete examples and migration guidance for error handling patterns in reasonBridge backend services.

## Quick Reference

| Pattern           | Method Prefix   | Returns          | Use Case                     |
| ----------------- | --------------- | ---------------- | ---------------------------- |
| Throw Immediately | `get*`          | Entity or throws | Required lookups, validation |
| Return Null       | `find*`         | Entity \| null   | Optional lookups             |
| Return Empty      | `list*`/`get*s` | Array            | Collection queries           |
| Fire-and-Forget   | `try*`          | void             | Analytics, notifications     |

## Pattern 1: Throw Immediately

### When to Use

- Required resource lookups where absence is an error
- Validation failures
- Authorization checks
- Operations that must succeed for the flow to continue

### Code Examples

**User Service - Required Lookup**

```typescript
// services/user-service/src/users/users.service.ts

/**
 * Retrieves a user by their unique identifier.
 *
 * @param id - The user's UUID
 * @returns The user entity
 * @throws {NotFoundException} When user with given ID doesn't exist
 */
async getUserById(id: string): Promise<User> {
  if (!isValidUUID(id)) {
    throw new BadRequestException('Invalid user ID format');
  }

  const user = await this.userRepository.findOne({ where: { id } });
  if (!user) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }
  return user;
}
```

**Discussion Service - Authorization Check**

```typescript
// services/discussion-service/src/topics/topics.service.ts

/**
 * Updates a topic's details.
 *
 * @param id - The topic's UUID
 * @param dto - Update data
 * @param userId - The requesting user's ID
 * @returns The updated topic
 * @throws {NotFoundException} When topic doesn't exist
 * @throws {ForbiddenException} When user isn't the topic creator
 */
async updateTopic(id: string, dto: UpdateTopicDto, userId: string): Promise<Topic> {
  const topic = await this.getTopicById(id); // Throws if not found

  if (topic.creatorId !== userId) {
    throw new ForbiddenException('Only the topic creator can update this topic');
  }

  return this.topicRepository.save({ ...topic, ...dto });
}
```

### Controller Integration

Controllers should let exceptions propagate to NestJS exception filters:

```typescript
@Get(':id')
async getUser(@Param('id') id: string): Promise<UserResponseDto> {
  // Let NotFoundException propagate - NestJS handles 404 response
  const user = await this.usersService.getUserById(id);
  return this.mapToDto(user);
}
```

## Pattern 2: Return Null/Empty

### When to Use

- Optional resource lookups (email lookup for login)
- Search queries
- Relationship traversal (user's optional profile)
- Conditional operations (find or create)

### Code Examples

**User Service - Optional Lookup**

```typescript
// services/user-service/src/users/users.service.ts

/**
 * Finds a user by email address.
 *
 * @param email - The email to search for
 * @returns The user if found, null otherwise
 */
async findUserByEmail(email: string): Promise<User | null> {
  return this.userRepository.findOne({
    where: { email: email.toLowerCase() },
  });
}

// Caller handles the null case
async login(email: string, password: string): Promise<AuthResponse> {
  const user = await this.findUserByEmail(email);
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }
  // Continue with password verification...
}
```

**Discussion Service - Collection Query**

```typescript
// services/discussion-service/src/responses/responses.service.ts

/**
 * Lists all responses for a topic.
 *
 * @param topicId - The topic's UUID
 * @param options - Pagination and sorting options
 * @returns Array of responses (empty if none exist)
 */
async listResponsesByTopic(
  topicId: string,
  options?: PaginationOptions,
): Promise<Response[]> {
  return this.responseRepository.find({
    where: { topicId },
    order: { createdAt: 'DESC' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });
}
```

**Find or Create Pattern**

```typescript
/**
 * Finds an existing session or creates a new one.
 *
 * @param userId - The user's UUID
 * @returns The existing or newly created session
 */
async findOrCreateSession(userId: string): Promise<Session> {
  let session = await this.findActiveSession(userId);

  if (!session) {
    session = await this.createSession(userId);
  }

  return session;
}
```

## Pattern 3: Fire-and-Forget

### When to Use

- Analytics and telemetry
- Notification sending
- Audit logging
- Cache updates
- Activity feed updates

### Code Examples

**Activity Service - Best Effort Recording**

```typescript
// services/activity-service/src/activity/activity.service.ts

/**
 * Attempts to record a user activity. Failures are logged but not propagated.
 *
 * @param userId - The user who performed the action
 * @param action - The action type
 * @param metadata - Additional context
 */
async tryRecordActivity(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await this.activityRepository.save({
      userId,
      action,
      metadata,
      timestamp: new Date(),
    });
  } catch (error) {
    this.logger.warn('Failed to record activity', {
      userId,
      action,
      error: error.message,
    });
    // Don't throw - caller shouldn't fail because activity logging failed
  }
}
```

**Notification Service - Non-blocking Send**

```typescript
// services/notification-service/src/notifications/notifications.service.ts

/**
 * Attempts to send a notification. Failures are queued for retry.
 *
 * @param userId - The recipient's UUID
 * @param notification - The notification content
 */
async trySendNotification(
  userId: string,
  notification: NotificationPayload,
): Promise<void> {
  try {
    await this.notificationGateway.send(userId, notification);
  } catch (error) {
    this.logger.warn('Failed to send notification, queuing for retry', {
      userId,
      type: notification.type,
      error: error.message,
    });

    // Queue for retry instead of failing
    await this.retryQueue.add({ userId, notification });
  }
}
```

### Integration in Main Flow

```typescript
async createResponse(dto: CreateResponseDto, userId: string): Promise<Response> {
  const response = await this.responseRepository.save({
    ...dto,
    authorId: userId,
  });

  // Fire-and-forget: Don't await, don't let failures affect the response
  this.tryRecordActivity(userId, 'RESPONSE_CREATED', { responseId: response.id });
  this.trySendNotification(dto.topicCreatorId, {
    type: 'NEW_RESPONSE',
    topicId: dto.topicId,
  });

  return response;
}
```

## Migration Guide

### Identifying Code to Migrate

**Find methods that throw but should return null:**

```bash
# Look for find* methods that throw NotFoundException
grep -rn "async find" services/*/src/**/*.service.ts | head -20
```

**Find fire-and-forget candidates:**

```bash
# Look for try/catch blocks that only log
grep -rn "catch.*error" services/*/src/**/*.service.ts -A 3 | grep -B 1 "logger"
```

### Step-by-Step Migration

1. **Identify the method's contract**
   - Is the caller expecting the method to throw on not-found?
   - Are there multiple callers with different expectations?

2. **Update the method signature**

   ```typescript
   // Before
   async findUser(id: string): Promise<User>

   // After
   async findUser(id: string): Promise<User | null>
   ```

3. **Update JSDoc**

   ```typescript
   /**
    * @returns The user if found, null otherwise
    */
   ```

4. **Update all callers**

   ```typescript
   // Before
   const user = await this.findUser(id);

   // After
   const user = await this.findUser(id);
   if (!user) {
     throw new NotFoundException('User not found');
   }
   ```

5. **Add tests for null case**
   ```typescript
   it('should return null when user not found', async () => {
     const result = await service.findUser('nonexistent-id');
     expect(result).toBeNull();
   });
   ```

### Handling Dual Requirements

When both throwing and returning patterns are needed:

```typescript
/**
 * Finds a user by ID, returns null if not found.
 */
async findUserById(id: string): Promise<User | null> {
  return this.userRepository.findOne({ where: { id } });
}

/**
 * Gets a user by ID, throws if not found.
 */
async getUserById(id: string): Promise<User> {
  const user = await this.findUserById(id);
  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
  }
  return user;
}
```

## PR Review Checklist

When reviewing PRs that add or modify service methods:

- [ ] Method prefix matches return behavior (`get*` throws, `find*` returns null)
- [ ] JSDoc includes `@throws` for all exception cases
- [ ] JSDoc includes `@returns` describing null/empty cases
- [ ] Fire-and-forget methods are prefixed with `try*`
- [ ] Fire-and-forget methods log errors but don't propagate them
- [ ] Collection queries return empty arrays, not null
- [ ] Tests cover error/null/empty cases

## Common Anti-Patterns

### Anti-Pattern: Silent Failure Without Logging

```typescript
// BAD - Swallows error without any indication
async updateCache(key: string, value: unknown): Promise<void> {
  try {
    await this.redis.set(key, value);
  } catch {
    // Silent failure - impossible to diagnose issues
  }
}

// GOOD - Logs the failure for observability
async tryUpdateCache(key: string, value: unknown): Promise<void> {
  try {
    await this.redis.set(key, value);
  } catch (error) {
    this.logger.warn('Cache update failed', { key, error: error.message });
  }
}
```

### Anti-Pattern: Inconsistent Null Handling

```typescript
// BAD - Returns null in some cases, throws in others
async findUser(id: string): Promise<User | null> {
  if (!isValidUUID(id)) {
    throw new BadRequestException('Invalid ID'); // Throws here
  }
  return this.userRepository.findOne({ where: { id } }); // Returns null here
}

// GOOD - Consistent behavior
async findUser(id: string): Promise<User | null> {
  if (!isValidUUID(id)) {
    return null; // Invalid ID means no user found
  }
  return this.userRepository.findOne({ where: { id } });
}

// OR - If validation should throw, use get* naming
async getUser(id: string): Promise<User> {
  if (!isValidUUID(id)) {
    throw new BadRequestException('Invalid ID');
  }
  const user = await this.userRepository.findOne({ where: { id } });
  if (!user) {
    throw new NotFoundException('User not found');
  }
  return user;
}
```

### Anti-Pattern: Generic Exception Messages

```typescript
// BAD - Unhelpful error message
throw new NotFoundException('Not found');

// GOOD - Specific, actionable message
throw new NotFoundException(`Topic with ID ${topicId} not found`);
```

## See Also

- [CLAUDE.md - Implementation Patterns](../../CLAUDE.md#error-handling-patterns-backend-services)
- [CLAUDE.md - JSDoc Standards](../../CLAUDE.md#jsdoc-documentation-standards)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
