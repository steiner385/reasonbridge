/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Error Code Taxonomy for ReasonBridge Platform
 *
 * T309: Create error code taxonomy
 *
 * This module defines a standardized error code system used across all services.
 * Error codes follow a hierarchical naming convention: CATEGORY_NNN
 *
 * Categories:
 * - AUTH: Authentication and authorization errors (401, 403)
 * - VALIDATION: Input validation errors (400)
 * - RESOURCE: Resource-related errors (404, 409, 410)
 * - RATE_LIMIT: Rate limiting errors (429)
 * - BUSINESS: Business logic errors (400, 422)
 * - EXTERNAL: External service errors (502, 503)
 * - INTERNAL: Internal server errors (500)
 */

/**
 * Error code format regex pattern
 * Matches: CATEGORY_NNN (e.g., AUTH_001, VALIDATION_002, RATE_LIMIT_005)
 * Supports multi-word categories with underscores
 */
export const ERROR_CODE_PATTERN = /^[A-Z]+(?:_[A-Z]+)*_\d{3}$/;

/**
 * HTTP status codes used in error responses
 */
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  GONE = 410,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Error code metadata
 */
export interface ErrorCodeMeta {
  /** Human-readable error message */
  message: string;
  /** HTTP status code to return */
  httpStatus: HttpStatus;
  /** Whether this error should be logged at error level */
  logAsError: boolean;
  /** Category for grouping */
  category: ErrorCategory;
}

/**
 * Error categories for grouping and filtering
 */
export type ErrorCategory =
  | 'AUTH'
  | 'VALIDATION'
  | 'RESOURCE'
  | 'RATE_LIMIT'
  | 'BUSINESS'
  | 'DISCUSSION'
  | 'AI'
  | 'MOD'
  | 'EXTERNAL'
  | 'INTERNAL';

/**
 * Authentication and Authorization Errors (AUTH_XXX)
 */
export const AUTH_ERRORS = {
  /** Missing or invalid authentication token */
  AUTH_001: 'AUTH_001',
  /** Token has expired */
  AUTH_002: 'AUTH_002',
  /** Invalid credentials provided */
  AUTH_003: 'AUTH_003',
  /** Email address not verified */
  AUTH_004: 'AUTH_004',
  /** Account is suspended */
  AUTH_005: 'AUTH_005',
  /** Account is deactivated */
  AUTH_006: 'AUTH_006',
  /** Insufficient permissions for this action */
  AUTH_007: 'AUTH_007',
  /** OAuth authentication failed */
  AUTH_008: 'AUTH_008',
  /** Invalid OAuth state parameter */
  AUTH_009: 'AUTH_009',
  /** Refresh token is invalid or expired */
  AUTH_010: 'AUTH_010',
  /** Multi-factor authentication required */
  AUTH_011: 'AUTH_011',
  /** Invalid MFA code */
  AUTH_012: 'AUTH_012',
  /** Session has been invalidated */
  AUTH_013: 'AUTH_013',
} as const;

/**
 * Validation Errors (VALIDATION_XXX)
 */
export const VALIDATION_ERRORS = {
  /** Request body validation failed */
  VALIDATION_001: 'VALIDATION_001',
  /** Required field is missing */
  VALIDATION_002: 'VALIDATION_002',
  /** Field value is invalid */
  VALIDATION_003: 'VALIDATION_003',
  /** Password does not meet requirements */
  VALIDATION_004: 'VALIDATION_004',
  /** Email format is invalid */
  VALIDATION_005: 'VALIDATION_005',
  /** Phone number format is invalid */
  VALIDATION_006: 'VALIDATION_006',
  /** Username does not meet requirements */
  VALIDATION_007: 'VALIDATION_007',
  /** File type not allowed */
  VALIDATION_008: 'VALIDATION_008',
  /** File size exceeds limit */
  VALIDATION_009: 'VALIDATION_009',
  /** Invalid date or date range */
  VALIDATION_010: 'VALIDATION_010',
  /** Content length exceeds limit */
  VALIDATION_011: 'VALIDATION_011',
  /** Invalid JSON format */
  VALIDATION_012: 'VALIDATION_012',
} as const;

/**
 * Resource Errors (RESOURCE_XXX)
 */
