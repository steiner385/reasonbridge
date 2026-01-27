/**
 * Standard Error Response DTO
 *
 * Matches OpenAPI ErrorResponse schema.
 * Used for all error responses across the API.
 */
export class ErrorResponseDto {
  error!: string;

  message!: string;

  details?: Record<string, any>;
}

/**
 * Validation Error Response DTO
 *
 * Used for request validation failures (400 Bad Request).
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  override error: string = 'VALIDATION_ERROR';

  declare message: string;

  declare details: {
    fields: Record<string, string>;
  };
}

/**
 * Unauthorized Error Response DTO
 *
 * Used for authentication failures (401 Unauthorized).
 */
export class UnauthorizedErrorResponseDto extends ErrorResponseDto {
  override error: string = 'UNAUTHORIZED';

  declare message: string;

  declare details?: {
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
  override error: string = 'CONFLICT';

  declare message: string;

  declare details?: {
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
  override error: string = 'RATE_LIMIT_EXCEEDED';

  declare message: string;

  declare details: {
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
  override error: string = 'NOT_FOUND';

  declare message: string;

  declare details?: {
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
  override error: string = 'INTERNAL_SERVER_ERROR';

  declare message: string;

  declare details?: {
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
