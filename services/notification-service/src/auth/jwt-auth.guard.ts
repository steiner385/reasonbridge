/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as jwksClient from 'jwks-rsa';

export interface JwtPayload {
  sub: string; // Cognito user ID (cognitoSub) or database user ID
  email: string;
  'cognito:username'?: string;
  userId?: string; // Database user ID (for database auth mode)
  exp: number;
  iat: number;
}

/**
 * JWT Auth Guard for HTTP endpoints
 *
 * Supports both mock/development mode (HS256 with secret) and
 * production mode (RS256 with Cognito JWKS).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwksClient?: jwksClient.JwksClient;
  private readonly userPoolId?: string;
  private readonly region: string;
  private readonly useMockAuth: boolean;
  private readonly jwtSecret?: string;

  constructor(
    @Optional() @Inject(JwtService) private jwtService?: JwtService,
    @Optional() @Inject(ConfigService) private configService?: ConfigService,
  ) {
    const getConfig = (key: string) => this.configService?.get<string>(key) ?? process.env[key];

    this.region = getConfig('AWS_REGION') ?? 'us-east-1';

    const authMode = getConfig('AUTH_MODE');
    const nodeEnv = getConfig('NODE_ENV');
    this.useMockAuth =
      authMode === 'database' ||
      authMode === 'mock' ||
      getConfig('AUTH_MOCK') === 'true' ||
      nodeEnv === 'test' ||
      nodeEnv === 'development' ||
      !nodeEnv;

    if (this.useMockAuth) {
      this.jwtSecret = getConfig('JWT_SECRET') ?? 'mock-jwt-secret-for-testing';
    } else {
      this.userPoolId = getConfig('COGNITO_USER_POOL_ID');
      if (!this.userPoolId) {
        throw new Error('COGNITO_USER_POOL_ID is required in production mode');
      }
      this.jwksClient = jwksClient.default({
        jwksUri: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`,
        cache: true,
        cacheMaxAge: 86400000,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      let payload: JwtPayload;

      if (!this.jwtService) {
        throw new UnauthorizedException(
          'JWT service not available - guard not properly configured',
        );
      }

      if (this.useMockAuth) {
        payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.jwtSecret!,
          algorithms: ['HS256'],
        });
      } else {
        const decodedToken = this.jwtService.decode(token, { complete: true }) as {
          header: { kid: string };
          payload: JwtPayload;
        };

        if (!decodedToken || !decodedToken.header.kid) {
          throw new UnauthorizedException('Invalid token format');
        }

        const key = await this.jwksClient!.getSigningKey(decodedToken.header.kid);
        const signingKey = key.getPublicKey();

        payload = this.jwtService.verify<JwtPayload>(token, {
          publicKey: signingKey,
          algorithms: ['RS256'],
        });
      }

      // Attach the payload to the request object
      request.user = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
