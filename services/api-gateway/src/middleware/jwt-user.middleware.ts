/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

/**
 * JWT User Middleware
 *
 * Extracts user ID from JWT token in Authorization header
 * and adds it to request headers for downstream services.
 *
 * Flow:
 * 1. Client sends: Authorization: Bearer <jwt_token>
 * 2. Middleware validates and decodes JWT
 * 3. Adds X-User-Id header for downstream services
 * 4. Downstream services read userId from header
 *
 * If JWT is invalid or missing, request continues without user context
 * (downstream services will handle authorization)
 */
@Injectable()
export class JwtUserMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtUserMiddleware.name);

  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token - continue without user context
      return next();
    }

    try {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const jwtSecret = process.env['JWT_SECRET'] || 'your-secret-key';

      // Decode and verify JWT
      const decoded = jwt.verify(token, jwtSecret) as {
        sub?: string;
        userId?: string;
        id?: string;
      };

      // Extract user ID (check common JWT claim names)
      const userId = decoded.sub || decoded.userId || decoded.id;

      if (userId) {
        // Add user ID as custom header for downstream services
        req.headers['x-user-id'] = userId;
        this.logger.debug(`JWT decoded: User ID ${userId}`);
      } else {
        this.logger.warn('JWT token valid but no user ID found in payload');
      }
    } catch (error: unknown) {
      // Token invalid/expired - log but continue
      // Downstream services will handle authorization
      if (error && typeof error === 'object' && 'name' in error) {
        const errorName = (error as { name: string }).name;
        if (errorName === 'TokenExpiredError') {
          this.logger.warn('JWT token expired');
        } else if (errorName === 'JsonWebTokenError') {
          const message = 'message' in error ? (error as { message: string }).message : 'Unknown';
          this.logger.warn(`JWT validation failed: ${message}`);
        } else {
          this.logger.error(
            `JWT decode error: ${error instanceof Error ? error.message : 'Unknown'}`,
          );
        }
      } else {
        this.logger.error(
          `JWT decode error: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }

    next();
  }
}
