/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Inject,
  Injectable,
  Optional,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '../jwt-auth.guard.js';

/**
 * Request with optional authorization header
 */
interface RequestWithAuth extends FastifyRequest {
  headers: FastifyRequest['headers'] & {
    authorization?: string;
  };
}

/**
 * Optional auth guard that allows both authenticated and anonymous users
 * Feature #1040: Full-Text Search for Discussions
 *
 * If a valid token is provided, the user is extracted and attached to the request.
 * If no token or invalid token, the request continues without user context.
 * This is useful for endpoints that can be used by anyone but may personalize
 * results for authenticated users.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  private readonly jwtSecret?: string;

  constructor(
    @Optional() @Inject(JwtService) private jwtService?: JwtService,
    @Optional() @Inject(ConfigService) private configService?: ConfigService,
  ) {
    const getConfig = (key: string) => this.configService?.get<string>(key) ?? process.env[key];
    const secret = getConfig('JWT_SECRET');
    const nodeEnv = getConfig('NODE_ENV');
    if (!secret && nodeEnv !== 'test') {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = secret ?? 'mock-jwt-secret-for-testing';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    // No token - allow anonymous access
    if (!token) {
      request.user = null;
      return true;
    }

    try {
      if (!this.jwtService) {
        // No JWT service - allow anonymous
        request.user = null;
        return true;
      }

      // Try to verify the token
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.jwtSecret!,
        algorithms: ['HS256'],
      });

      // Attach the payload to the request object
      request.user = payload;
    } catch {
      // Invalid token - allow anonymous access
      request.user = null;
    }

    return true;
  }

  private extractTokenFromHeader(request: RequestWithAuth): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