export const RESOURCE_ERRORS = {
  /** Requested resource not found */
  RESOURCE_001: 'RESOURCE_001',
  /** Resource already exists (conflict) */
  RESOURCE_002: 'RESOURCE_002',
  /** Resource is no longer available (gone) */
  RESOURCE_003: 'RESOURCE_003',
  /** Resource is locked */
  RESOURCE_004: 'RESOURCE_004',
  /** Resource state conflict */
  RESOURCE_005: 'RESOURCE_005',
  /** User not found */
  RESOURCE_006: 'RESOURCE_006',
  /** Topic not found */
  RESOURCE_007: 'RESOURCE_007',
  /** Discussion not found */
  RESOURCE_008: 'RESOURCE_008',
  /** Response not found */
  RESOURCE_009: 'RESOURCE_009',
  /** Proposition not found */
  RESOURCE_010: 'RESOURCE_010',
} as const;

/**
 * Rate Limit Errors (RATE_LIMIT_XXX)
 */
export const RATE_LIMIT_ERRORS = {
  /** Request rate limit exceeded */
  RATE_LIMIT_001: 'RATE_LIMIT_001',
  /** Login attempts limit exceeded */
  RATE_LIMIT_002: 'RATE_LIMIT_002',
  /** API quota exceeded */
  RATE_LIMIT_003: 'RATE_LIMIT_003',
  /** Verification code request limit exceeded */
  RATE_LIMIT_004: 'RATE_LIMIT_004',
  /** Password reset request limit exceeded */
  RATE_LIMIT_005: 'RATE_LIMIT_005',
} as const;

/**
 * Business Logic Errors (BUSINESS_XXX)
 */
export const BUSINESS_ERRORS = {
  /** Operation not permitted in current state */
  BUSINESS_001: 'BUSINESS_001',
  /** Verification code has expired */
  BUSINESS_002: 'BUSINESS_002',
  /** Invalid verification code */
  BUSINESS_003: 'BUSINESS_003',
  /** Email already verified */
  BUSINESS_004: 'BUSINESS_004',
  /** Phone already verified */
  BUSINESS_005: 'BUSINESS_005',
  /** Onboarding already completed */
  BUSINESS_006: 'BUSINESS_006',
  /** Invalid topic selection */
  BUSINESS_007: 'BUSINESS_007',
  /** Discussion is closed */
  BUSINESS_008: 'BUSINESS_008',
  /** Cannot respond to own content */
  BUSINESS_009: 'BUSINESS_009',
  /** Maximum responses reached */
  BUSINESS_010: 'BUSINESS_010',
  /** Insufficient reputation */
  BUSINESS_011: 'BUSINESS_011',
  /** Feature not available for this account */
  BUSINESS_012: 'BUSINESS_012',
} as const;

/**
 * Discussion Errors (DISCUSSION_XXX)
 */
export const DISCUSSION_ERRORS = {
  /** Topic creation failed due to invalid parameters */
  DISCUSSION_001: 'DISCUSSION_001',
  /** Topic has been archived and cannot be modified */
  DISCUSSION_002: 'DISCUSSION_002',
  /** Response threading depth limit exceeded */
  DISCUSSION_003: 'DISCUSSION_003',
  /** Proposition already linked to this response */
  DISCUSSION_004: 'DISCUSSION_004',
  /** Cannot delete a response with existing replies */
  DISCUSSION_005: 'DISCUSSION_005',
  /** Discussion participant limit reached */
  DISCUSSION_006: 'DISCUSSION_006',
  /** Invalid response type for this discussion format */
  DISCUSSION_007: 'DISCUSSION_007',
  /** Citation source is invalid or inaccessible */
  DISCUSSION_008: 'DISCUSSION_008',
  /** Topic is locked by a moderator */
  DISCUSSION_009: 'DISCUSSION_009',
  /** Duplicate response detected */
  DISCUSSION_010: 'DISCUSSION_010',
} as const;

/**
 * AI Service Errors (AI_XXX)
 */
