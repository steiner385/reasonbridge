import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard Error Response DTO
 *
 * Matches OpenAPI ErrorResponse schema.
 * Used for all error responses across the API.
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Error code',
    example: 'INVALID_CREDENTIALS',
  })
  error: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Email or password is incorrect',
  })
  message: string;

  @ApiProperty({
    description: 'Additional error context',
    required: false,
    type: 'object',
    example: {
      field: 'email',
      remainingAttempts: 4,
    },
  })
  details?: Record<string, any>;
}

/**
 * Validation Error Response DTO
 *
 * Used for request validation failures (400 Bad Request).
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Error code',
    example: 'VALIDATION_ERROR',
  })
  error: string = 'VALIDATION_ERROR';

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Request validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Field-level validation errors',
    example: {
      fields: {
        email: 'Invalid email format',
        password: 'Password must be at least 8 characters',
      },
    },
  })
  details: {
    fields: Record<string, string>;
  };
}

/**
 * Unauthorized Error Response DTO
 *
 * Used for authentication failures (401 Unauthorized).
 */
export class UnauthorizedErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Error code',
    example: 'UNAUTHORIZED',
  })
  error: string = 'UNAUTHORIZED';

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Authentication required',
  })
  message: string;

  @ApiProperty({
    description: 'Additional context',
    example: {
      hint: 'Include valid JWT token in Authorization header',
    },
  })
  details?: {
    hint?: string;
    reason?: string;
  };
}

/**
 * Conflict Error Response DTO
 *
 * Used for resource conflicts (409 Conflict).
 */
export class ConflictErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Error code',
    example: 'CONFLICT',
  })
  error: string = 'CONFLICT';

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'An account with this email already exists',
  })
  message: string;

  @ApiProperty({
    description: 'Conflict details',
    example: {
      field: 'email',
      suggestion: 'Try logging in instead or use password reset',
    },
  })
  details?: {
    field?: string;
    suggestion?: string;
  };
}

/**
 * Rate Limit Error Response DTO
 *
 * Used for rate limit exceeded (429 Too Many Requests).
 */
export class RateLimitErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Error code',
    example: 'RATE_LIMIT_EXCEEDED',
  })
  error: string = 'RATE_LIMIT_EXCEEDED';

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Too many requests',
  })
  message: string;

  @ApiProperty({
    description: 'Rate limit details',
    example: {
      retryAfter: 60,
      limit: 5,
      window: 3600,
    },
  })
  details: {
    retryAfter: number;
    limit?: number;
    window?: number;
  };
}

/**
 * Not Found Error Response DTO
 *
 * Used for resource not found (404 Not Found).
 */
export class NotFoundErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Error code',
    example: 'NOT_FOUND',
  })
  error: string = 'NOT_FOUND';

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Resource not found',
  })
  message: string;

  @ApiProperty({
    description: 'Additional context',
    required: false,
    example: {
      resource: 'User',
      id: '550e8400-e29b-41d4-a716-446655440000',
    },
  })
  details?: {
    resource?: string;
    id?: string;
  };
}

/**
 * Internal Server Error Response DTO
 *
 * Used for unexpected server errors (500 Internal Server Error).
 */
export class InternalServerErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Error code',
    example: 'INTERNAL_SERVER_ERROR',
  })
  error: string = 'INTERNAL_SERVER_ERROR';

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'An unexpected error occurred',
  })
  message: string;

  @ApiProperty({
    description: 'Support information',
    example: {
      correlationId: '550e8400-e29b-41d4-a716-446655440000',
      support: 'support@unitediscord.org',
    },
  })
  details?: {
    correlationId?: string;
    support?: string;
  };
}

/**
 * Specific error codes used throughout the API
 * Exported as constants for consistency
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  INVALID_CODE: 'INVALID_CODE',
  EXPIRED_CODE: 'EXPIRED_CODE',

  // Resource Management
  CONFLICT: 'CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_VERIFIED: 'ALREADY_VERIFIED',
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  MAX_ATTEMPTS_EXCEEDED: 'MAX_ATTEMPTS_EXCEEDED',

  // OAuth
  OAUTH_FAILED: 'OAUTH_FAILED',
  INVALID_STATE: 'INVALID_STATE',

  // Topics & Onboarding
  INVALID_SELECTION: 'INVALID_SELECTION',
  INVALID_TOPIC: 'INVALID_TOPIC',

  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
