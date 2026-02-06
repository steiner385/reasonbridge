/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { createVerify, createPublicKey } from 'crypto';
import type { KeyObject } from 'crypto';

/**
 * JWT Authentication Guard for AI Service
 *
 * Validates JWT tokens in the Authorization header. Supports two modes:
 * 1. Test mode (JWT_SECRET set): Validates using HS256 with shared secret
 * 2. Production mode: Validates using RS256 with JWKS public key (from user-service)
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Post('preview')
 * async previewFeedback(@Body() dto: PreviewFeedbackDto) { ... }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private publicKey: KeyObject | null = null;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.verifyToken(token);
      request['user'] = payload;
      return true;
    } catch (error) {
      this.logger.warn(`JWT verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const headerB64 = parts[0];
    const payloadB64 = parts[1];
    const signatureB64 = parts[2];

    if (!headerB64 || !payloadB64 || !signatureB64) {
      throw new Error('Invalid JWT format');
    }

    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString()) as { alg: string };
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as JwtPayload;

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }

    // In test mode, use HS256 with JWT_SECRET
    const jwtSecret = process.env['JWT_SECRET'];
    if (jwtSecret) {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', jwtSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (signatureB64 !== expectedSignature) {
        throw new Error('Invalid signature');
      }
      return payload;
    }

    // Production mode: RS256 with public key
    if (header.alg !== 'RS256') {
      throw new Error(`Unsupported algorithm: ${header.alg}`);
    }

    const publicKey = await this.getPublicKey();
    if (!publicKey) {
      throw new Error('Public key not available');
    }

    const verify = createVerify('RSA-SHA256');
    verify.update(`${headerB64}.${payloadB64}`);
    const signature = Buffer.from(signatureB64, 'base64url');

    if (!verify.verify(publicKey, signature)) {
      throw new Error('Invalid signature');
    }

    return payload;
  }

  private async getPublicKey(): Promise<KeyObject | null> {
    if (this.publicKey) {
      return this.publicKey;
    }

    const jwksUrl = process.env['JWKS_URL'] || 'http://user-service:3002/.well-known/jwks.json';

    try {
      const response = await fetch(jwksUrl);
      if (!response.ok) {
        this.logger.error(`Failed to fetch JWKS: ${response.status}`);
        return null;
      }

      const jwks = (await response.json()) as { keys?: Array<{ kty: string }> };
      const key = jwks.keys?.[0];
      if (!key) {
        this.logger.error('No keys found in JWKS');
        return null;
      }

      // Convert JWK to PEM format for RSA verification
      this.publicKey = createPublicKey({
        key: key,
        format: 'jwk',
      });

      return this.publicKey;
    } catch (error) {
      this.logger.error(`JWKS fetch error: ${(error as Error).message}`);
      return null;
    }
  }
}

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  iat: number;
  exp: number;
}
