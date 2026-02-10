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
import { UsersService } from '../users/users.service.js';
import { LoginDto, LoginResponseDto } from './dto/login.dto.js';
import { RefreshDto, RefreshResponseDto } from './dto/refresh.dto.js';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto.js';
import { AUTH_SERVICE, type IAuthService } from './auth.interface.js';
import { AgeVerificationService } from '../compliance/age-verification.service.js';
import { ParentalConsentService } from '../compliance/parental-consent.service.js';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: IAuthService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly ageVerificationService: AgeVerificationService,
    private readonly parentalConsentService: ParentalConsentService,
  ) {}

  @Post('register')
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

    // 3. If birthDate and country provided, verify age and update user record
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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.authenticateUser(loginDto.email, loginDto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshDto): Promise<RefreshResponseDto> {
    return this.authService.refreshAccessToken(refreshDto.refreshToken);
  }
}
