import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { IAuthService } from './auth.interface.js';

/**
 * Database-backed authentication service for local development.
 * Authenticates users against the User table using bcrypt password hashing.
 *
 * Enable by setting AUTH_MODE=database in environment.
 */
@Injectable()
export class DatabaseAuthService implements IAuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.jwtSecret = this.configService.get<string>(
      'JWT_SECRET',
      'local-jwt-secret-for-development',
    );
  }

  /**
   * Register a new user
   *
   * In database auth mode, this creates the user record directly with password hash.
   * The auth.controller.ts will then call createUser() which should handle the
   * case where the user already exists (upsert or skip).
   */
  async signUp(email: string, password: string, displayName: string): Promise<{ userSub: string }> {
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Validate password
    if (password.length < 8) {
      throw new UnauthorizedException('Password must be at least 8 characters');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userSub = uuidv4();

    // Create user in database with password hash
    await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        displayName,
        cognitoSub: userSub,
        authMethod: 'EMAIL_PASSWORD',
        emailVerified: true,
        passwordHash,
        accountStatus: 'ACTIVE',
        status: 'ACTIVE',
        // Set trust scores and verification level for new users
        verificationLevel: 'BASIC',
        trustScoreAbility: 0.5,
        trustScoreBenevolence: 0.5,
        trustScoreIntegrity: 0.5,
      },
    });

    return { userSub };
  }

  /**
   * Authenticate user against database
   */
  async authenticateUser(email: string, password: string) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login time
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT tokens
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    const accessToken = jwt.sign(
      {
        sub: user.cognitoSub,
        email: user.email,
        token_use: 'access',
        iat: now,
        exp: now + expiresIn,
      },
      this.jwtSecret,
    );

    const idToken = jwt.sign(
      {
        sub: user.cognitoSub,
        email: user.email,
        name: user.displayName,
        email_verified: user.emailVerified,
        iat: now,
        exp: now + expiresIn,
      },
      this.jwtSecret,
    );

    const refreshToken = jwt.sign(
      {
        sub: user.cognitoSub,
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
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as jwt.JwtPayload;

      if (decoded['token_use'] !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { cognitoSub: decoded['sub'] as string },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = 3600;

      const accessToken = jwt.sign(
        {
          sub: user.cognitoSub,
          email: user.email,
          token_use: 'access',
          iat: now,
          exp: now + expiresIn,
        },
        this.jwtSecret,
      );

      const idToken = jwt.sign(
        {
          sub: user.cognitoSub,
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
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
