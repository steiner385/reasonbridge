/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { FastifyRequest } from 'fastify';

/**
 * Authenticated user payload extracted from JWT token
 */
export interface AuthenticatedUser {
  id: string;
  email?: string;
}

/**
 * Fastify request with authenticated user
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
}
