/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from './jwt-auth.guard.js';

export { AuthModule } from './auth.module.js';
export { JwtAuthGuard, type JwtPayload } from './jwt-auth.guard.js';
export { OptionalAuthGuard } from './guards/optional-auth.guard.js';
export { ModeratorGuard } from './guards/moderator.guard.js';
export { CurrentUser } from './current-user.decorator.js';

/**
 * User payload attached to request by auth middleware
 * Supports both API gateway headers and JWT payload
 */
export interface RequestUser {
  id?: string;
  sub?: string;
  role?: 'USER' | 'MODERATOR' | 'ADMIN';
}

/**
 * Request with authenticated user context
 * Used for endpoints that accept x-user-id header or JWT auth
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user?: RequestUser | JwtPayload;
  userId?: string;
}

/**
 * Extract user ID from request (header or JWT payload)
 * @param userIdHeader - x-user-id header value
 * @param req - Request object with user context
 * @returns User ID or undefined
 */
export function getUserIdFromRequest(
  userIdHeader: string | undefined,
  req: AuthenticatedRequest,
): string | undefined {
  return userIdHeader || req.user?.sub || (req.user as RequestUser)?.id || req.userId;
}