export const AI_ERRORS = {
  /** AI analysis request failed */
  AI_001: 'AI_001',
  /** Bias detection model returned invalid results */
  AI_002: 'AI_002',
  /** Common ground analysis timed out */
  AI_003: 'AI_003',
  /** AI model rate limit exceeded */
  AI_004: 'AI_004',
  /** Content too long for AI analysis */
  AI_005: 'AI_005',
  /** AI model version mismatch */
  AI_006: 'AI_006',
  /** AI confidence score below acceptable threshold */
  AI_007: 'AI_007',
  /** AI provider authentication failed */
  AI_008: 'AI_008',
} as const;

/**
 * Moderation Errors (MOD_XXX)
 */
export const MOD_ERRORS = {
  /** Content flagged by automated moderation */
  MOD_001: 'MOD_001',
  /** Content violates community guidelines */
  MOD_002: 'MOD_002',
  /** Appeal has already been submitted for this action */
  MOD_003: 'MOD_003',
  /** Appeal window has expired */
  MOD_004: 'MOD_004',
  /** Moderator action requires higher privilege level */
  MOD_005: 'MOD_005',
  /** Content is under active review */
  MOD_006: 'MOD_006',
  /** Ban duration exceeds maximum allowed period */
  MOD_007: 'MOD_007',
  /** Reported content not found or already removed */
  MOD_008: 'MOD_008',
  /** Duplicate report for the same content */
  MOD_009: 'MOD_009',
  /** Moderation queue is full */
  MOD_010: 'MOD_010',
} as const;

/**
 * External Service Errors (EXTERNAL_XXX)
 */
export const EXTERNAL_ERRORS = {
  /** External service temporarily unavailable */
  EXTERNAL_001: 'EXTERNAL_001',
  /** External service returned an error */
  EXTERNAL_002: 'EXTERNAL_002',
  /** External service timeout */
  EXTERNAL_003: 'EXTERNAL_003',
  /** Database connection failed */
  EXTERNAL_004: 'EXTERNAL_004',
  /** Cache service unavailable */
  EXTERNAL_005: 'EXTERNAL_005',
  /** Message queue unavailable */
  EXTERNAL_006: 'EXTERNAL_006',
  /** AI service unavailable */
  EXTERNAL_007: 'EXTERNAL_007',
  /** Email service failed */
  EXTERNAL_008: 'EXTERNAL_008',
  /** SMS service failed */
  EXTERNAL_009: 'EXTERNAL_009',
  /** Storage service failed */
  EXTERNAL_010: 'EXTERNAL_010',
} as const;

/**
 * Internal Server Errors (INTERNAL_XXX)
 */
export const INTERNAL_ERRORS = {
  /** Unexpected server error */
  INTERNAL_001: 'INTERNAL_001',
  /** Configuration error */
  INTERNAL_002: 'INTERNAL_002',
  /** Data integrity error */
  INTERNAL_003: 'INTERNAL_003',
  /** Serialization error */
  INTERNAL_004: 'INTERNAL_004',
  /** Concurrent modification error */
  INTERNAL_005: 'INTERNAL_005',
} as const;

/**
 * Combined error codes object
 */
export const ErrorCodes = {
  ...AUTH_ERRORS,
  ...VALIDATION_ERRORS,
  ...RESOURCE_ERRORS,
  ...RATE_LIMIT_ERRORS,
  ...BUSINESS_ERRORS,
  ...DISCUSSION_ERRORS,
  ...AI_ERRORS,
  ...MOD_ERRORS,
  ...EXTERNAL_ERRORS,
  ...INTERNAL_ERRORS,
} as const;

/**
 * Error code type
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Error code metadata registry
 * Maps error codes to their human-readable messages and HTTP status codes
 */
