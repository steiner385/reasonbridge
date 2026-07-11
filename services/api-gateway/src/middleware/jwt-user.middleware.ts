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
  private readonly jwtSecret: string;

  constructor() {
    const secret = process.env['JWT_SECRET'];
    const nodeEnv = process.env['NODE_ENV'];
    if (!secret && nodeEnv !== 'test') {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = secret ?? 'mock-jwt-secret-for-testing';
  }

  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token - continue without user context
      return next();
    }

    try {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Decode and verify JWT.
      // Pin the algorithm to the symmetric HS256 we sign with, so a future move to
      // asymmetric keys cannot open an algorithm-confusion path (see issue #1300).
      const decoded = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] }) as {
        sub?: string;
        userId?: string;
        id?: string;
        isMinor?: boolean;
      };

      // Extract user ID (check common JWT claim names)
      const userId = decoded.sub || decoded.userId || decoded.id;

      if (userId) {
        // Add user ID as custom header for downstream services
        req.headers['x-user-id'] = userId;

        // Add minor status header for child-friendly mode privacy controls
        // Downstream services use this to disable tracking, limit data collection, etc.
        if (typeof decoded.isMinor === 'boolean') {
          req.headers['x-is-minor'] = decoded.isMinor ? 'true' : 'false';
        }

        this.logger.debug(`JWT decoded: User ID ${userId}, isMinor: ${decoded.isMinor ?? 'N/A'}`);
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
