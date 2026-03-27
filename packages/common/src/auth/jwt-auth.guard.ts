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

/**
 * JWT Payload structure for authentication
 *
 * @remarks
 * Supports both Cognito-issued tokens (with cognito:username) and
 * database auth tokens (with userId). The `sub` field is always present.
 */
export interface JwtPayload {
  /** Subject - Cognito user ID (cognitoSub) or database user ID */
  sub: string;
  /** User email address */
  email?: string;
  /** Cognito username (present in Cognito tokens) */
  'cognito:username'?: string;
  /** Database user ID (present in database auth mode) */
  userId?: string;
  /** Token issued at timestamp (seconds) */
  iat: number;
  /** Token expiration timestamp (seconds) */
  exp: number;
}

/**
 * JWT Authentication Guard for NestJS HTTP endpoints
 *
 * Validates JWT tokens in the Authorization header. Supports two modes:
 * 1. Mock/Development/Test mode: Validates using HS256 with JWT_SECRET
 * 2. Production mode: Validates using RS256 with Cognito JWKS
 *
 * @remarks
 * The auth mode is determined automatically based on environment variables:
 * - AUTH_MODE=database or AUTH_MODE=mock → mock auth
 * - AUTH_MOCK=true → mock auth
 * - NODE_ENV=test or NODE_ENV=development → mock auth
 * - NODE_ENV not set → mock auth (safe default for dev)
 * - Otherwise → production auth with Cognito JWKS
 *
 * @example
 * ```typescript
 * import { JwtAuthGuard } from '@reason-bridge/common';
 *
 * @Controller('users')
 * @UseGuards(JwtAuthGuard)
 * export class UsersController {
 *   @Get('me')
 *   getProfile(@Req() req: Request) {
 *     return req.user; // JwtPayload
 *   }
 * }
 * ```
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwksClient?: jwksClient.JwksClient;
  private readonly userPoolId?: string;
  private readonly region: string;
  private readonly useMockAuth: boolean;
  private readonly jwtSecret?: string;

  /**
   * Constructor with optional dependencies
   *
   * @param jwtService - JWT service for token verification (optional, will use lazy loading)
   * @param configService - Config service for reading environment variables (optional, uses env vars as fallback)
   *
   * @remarks
   * Dependencies are optional to allow NestJS to instantiate this guard during route setup.
   * When dependencies are not available, the guard falls back to environment variables.
   * The actual JwtService is resolved lazily during canActivate if not provided.
   */
  constructor(
    @Optional() @Inject(JwtService) private jwtService?: JwtService,
    @Optional() @Inject(ConfigService) private configService?: ConfigService,
  ) {
    // Read config via ConfigService if available, otherwise use environment variables
    const getConfig = (key: string) => this.configService?.get<string>(key) ?? process.env[key];

    this.region = getConfig('AWS_REGION') ?? 'us-east-1';

    // Determine auth mode - database auth and mock auth both use local JWT verification
    const authMode = getConfig('AUTH_MODE');
    const nodeEnv = getConfig('NODE_ENV');
    this.useMockAuth =
      authMode === 'database' ||
      authMode === 'mock' ||
      getConfig('AUTH_MOCK') === 'true' ||
      nodeEnv === 'test' ||
      nodeEnv === 'development' ||
      !nodeEnv; // Default to mock auth if NODE_ENV is not set

    if (this.useMockAuth) {
      // Mock mode - use simple JWT secret
      const secret = getConfig('JWT_SECRET');
      if (!secret && nodeEnv !== 'test') {
        throw new Error('JWT_SECRET environment variable is required');
      }
      this.jwtSecret = secret ?? 'mock-jwt-secret-for-testing';
    } else {
      // Production mode - use Cognito JWKS
      this.userPoolId = getConfig('COGNITO_USER_POOL_ID');
      if (!this.userPoolId) {
        throw new Error('COGNITO_USER_POOL_ID is required in production mode');
      }
      this.jwksClient = jwksClient.default({
        jwksUri: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`,
        cache: true,
        cacheMaxAge: 86400000, // 24 hours in milliseconds
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
        // Mock mode - verify with simple JWT secret
        payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.jwtSecret!,
          algorithms: ['HS256'],
        });
      } else {
        // Production mode - verify with Cognito JWKS
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

      // Attach the payload to the request object for use in controllers
      request.user = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log for debugging but don't expose details
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
