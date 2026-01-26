import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

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
export class MockAuthService {
  private users: Map<string, MockUser> = new Map();
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    // Use a simple secret for testing - DO NOT use in production
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'mock-jwt-secret-for-testing');
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
  async authenticateUser(email: string, password: string) {
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
    const expiresIn = 3600; // 1 hour

    const accessToken = jwt.sign(
      {
        sub: foundUser.sub,
        email: foundUser.email,
        token_use: 'access',
        iat: now,
        exp: now + expiresIn,
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
        exp: now + expiresIn,
      },
      this.jwtSecret,
    );

    const refreshToken = jwt.sign(
      {
        sub: foundUser.sub,
        token_use: 'refresh',
        iat: now,
        exp: now + 30 * 24 * 3600, // 30 days
      },
      this.jwtSecret,
    );

    return {
      accessToken,
      idToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Refresh access token (mock implementation)
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as jwt.JwtPayload;

      if (decoded['token_use'] !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = this.users.get(decoded['sub'] as string);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = 3600;

      const accessToken = jwt.sign(
        {
          sub: user.sub,
          email: user.email,
          token_use: 'access',
          iat: now,
          exp: now + expiresIn,
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
          exp: now + expiresIn,
        },
        this.jwtSecret,
      );

      return {
        accessToken,
        idToken,
        expiresIn,
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Clear all mock users (useful for test cleanup)
   */
  clearUsers(): void {
    this.users.clear();
  }

  /**
   * Get a user by sub (for testing)
   */
  getUserBySub(sub: string): MockUser | undefined {
    return this.users.get(sub);
  }
}
