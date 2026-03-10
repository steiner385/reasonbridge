/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from '../users/users.service.js';

// In test mode, use very high limits to allow E2E tests to run without throttling
const isTest = process.env['NODE_ENV'] === 'test';
const THROTTLE_LIMITS = {
  register: isTest ? 10000 : 3, // 3/min in prod
  login: isTest ? 10000 : 5, // 5/min in prod
  refresh: isTest ? 10000 : 10, // 10/min in prod
  verifyEmail: isTest ? 10000 : 5, // 5/min in prod
  resendVerification: isTest ? 10000 : 3, // 3/min in prod (per spec)
};
import { LoginDto, LoginResponseDto } from './dto/login.dto.js';
import { RefreshDto, RefreshResponseDto } from './dto/refresh.dto.js';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto.js';
import { VerifyEmailRequestDto, VerifyEmailResponseDto } from './dto/verify-email.dto.js';
import {
  ResendVerificationRequestDto,
  ResendVerificationResponseDto,
} from './dto/resend-verification.dto.js';
import { AUTH_SERVICE, type IAuthService } from './auth.interface.js';
import { AgeVerificationService } from '../compliance/age-verification.service.js';
import { ParentalConsentService } from '../compliance/parental-consent.service.js';
import { VerificationService } from './verification.service.js';
import { EmailService } from '../services/email.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: IAuthService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(AgeVerificationService)
    private readonly ageVerificationService: AgeVerificationService,
    @Inject(ParentalConsentService)
    private readonly parentalConsentService: ParentalConsentService,
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Register a new user account
   * Rate limited: 3 attempts per minute to prevent automated account creation
   */
  @Post('register')
  @Throttle({ default: { limit: THROTTLE_LIMITS.register, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    // 1. Register with auth service (Cognito or Database)
    const authResult = await this.authService.signUp(
      registerDto.email,
      registerDto.password,
      registerDto.displayName,
    );

    // 2. Create user in local database (or get existing if already created by auth service)
    // In database auth mode, the user is already created by signUp().
    // In Cognito mode, we need to create the local user record.
    let user;
    try {
      user = await this.usersService.createUser({
        email: registerDto.email,
        displayName: registerDto.displayName,
        cognitoSub: authResult.userSub,
      });
    } catch (error) {
      // If user already exists (created by database auth service), find them
      if (
        error instanceof Error &&
        (error.message.includes('already exists') || error.name === 'ConflictException')
      ) {
        // User was already created by the auth service, look them up
        user = await this.usersService.findByCognitoSub(authResult.userSub);
      } else {
        throw error;
      }
    }

    // 3. Generate email verification token and send verification email
    try {
      const verificationCode = await this.verificationService.generateToken(user.id, user.email);
      await this.emailService.sendVerificationEmail({
        email: user.email,
        displayName: user.displayName ?? '',
        code: verificationCode,
      });
      this.logger.log(`Verification email sent for user ${user.id}`);
    } catch (error) {
      // Log the error but don't fail registration
      // User can request verification email later via /auth/resend-verification
      this.logger.error(`Failed to send verification email for user ${user.id}:`, error);
    }

    // 4. If birthDate and country provided, verify age and update user record
    let requiresParentalConsent = false;
    let consentAge: number | undefined;
    let consentEmailSent = false;

    if (registerDto.birthDate && registerDto.declaredCountry) {
      const ageResult = await this.ageVerificationService.verifyAge(
        user.id,
        new Date(registerDto.birthDate),
        registerDto.declaredCountry,
      );
      requiresParentalConsent = ageResult.requiresConsent;
      consentAge = ageResult.consentAge;

      // 4. If parental consent is required and parent email provided, initiate consent flow
      if (requiresParentalConsent && registerDto.parentEmail) {
        try {
          await this.parentalConsentService.initiateConsent(user.id, registerDto.parentEmail);
          consentEmailSent = true;
          this.logger.log(`Parental consent email sent for user ${user.id}`);
        } catch (error) {
          // Log the error but don't fail registration
          // User can request consent email later via /parental-consent/request
          this.logger.error(`Failed to send consent email for user ${user.id}:`, error);
        }
      }
    }

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName ?? '',
      message: requiresParentalConsent
        ? consentEmailSent
          ? 'Registration successful. A consent request has been sent to your parent/guardian.'
          : 'Registration successful. Parental consent is required for your account.'
        : 'Registration successful. Please check your email to verify your account.',
      requiresEmailVerification: true,
      requiresParentalConsent,
      consentAge,
      consentEmailSent,
    };
  }

  /**
   * Authenticate user and return tokens
   * Rate limited: 5 attempts per minute to prevent brute force attacks
   */
  @Post('login')
  @Throttle({ default: { limit: THROTTLE_LIMITS.login, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.authenticateUser(loginDto.email, loginDto.password);
  }

  /**
   * Refresh access token using refresh token
   * Rate limited: 10 attempts per minute
   */
  @Post('refresh')
  @Throttle({ default: { limit: THROTTLE_LIMITS.refresh, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshDto): Promise<RefreshResponseDto> {
    return this.authService.refreshAccessToken(refreshDto.refreshToken);
  }

  /**
   * Signup alias for register endpoint
   * Frontend calls /auth/signup but backend has /auth/register
   * Rate limited: 3 attempts per minute
   */
  @Post('signup')
  @Throttle({ default: { limit: THROTTLE_LIMITS.register, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    return this.register(registerDto);
  }

  /**
   * Verify user email with 6-digit code
   * Rate limited: 5 attempts per minute to prevent brute force
   */
  @Post('verify-email')
  @Throttle({ default: { limit: THROTTLE_LIMITS.verifyEmail, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailRequestDto): Promise<VerifyEmailResponseDto> {
    this.logger.debug(`Verifying email for: ${dto.email}`);

    // Verify the token (throws if invalid/expired)
    const userId = await this.verificationService.verifyToken(dto.email, dto.code);

    // Update user's emailVerified field to true
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    this.logger.log(`Email verified successfully for user: ${userId}`);

    return {
      success: true,
      message: 'Email verified successfully',
      emailVerified: true,
    };
  }

  /**
   * Resend email verification code
   * Rate limited: 3 attempts per minute per spec
   */
  @Post('resend-verification')
  @Throttle({ default: { limit: THROTTLE_LIMITS.resendVerification, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() dto: ResendVerificationRequestDto,
  ): Promise<ResendVerificationResponseDto> {
    this.logger.debug(`Resending verification email for: ${dto.email}`);

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, displayName: true, emailVerified: true },
    });

    if (!user) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'No user found with this email',
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new BadRequestException({
        error: 'ALREADY_VERIFIED',
        message: 'Email is already verified',
      });
    }

    // Generate new verification token
    const code = await this.verificationService.generateToken(user.id, user.email);

    // Send verification email
    await this.emailService.sendVerificationEmail({
      email: user.email,
      displayName: user.displayName ?? '',
      code,
    });

    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Get remaining attempts (returns MAX_ATTEMPTS since tracking not yet implemented)
    const remainingAttempts =
      (await this.verificationService.getRemainingAttempts(user.email)) ?? 5;

    this.logger.log(`Verification email resent for user: ${user.id}`);

    return {
      message: 'Verification email sent successfully',
      email: user.email,
      remainingAttempts,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
