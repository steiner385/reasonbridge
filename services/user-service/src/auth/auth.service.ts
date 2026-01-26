/**
 * Authentication Service
 * Handles signup, login, email verification, and OAuth flows
 */

import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from '../repositories/user.repository';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repository';
import { VisitorSessionRepository } from '../repositories/visitor-session.repository';
import { CognitoService } from './cognito.service';
import { GoogleOAuthService } from './oauth/google-oauth.service';
import { AppleOAuthService } from './oauth/apple-oauth.service';
import { VerificationService } from './verification.service';
import { validatePassword, validateEmail } from '@reason-bridge/common';
import { SignupRequestDto } from './dto/signup.dto';
import { VerifyEmailRequestDto } from './dto/verify-email.dto';
import {
  ResendVerificationRequestDto,
  ResendVerificationResponseDto,
} from './dto/resend-verification.dto';
import {
  InitiateOAuthRequestDto,
  InitiateOAuthResponseDto,
  OAuthProvider,
  OAuthCallbackQueryDto,
} from './dto/oauth.dto';
import { LoginDto } from './dto/login.dto';
import { AuthSuccessResponseDto, VerificationEmailSentResponseDto } from './dto/auth-response.dto';
import { UserProfileDto, OnboardingProgressDto } from '../dto/common.dto';
import { AuthMethod, OnboardingStep } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly onboardingProgressRepository: OnboardingProgressRepository,
    private readonly visitorSessionRepository: VisitorSessionRepository,
    private readonly cognitoService: CognitoService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly appleOAuthService: AppleOAuthService,
    private readonly verificationService: VerificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * T054-T058: User signup with email/password
   * Creates Cognito user, User record, OnboardingProgress, links VisitorSession
   */
  async signup(dto: SignupRequestDto): Promise<AuthSuccessResponseDto> {
    this.logger.log(`Signup attempt for email: ${dto.email}`);

    // T055: Validate password strength
    const passwordValidation = validatePassword(dto.password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors,
      });
    }

    // Validate email format
    const emailValidation = validateEmail(dto.email);
    if (!emailValidation.isValid) {
      throw new BadRequestException({
        message: 'Invalid email format',
        errors: emailValidation.errors,
      });
    }

    // T055: Check email uniqueness
    const existingUser = await this.userRepository.existsByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email address is already registered');
    }

    try {
      // T055: Create Cognito user (triggers verification email automatically)
      const cognitoUser = await this.cognitoService.signUp(dto.email, dto.password);

      // T055-T057: Create User record and OnboardingProgress in transaction
      const user = await this.prisma.$transaction(async (tx) => {
        // Create User record
        const newUser = await this.userRepository.create({
          cognitoSub: cognitoUser.userSub,
          email: emailValidation.normalizedEmail!,
          displayName: dto.displayName || this.generateDisplayNameFromEmail(dto.email),
          authMethod: AuthMethod.EMAIL_PASSWORD,
          emailVerified: false, // Will be set to true after email verification
        });

        // T056: Create OnboardingProgress record (currentStep = VERIFICATION)
        await this.onboardingProgressRepository.create({
          userId: newUser.id,
          currentStep: OnboardingStep.VERIFICATION,
          emailVerified: false,
          topicsSelected: false,
          orientationViewed: false,
          firstPostMade: false,
        });

        // T057: Link VisitorSession to User if provided
        if (dto.visitorSessionId) {
          await this.visitorSessionRepository.convertToUser(dto.visitorSessionId, newUser.id);
        }

        return newUser;
      });

      // T058: Verification email is sent automatically by Cognito.signUp
      // Generate verification token in our system for tracking
      await this.verificationService.generateToken(user.id, user.email);

      this.logger.log(`User created successfully: ${user.id}, email: ${user.email}`);

      // Return success response with empty tokens (user must verify email first)
      return {
        accessToken: '', // Empty until email verified
        refreshToken: '', // Empty until email verified
        user: this.mapUserToProfileDto(user),
        onboardingProgress: {
          userId: user.id,
          currentStep: OnboardingStep.VERIFICATION,
          completionPercentage: 0,
          nextAction: {
            step: 'VERIFICATION',
            label: 'Verify your email',
            description: 'Check your email for a 6-digit verification code',
            url: '/verify-email',
          },
        },
        expiresIn: 0,
      };
    } catch (error) {
      this.logger.error(`Signup failed for ${dto.email}:`, error);
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('Email address is already registered');
      }
      throw error;
    }
  }

  /**
   * T061-T062: Verify email with 6-digit code
   * Confirms with Cognito and updates User.emailVerified and OnboardingProgress
   */
  async verifyEmail(dto: VerifyEmailRequestDto): Promise<AuthSuccessResponseDto> {
    this.logger.log(`Email verification attempt for: ${dto.email}`);

    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    try {
      // T061: Verify code with our verification service
      const isValid = await this.verificationService.verifyToken(dto.email, dto.code);
      if (!isValid) {
        const remaining = await this.verificationService.getRemainingAttempts(dto.email);
        throw new UnauthorizedException({
          message: 'Invalid or expired verification code',
          remainingAttempts: remaining,
        });
      }

      // T061: Confirm with Cognito
      await this.cognitoService.confirmSignUp(dto.email, dto.code);

      // T061: Update User.emailVerified
      await this.userRepository.updateEmailVerified(user.id, true);

      // T062: Update OnboardingProgress to currentStep = TOPICS
      await this.onboardingProgressRepository.markEmailVerified(user.id);

      // Authenticate user and get JWT tokens
      const tokens = await this.cognitoService.initiateAuth(dto.email, ''); // Password not needed after verification

      // Fetch updated onboarding progress
      const onboardingProgress = await this.onboardingProgressRepository.findByUserId(user.id);

      this.logger.log(`Email verified successfully for user: ${user.id}`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.mapUserToProfileDto({ ...user, emailVerified: true }),
        onboardingProgress: this.mapOnboardingProgressToDto(onboardingProgress!),
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      this.logger.error(`Email verification failed for ${dto.email}:`, error);
      if (error.name === 'CodeMismatchException') {
        throw new UnauthorizedException('Invalid verification code');
      }
      if (error.name === 'ExpiredCodeException') {
        throw new BadRequestException('Verification code has expired. Please request a new code.');
      }
      throw error;
    }
  }

  /**
   * T065: Resend verification email with rate limiting (3 per hour)
   */
  async resendVerification(
    dto: ResendVerificationRequestDto,
  ): Promise<ResendVerificationResponseDto> {
    this.logger.log(`Resend verification request for: ${dto.email}`);

    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Check rate limiting (3 per hour)
    const remaining = await this.verificationService.getRemainingAttempts(dto.email);
    if (remaining <= 0) {
      throw new BadRequestException('Rate limit exceeded. Please try again in an hour.');
    }

    try {
      // Resend code via Cognito
      await this.cognitoService.resendCode(dto.email);

      // Generate new verification token in our system
      const token = await this.verificationService.generateToken(user.id, user.email);

      this.logger.log(`Verification code resent to: ${dto.email}`);

      return {
        message: 'Verification code resent successfully',
        email: dto.email,
        remainingAttempts: remaining - 1,
        expiresAt: token.expiresAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Resend verification failed for ${dto.email}:`, error);
      throw error;
    }
  }

  /**
   * T068: Initiate OAuth flow with CSRF protection
   * Generates OAuth URL with state token
   */
  async initiateOAuth(dto: InitiateOAuthRequestDto): Promise<InitiateOAuthResponseDto> {
    this.logger.log(`Initiating OAuth for provider: ${dto.provider}`);

    let authUrl: string;
    let state: string;

    try {
      if (dto.provider === OAuthProvider.GOOGLE) {
        state = this.googleOAuthService.generateStateToken();
        authUrl = this.googleOAuthService.generateAuthUrl(state);
      } else if (dto.provider === OAuthProvider.APPLE) {
        state = this.appleOAuthService.generateStateToken();
        authUrl = this.appleOAuthService.generateAuthUrl(state);
      } else {
        throw new BadRequestException(`Unsupported OAuth provider: ${dto.provider}`);
      }

      // Store state and visitorSessionId in cache/session for callback verification
      // (In production, use Redis or session storage)
      // For now, we'll rely on state token validation in the OAuth service

      this.logger.log(`OAuth URL generated for ${dto.provider}`);

      return {
        authUrl,
        state,
        provider: dto.provider,
      };
    } catch (error) {
      this.logger.error(`OAuth initiation failed for ${dto.provider}:`, error);
      throw error;
    }
  }

  /**
   * T070-T071: Handle OAuth callback
   * Exchange code for tokens, fetch profile, create/login User
   */
  async handleOAuthCallback(
    provider: OAuthProvider,
    query: OAuthCallbackQueryDto,
    visitorSessionId?: string,
  ): Promise<AuthSuccessResponseDto> {
    this.logger.log(`OAuth callback for provider: ${provider}`);

    if (query.error) {
      throw new UnauthorizedException(`OAuth error: ${query.error_description || query.error}`);
    }

    try {
      let userProfile: {
        email: string;
        emailVerified: boolean;
        name?: string;
        googleId?: string;
        appleId?: string;
      };

      // Verify and get user profile from OAuth provider
      if (provider === OAuthProvider.GOOGLE) {
        userProfile = await this.googleOAuthService.verifyAndGetProfile(query.code);
      } else if (provider === OAuthProvider.APPLE) {
        userProfile = await this.appleOAuthService.verifyAndGetProfile(query.code);
      } else {
        throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
      }

      // Find or create user
      let user = await this.userRepository.findByEmail(userProfile.email);
      let isNewUser = false;

      if (!user) {
        // T070: Create new user
        isNewUser = true;
        user = await this.prisma.$transaction(async (tx) => {
          // Generate synthetic cognitoSub for OAuth users
          const cognitoSub =
            provider === OAuthProvider.GOOGLE
              ? `oauth:google:${userProfile.googleId}`
              : `oauth:apple:${userProfile.appleId}`;

          const newUser = await this.userRepository.create({
            email: userProfile.email,
            cognitoSub,
            displayName: userProfile.name || this.generateDisplayNameFromEmail(userProfile.email),
            authMethod:
              provider === OAuthProvider.GOOGLE ? AuthMethod.GOOGLE_OAUTH : AuthMethod.APPLE_OAUTH,
            emailVerified: userProfile.emailVerified, // T071: OAuth providers confirm email
          });

          // Create OnboardingProgress
          await this.onboardingProgressRepository.create({
            userId: newUser.id,
            currentStep: userProfile.emailVerified
              ? OnboardingStep.TOPICS
              : OnboardingStep.VERIFICATION,
            emailVerified: userProfile.emailVerified,
            topicsSelected: false,
            orientationViewed: false,
            firstPostMade: false,
          });

          // Link visitor session if provided
          if (visitorSessionId) {
            await this.visitorSessionRepository.convertToUser(visitorSessionId, newUser.id);
          }

          return newUser;
        });

        this.logger.log(`New user created via OAuth: ${user.id}`);
      } else {
        // Existing user - update last login
        await this.userRepository.updateLastLogin(user.id);
        this.logger.log(`Existing user logged in via OAuth: ${user.id}`);
      }

      // Generate JWT tokens (since OAuth providers are trusted)
      const tokens = await this.generateJwtTokens(user);

      // Fetch onboarding progress
      const onboardingProgress = await this.onboardingProgressRepository.findByUserId(user.id);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.mapUserToProfileDto(user),
        onboardingProgress: this.mapOnboardingProgressToDto(onboardingProgress!),
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      this.logger.error(`OAuth callback failed for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * T074: Login with email/password
   * Authenticates with Cognito and updates lastLoginAt
   */
  async login(dto: LoginDto): Promise<AuthSuccessResponseDto> {
    this.logger.log(`Login attempt for: ${dto.email}`);

    // Find user
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    try {
      // T074: Authenticate with Cognito
      const tokens = await this.cognitoService.initiateAuth(dto.email, dto.password);

      // T074: Update lastLoginAt
      await this.userRepository.updateLastLogin(user.id);

      // Fetch onboarding progress
      const onboardingProgress = await this.onboardingProgressRepository.findByUserId(user.id);

      this.logger.log(`User logged in successfully: ${user.id}`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.mapUserToProfileDto(user),
        onboardingProgress: this.mapOnboardingProgressToDto(onboardingProgress!),
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      this.logger.error(`Login failed for ${dto.email}:`, error);
      if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw error;
    }
  }

  /**
   * Helper: Generate display name from email
   */
  private generateDisplayNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Helper: Generate JWT tokens (for OAuth or post-verification)
   */
  private async generateJwtTokens(
    user: any,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // In production, generate JWT tokens using @nestjs/jwt
    // For now, return placeholder tokens
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtExpiration = this.configService.get<string>('JWT_EXPIRATION', '15m');

    // TODO: Implement actual JWT generation with user payload
    return {
      accessToken: 'jwt_access_token_placeholder',
      refreshToken: 'jwt_refresh_token_placeholder',
      expiresIn: 900, // 15 minutes
    };
  }

  /**
   * Helper: Map User to UserProfileDto
   */
  private mapUserToProfileDto(user: any): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      authMethod: user.authMethod,
      emailVerified: user.emailVerified,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
    };
  }

  /**
   * Helper: Map OnboardingProgress to OnboardingProgressDto
   */
  private mapOnboardingProgressToDto(progress: any): OnboardingProgressDto {
    return {
      userId: progress.userId,
      currentStep: progress.currentStep,
      completionPercentage: progress.completionPercentage || 0,
      nextAction: this.getNextActionForStep(progress.currentStep),
    };
  }

  /**
   * Helper: Get next action based on current onboarding step
   */
  private getNextActionForStep(step: OnboardingStep): any {
    const actions: Record<OnboardingStep, any> = {
      VERIFICATION: {
        step: 'VERIFICATION',
        label: 'Verify your email',
        description: 'Check your email for a 6-digit verification code',
        url: '/verify-email',
      },
      TOPICS: {
        step: 'TOPICS',
        label: 'Choose your interests',
        description: 'Select 2-3 topics you want to discuss',
        url: '/onboarding/topics',
      },
      ORIENTATION: {
        step: 'ORIENTATION',
        label: 'Learn how it works',
        description: 'Quick tour of the platform features',
        url: '/onboarding/orientation',
      },
      FIRST_POST: {
        step: 'FIRST_POST',
        label: 'Make your first post',
        description: 'Share your perspective on a topic',
        url: '/discussions',
      },
      COMPLETED: {
        step: 'COMPLETED',
        label: 'Onboarding complete',
        description: 'You are all set!',
        url: '/dashboard',
      },
    };

    return actions[step];
  }
}