export const ERROR_CODE_METADATA: Record<ErrorCode, ErrorCodeMeta> = {
  // Authentication Errors
  AUTH_001: {
    message: 'Authentication required. Please provide a valid access token.',
    httpStatus: HttpStatus.UNAUTHORIZED,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_002: {
    message: 'Your session has expired. Please log in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_003: {
    message: 'Invalid email or password.',
    httpStatus: HttpStatus.UNAUTHORIZED,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_004: {
    message: 'Please verify your email address before continuing.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_005: {
    message: 'Your account has been suspended. Contact support for assistance.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_006: {
    message: 'This account has been deactivated.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_007: {
    message: 'You do not have permission to perform this action.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_008: {
    message: 'OAuth authentication failed. Please try again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
    logAsError: true,
    category: 'AUTH',
  },
  AUTH_009: {
    message: 'Invalid OAuth state. Please restart the authentication process.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: true,
    category: 'AUTH',
  },
  AUTH_010: {
    message: 'Your refresh token is invalid or expired. Please log in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_011: {
    message: 'Multi-factor authentication is required.',
    httpStatus: HttpStatus.UNAUTHORIZED,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_012: {
    message: 'Invalid verification code. Please try again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
    logAsError: false,
    category: 'AUTH',
  },
  AUTH_013: {
    message: 'Your session has been invalidated. Please log in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
    logAsError: false,
    category: 'AUTH',
  },

  // Validation Errors
  VALIDATION_001: {
    message: 'Request validation failed. Please check your input.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_002: {
    message: 'A required field is missing.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_003: {
    message: 'Invalid field value provided.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_004: {
    message:
      'Password does not meet requirements. Use at least 8 characters with uppercase, lowercase, number, and special character.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_005: {
    message: 'Please provide a valid email address.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_006: {
    message: 'Please provide a valid phone number.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_007: {
    message: 'Username must be 3-30 characters and contain only letters, numbers, and underscores.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_008: {
    message: 'This file type is not allowed.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_009: {
    message: 'File size exceeds the maximum allowed limit.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_010: {
    message: 'Invalid date or date range provided.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_011: {
    message: 'Content length exceeds the maximum allowed limit.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },
  VALIDATION_012: {
    message: 'Invalid JSON format in request body.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'VALIDATION',
  },

  // Resource Errors
  RESOURCE_001: {
    message: 'The requested resource was not found.',
    httpStatus: HttpStatus.NOT_FOUND,
    logAsError: false,
    category: 'RESOURCE',
  },
  RESOURCE_002: {
    message: 'A resource with this identifier already exists.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'RESOURCE',
  },
  RESOURCE_003: {
    message: 'This resource is no longer available.',
    httpStatus: HttpStatus.GONE,
    logAsError: false,
    category: 'RESOURCE',
  },
  RESOURCE_004: {
    message: 'This resource is currently locked and cannot be modified.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'RESOURCE',
  },
  RESOURCE_005: {
    message: 'The resource is in a conflicting state.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'RESOURCE',
  },
  RESOURCE_006: {
    message: 'User not found.',
    httpStatus: HttpStatus.NOT_FOUND,
    logAsError: false,
    category: 'RESOURCE',
  },
  RESOURCE_007: {
    message: 'Topic not found.',
    httpStatus: HttpStatus.NOT_FOUND,
    logAsError: false,
    category: 'RESOURCE',
  },
  RESOURCE_008: {
    message: 'Discussion not found.',
    httpStatus: HttpStatus.NOT_FOUND,
    logAsError: false,
    category: 'RESOURCE',
  },
  RESOURCE_009: {
    message: 'Response not found.',
    httpStatus: HttpStatus.NOT_FOUND,
    logAsError: false,
    category: 'RESOURCE',
  },
  RESOURCE_010: {
    message: 'Proposition not found.',
    httpStatus: HttpStatus.NOT_FOUND,
    logAsError: false,
    category: 'RESOURCE',
  },

  // Rate Limit Errors
  RATE_LIMIT_001: {
    message: 'Too many requests. Please try again later.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    logAsError: false,
    category: 'RATE_LIMIT',
  },
  RATE_LIMIT_002: {
    message: 'Too many login attempts. Please try again later.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    logAsError: true,
    category: 'RATE_LIMIT',
  },
  RATE_LIMIT_003: {
    message: 'API quota exceeded. Please upgrade your plan or try again later.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    logAsError: false,
    category: 'RATE_LIMIT',
  },
  RATE_LIMIT_004: {
    message: 'Too many verification code requests. Please wait before requesting again.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    logAsError: false,
    category: 'RATE_LIMIT',
  },
  RATE_LIMIT_005: {
    message: 'Too many password reset requests. Please wait before requesting again.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    logAsError: false,
    category: 'RATE_LIMIT',
  },

  // Business Logic Errors
  BUSINESS_001: {
    message: 'This operation is not permitted in the current state.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_002: {
    message: 'Verification code has expired. Please request a new one.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_003: {
    message: 'Invalid verification code.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_004: {
    message: 'Email is already verified.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_005: {
    message: 'Phone number is already verified.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_006: {
    message: 'Onboarding has already been completed.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_007: {
    message: 'Invalid topic selection.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_008: {
    message: 'This discussion is closed and no longer accepting responses.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_009: {
    message: 'You cannot respond to your own content.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_010: {
    message: 'Maximum number of responses reached.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_011: {
    message: 'Insufficient reputation to perform this action.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'BUSINESS',
  },
  BUSINESS_012: {
    message: 'This feature is not available for your account.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'BUSINESS',
  },

  // Discussion Errors
  DISCUSSION_001: {
    message: 'Topic creation failed. Please check the provided parameters.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'DISCUSSION',
  },
  DISCUSSION_002: {
    message: 'This topic has been archived and can no longer be modified.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'DISCUSSION',
  },
  DISCUSSION_003: {
    message: 'Response threading depth limit has been reached.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'DISCUSSION',
  },
  DISCUSSION_004: {
    message: 'This proposition is already linked to the response.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'DISCUSSION',
  },
  DISCUSSION_005: {
    message: 'Cannot delete a response that has existing replies.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'DISCUSSION',
  },
  DISCUSSION_006: {
    message: 'The discussion participant limit has been reached.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'DISCUSSION',
  },
  DISCUSSION_007: {
    message: 'This response type is not valid for the current discussion format.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'DISCUSSION',
  },
  DISCUSSION_008: {
    message: 'The citation source is invalid or inaccessible.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'DISCUSSION',
  },
  DISCUSSION_009: {
    message: 'This topic has been locked by a moderator.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'DISCUSSION',
  },
  DISCUSSION_010: {
    message: 'A duplicate response was detected.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'DISCUSSION',
  },

  // AI Service Errors
  AI_001: {
    message: 'AI analysis request failed. Please try again later.',
    httpStatus: HttpStatus.BAD_GATEWAY,
    logAsError: true,
    category: 'AI',
  },
  AI_002: {
    message: 'Bias detection returned invalid results. Please try again.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    logAsError: true,
    category: 'AI',
  },
  AI_003: {
    message: 'Common ground analysis timed out. Please try again later.',
    httpStatus: HttpStatus.BAD_GATEWAY,
    logAsError: true,
    category: 'AI',
  },
  AI_004: {
    message: 'AI model rate limit exceeded. Please wait before trying again.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    logAsError: true,
    category: 'AI',
  },
  AI_005: {
    message: 'Content exceeds the maximum length for AI analysis.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'AI',
  },
  AI_006: {
    message: 'AI model version mismatch. Please contact support.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    logAsError: true,
    category: 'AI',
  },
  AI_007: {
    message: 'AI confidence score is below the acceptable threshold.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'AI',
  },
  AI_008: {
    message: 'AI provider authentication failed. Please contact support.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'AI',
  },

  // Moderation Errors
  MOD_001: {
    message: 'This content has been flagged by automated moderation.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'MOD',
  },
  MOD_002: {
    message: 'This content violates community guidelines.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'MOD',
  },
  MOD_003: {
    message: 'An appeal has already been submitted for this action.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'MOD',
  },
  MOD_004: {
    message: 'The appeal window for this action has expired.',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    logAsError: false,
    category: 'MOD',
  },
  MOD_005: {
    message: 'This moderation action requires a higher privilege level.',
    httpStatus: HttpStatus.FORBIDDEN,
    logAsError: false,
    category: 'MOD',
  },
  MOD_006: {
    message: 'This content is currently under active review.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'MOD',
  },
  MOD_007: {
    message: 'The ban duration exceeds the maximum allowed period.',
    httpStatus: HttpStatus.BAD_REQUEST,
    logAsError: false,
    category: 'MOD',
  },
  MOD_008: {
    message: 'The reported content was not found or has already been removed.',
    httpStatus: HttpStatus.NOT_FOUND,
    logAsError: false,
    category: 'MOD',
  },
  MOD_009: {
    message: 'A report has already been submitted for this content.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: false,
    category: 'MOD',
  },
  MOD_010: {
    message: 'The moderation queue is currently full. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'MOD',
  },

  // External Service Errors
  EXTERNAL_001: {
    message: 'A required service is temporarily unavailable. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'EXTERNAL',
  },
  EXTERNAL_002: {
    message: 'An external service returned an error. Please try again later.',
    httpStatus: HttpStatus.BAD_GATEWAY,
    logAsError: true,
    category: 'EXTERNAL',
  },
  EXTERNAL_003: {
    message: 'Request to external service timed out. Please try again.',
    httpStatus: HttpStatus.BAD_GATEWAY,
    logAsError: true,
    category: 'EXTERNAL',
  },
  EXTERNAL_004: {
    message: 'Database connection failed. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'EXTERNAL',
  },
  EXTERNAL_005: {
    message: 'Cache service is unavailable. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'EXTERNAL',
  },
  EXTERNAL_006: {
    message: 'Message queue is unavailable. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'EXTERNAL',
  },
  EXTERNAL_007: {
    message: 'AI service is temporarily unavailable. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'EXTERNAL',
  },
  EXTERNAL_008: {
    message: 'Failed to send email. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'EXTERNAL',
  },
  EXTERNAL_009: {
    message: 'Failed to send SMS. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'EXTERNAL',
  },
  EXTERNAL_010: {
    message: 'Storage service is unavailable. Please try again later.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    logAsError: true,
    category: 'EXTERNAL',
  },

  // Internal Server Errors
  INTERNAL_001: {
    message: 'An unexpected error occurred. Please try again later.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    logAsError: true,
    category: 'INTERNAL',
  },
  INTERNAL_002: {
    message: 'Server configuration error. Please contact support.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    logAsError: true,
    category: 'INTERNAL',
  },
  INTERNAL_003: {
    message: 'Data integrity error. Please contact support.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    logAsError: true,
    category: 'INTERNAL',
  },
  INTERNAL_004: {
    message: 'Data serialization error. Please contact support.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    logAsError: true,
    category: 'INTERNAL',
  },
  INTERNAL_005: {
    message: 'Concurrent modification detected. Please try again.',
    httpStatus: HttpStatus.CONFLICT,
    logAsError: true,
    category: 'INTERNAL',
  },
};

/**
 * Get the metadata for an error code
 * @param code - The error code
 * @returns The error code metadata
 */
export function getErrorMeta(code: ErrorCode): ErrorCodeMeta {
  return ERROR_CODE_METADATA[code];
}

/**
 * Get the human-readable message for an error code
 * @param code - The error code
 * @returns The error message
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_CODE_METADATA[code].message;
}

/**
 * Get the HTTP status code for an error code
 * @param code - The error code
 * @returns The HTTP status code
 */
export function getHttpStatus(code: ErrorCode): HttpStatus {
  return ERROR_CODE_METADATA[code].httpStatus;
}

/**
 * Check if an error code should be logged at error level
 * @param code - The error code
 * @returns Whether to log as error
 */
export function shouldLogAsError(code: ErrorCode): boolean {
  return ERROR_CODE_METADATA[code].logAsError;
}

/**
 * Get the category for an error code
 * @param code - The error code
 * @returns The error category
 */
export function getErrorCategory(code: ErrorCode): ErrorCategory {
  return ERROR_CODE_METADATA[code].category;
}

/**
 * Get all error codes for a specific category
 * @param category - The error category
 * @returns Array of error codes in the category
 */
export function getErrorCodesByCategory(category: ErrorCategory): ErrorCode[] {
  return Object.entries(ERROR_CODE_METADATA)
    .filter(([, meta]) => meta.category === category)
    .map(([code]) => code as ErrorCode);
}

/**
 * Validate that a string is a valid error code format
 * @param code - The string to validate
 * @returns Whether the string matches the error code pattern
 */
export function isValidErrorCodeFormat(code: string): boolean {
  return ERROR_CODE_PATTERN.test(code);
}

/**
 * Check if a string is a known error code
 * @param code - The string to check
 * @returns Whether the string is a known error code
 */
export function isKnownErrorCode(code: string): code is ErrorCode {
  return code in ErrorCodes;
}
