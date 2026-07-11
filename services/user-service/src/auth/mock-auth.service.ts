/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { AUTH_TOKENS } from '../constants/index.js';
import type { IAuthService, AuthResult, RefreshResult } from './auth.interface.js';

/**
 * Mock authentication service for local development and E2E testing.
 * This service simulates Cognito behavior without requiring AWS.
 *
 * Enable by setting NODE_ENV=test or AUTH_MOCK=true
 */

// In-memory user store for testing
interface MockUser {
  sub: string;
  email: string;
  password: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: Date;
}

@Injectable()
export class MockAuthService implements IAuthService {
  private users: Map<string, MockUser> = new Map();
  // Password reset codes keyed by lowercased email (mock delivery channel).
  private resetCodes: Map<string, string> = new Map();
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    // Mock auth only runs in test/E2E contexts. Fail fast if a real deployment
    // ever selects it without providing JWT_SECRET.
    const secret = this.configService?.get<string>('JWT_SECRET');
    if (!secret && process.env['NODE_ENV'] !== 'test') {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = secret ?? 'mock-jwt-secret-for-testing';
  }

  /**
   * Register a new user (mock implementation)
   */
  async signUp(email: string, password: string, displayName: string): Promise<{ userSub: string }> {
    // Check if user already exists
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        throw new ConflictException('An account with this email already exists');
      }
    }

    // Validate password (basic validation for testing)
    if (password.length < 8) {
      throw new UnauthorizedException('Password must be at least 8 characters');
    }

    // Create new user
    const userSub = uuidv4();
    const mockUser: MockUser = {
      sub: userSub,
      email: email.toLowerCase(),
      password, // In production, this would be hashed
      displayName,
      emailVerified: true, // Auto-verify for testing
      createdAt: new Date(),
    };

    this.users.set(userSub, mockUser);

    return { userSub };
  }

  /**
   * Authenticate user (mock implementation)
   */
  async authenticateUser(email: string, password: string): Promise<AuthResult> {
    // Find user by email
    let foundUser: MockUser | undefined;
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (foundUser.password !== password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate mock JWT tokens
    const now = Math.floor(Date.now() / 1000);

    const accessToken = jwt.sign(
      {
        sub: foundUser.sub,
        email: foundUser.email,
        token_use: 'access',
        iat: now,
        exp: now + AUTH_TOKENS.EXPIRES_IN_SECONDS,
      },
      this.jwtSecret,
    );

    const idToken = jwt.sign(
      {
        sub: foundUser.sub,
        email: foundUser.email,
        name: foundUser.displayName,
        email_verified: foundUser.emailVerified,
        iat: now,
        exp: now + AUTH_TOKENS.EXPIRES_IN_SECONDS,
      },
      this.jwtSecret,
    );

    const refreshToken = jwt.sign(
      {
        sub: foundUser.sub,
        token_use: 'refresh',
        iat: now,
        exp: now + AUTH_TOKENS.REFRESH_EXPIRES_IN_SECONDS, // 7 days (issue #1384)
      },
      this.jwtSecret,
    );

    return {
      accessToken,
      idToken,
      refreshToken,
      expiresIn: AUTH_TOKENS.EXPIRES_IN_SECONDS,
      tokenType: 'Bearer',
    };
  }

  /**
   * Refresh access token (mock implementation)
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
    try {
      // Pin the algorithm to the symmetric HS256 we sign with (issue #1300).
      const decoded = jwt.verify(refreshToken, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;

      if (decoded['token_use'] !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = this.users.get(decoded['sub'] as string);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const now = Math.floor(Date.now() / 1000);

      const accessToken = jwt.sign(
        {
          sub: user.sub,
          email: user.email,
          token_use: 'access',
          iat: now,
          exp: now + AUTH_TOKENS.EXPIRES_IN_SECONDS,
        },
        this.jwtSecret,
      );

      const idToken = jwt.sign(
        {
          sub: user.sub,
          email: user.email,
          name: user.displayName,
          email_verified: user.emailVerified,
          iat: now,
          exp: now + AUTH_TOKENS.EXPIRES_IN_SECONDS,
        },
        this.jwtSecret,
      );

      return {
        accessToken,
        idToken,
        expiresIn: AUTH_TOKENS.EXPIRES_IN_SECONDS,
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Request a password reset (mock implementation).
   *
   * Generates a deterministic in-memory code for a known account. Always
   * resolves successfully to mirror the enumeration-safe production behaviour.
   *
   * @param email - The email address requesting a password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const exists = [...this.users.values()].some((u) => u.email === normalizedEmail);
    if (!exists) {
      return; // Silent success to prevent enumeration.
    }
    // Fixed code keeps mock/E2E flows deterministic without an email channel.
    this.resetCodes.set(normalizedEmail, '123456');
  }

  /**
   * Reset a user's password with a verification code (mock implementation).
   *
   * @param email - The account email address
   * @param code - The reset code previously issued by requestPasswordReset
   * @param newPassword - The new password to set
   * @throws {UnauthorizedException} When the code is missing or does not match
   */
  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const expected = this.resetCodes.get(normalizedEmail);
    if (!expected || expected !== code) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    const user = [...this.users.values()].find((u) => u.email === normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    user.password = newPassword;
    this.resetCodes.delete(normalizedEmail);
  }

  /**
   * Clear all mock users (useful for test cleanup)
   */
  clearUsers(): void {
    this.users.clear();
    this.resetCodes.clear();
  }

  /**
   * Get a user by sub (for testing)
   */
  getUserBySub(sub: string): MockUser | undefined {
    return this.users.get(sub);
  }
}
