/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { JWT_CACHE } from '../constants/index.js';

/**
 * JWT payload structure for authenticated users
 */
export interface JwtPayload {
  sub: string; // Cognito user ID (cognitoSub) or database user ID
  email: string;
  'cognito:username'?: string;
  userId?: string; // Database user ID (for database auth mode)
  exp: number;
  iat: number;
}

/**
 * JWT Verification Service for WebSocket connections
 *
 * Supports both mock/development mode (HS256 with secret) and
 * production mode (RS256 with Cognito JWKS).
 *
 * @remarks
 * This service is designed for use in WebSocket gateways where
 * passport-based guards are not available.
 */
@Injectable()
export class JwtVerificationService {
  private readonly logger = new Logger(JwtVerificationService.name);
  private readonly jwksClient?: jwksClient.JwksClient;
  private readonly userPoolId?: string;
  private readonly region: string;
  private readonly useMockAuth: boolean;
  private readonly jwtSecret?: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') ?? 'us-east-1';

    // Determine auth mode. Mock auth requires an explicit opt-in; an unset NODE_ENV is
    // treated as production (fail-closed) so a misconfigured container never silently
    // downgrades to forgeable HS256 verification.
    const authMode = this.configService.get<string>('AUTH_MODE');
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    this.useMockAuth =
      authMode === 'database' ||
      authMode === 'mock' ||
      this.configService.get<string>('AUTH_MOCK') === 'true' ||
      nodeEnv === 'test' ||
      nodeEnv === 'development';

    if (this.useMockAuth) {
      this.logger.warn(
        'JwtVerificationService is running in MOCK auth mode (local HS256 verification with ' +
          'JWT_SECRET). This is INSECURE for production. Ensure this is intentional ' +
          `(AUTH_MODE=${authMode ?? 'unset'}, NODE_ENV=${nodeEnv ?? 'unset'}).`,
      );
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret && nodeEnv !== 'test') {
        throw new Error('JWT_SECRET environment variable is required');
      }
      this.jwtSecret = secret ?? 'mock-jwt-secret-for-testing';
    } else {
      this.userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID');
      if (!this.userPoolId) {
        throw new Error('COGNITO_USER_POOL_ID is required in production mode');
      }
      this.jwksClient = jwksClient.default({
        jwksUri: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`,
        cache: true,
        cacheMaxAge: JWT_CACHE.MAX_AGE_MS,
      });
      this.logger.debug('JwtVerificationService initialized in production mode with Cognito JWKS');
    }
  }

  /**
   * Verify a JWT token and return the payload
   *
   * @param token - The JWT token to verify
   * @returns The decoded JWT payload if valid, null otherwise
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    if (!token) {
      return null;
    }

    try {
      if (this.useMockAuth) {
        // Mock mode - verify with simple JWT secret
        const payload = jwt.verify(token, this.jwtSecret!, {
          algorithms: ['HS256'],
        }) as JwtPayload;
        return payload;
      } else {
        // Production mode - verify with Cognito JWKS
        const decodedToken = jwt.decode(token, { complete: true }) as {
          header: { kid: string };
          payload: JwtPayload;
        } | null;

        if (!decodedToken || !decodedToken.header.kid) {
          this.logger.warn('Invalid token format - no KID found');
          return null;
        }

        const key = await this.jwksClient!.getSigningKey(decodedToken.header.kid);
        const signingKey = key.getPublicKey();

        const payload = jwt.verify(token, signingKey, {
          algorithms: ['RS256'],
        }) as JwtPayload;

        return payload;
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        this.logger.debug('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        this.logger.debug('Invalid token');
      } else {
        this.logger.error('Token verification error:', error);
      }
      return null;
    }
  }
}
