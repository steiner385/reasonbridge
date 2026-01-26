import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repository.js';
import { VisitorSessionRepository } from '../repositories/visitor-session.repository.js';
import { CognitoService } from '../auth/cognito.service.js';
import { GoogleOAuthService } from '../auth/oauth/google-oauth.service.js';
import { AppleOAuthService } from '../auth/oauth/apple-oauth.service.js';
import { VerificationService } from '../auth/verification.service.js';
import { OAuthProvider } from '../auth/dto/oauth.dto.js';

// Mock Prisma enums for tests (avoid importing from @prisma/client directly)
const AuthMethod = {
  EMAIL_PASSWORD: 'EMAIL_PASSWORD',
  GOOGLE_OAUTH: 'GOOGLE_OAUTH',
  APPLE_OAUTH: 'APPLE_OAUTH',
} as const;

const AccountStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;

const OnboardingStep = {
  VERIFICATION: 'VERIFICATION',
  TOPICS: 'TOPICS',
  ORIENTATION: 'ORIENTATION',
  FIRST_POST: 'FIRST_POST',
  COMPLETED: 'COMPLETED',
} as const;

describe('AuthService - Unit Tests', () => {
  let authService: AuthService;
  let userRepository: UserRepository;
  let onboardingProgressRepository: OnboardingProgressRepository;
  let visitorSessionRepository: VisitorSessionRepository;
  let cognitoService: CognitoService;
  let googleOAuthService: GoogleOAuthService;
  let appleOAuthService: AppleOAuthService;
  let verificationService: VerificationService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  // Mock data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    cognitoSub: 'cognito-sub-123',
    authMethod: AuthMethod.EMAIL_PASSWORD,
    emailVerified: false,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    lastLoginAt: null,
    passwordHash: null,
    profilePhotoUrl: null,
    bio: null,
    trustScore: 0,
    botProbability: 0,
    videoVerified: false,
    videoVerifiedAt: null,
    humanVerificationScore: null,
  };

  const mockOnboardingProgress = {
    id: 'onboarding-123',
    userId: 'user-123',
    currentStep: OnboardingStep.VERIFICATION,
    emailVerified: false,
    topicsSelected: false,
    orientationViewed: false,
    firstPostMade: false,
    completedAt: null,
    completionPercentage: 0,
    lastUpdatedAt: new Date(),
  };

  const mockCognitoTokens = {
    accessToken: 'mock-access-token',
    idToken: 'mock-id-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  // Mock services
  const mockUserRepository = {
    create: vi.fn(),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn(),
    updateEmailVerified: vi.fn(),
    updateLastLogin: vi.fn(),
  };

  const mockOnboardingProgressRepository = {
    create: vi.fn(),
    findByUserId: vi.fn(),
    markEmailVerified: vi.fn(),
  };

  const mockVisitorSessionRepository = {
    convertToUser: vi.fn(),
  };

  const mockCognitoService = {
    signUp: vi.fn(),
    confirmSignUp: vi.fn(),
    resendCode: vi.fn(),
    initiateAuth: vi.fn(),
  };

  const mockGoogleOAuthService = {
    generateAuthUrl: vi.fn(),
    generateStateToken: vi.fn(),
    verifyAndGetProfile: vi.fn(),
  };

  const mockAppleOAuthService = {
    generateAuthUrl: vi.fn(),
    generateStateToken: vi.fn(),
    verifyAndGetProfile: vi.fn(),
  };

  const mockVerificationService = {
    generateToken: vi.fn(),
    verifyToken: vi.fn(),
    getRemainingAttempts: vi.fn(),
  };

  const mockPrismaService = {
    $transaction: vi.fn((callback) => callback(mockPrismaService)),
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        JWT_SECRET: 'test-jwt-secret',
        JWT_EXPIRATION: '15m',
      };
      return config[key] || defaultValue;
    }),
    getOrThrow: vi.fn((key: string) => {
      const config: Record<string, any> = {
        COGNITO_USER_POOL_ID: 'test-pool-id',
        COGNITO_CLIENT_ID: 'test-client-id',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: OnboardingProgressRepository, useValue: mockOnboardingProgressRepository },
        { provide: VisitorSessionRepository, useValue: mockVisitorSessionRepository },
        { provide: CognitoService, useValue: mockCognitoService },
        { provide: GoogleOAuthService, useValue: mockGoogleOAuthService },
        { provide: AppleOAuthService, useValue: mockAppleOAuthService },
        { provide: VerificationService, useValue: mockVerificationService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    onboardingProgressRepository = module.get<OnboardingProgressRepository>(OnboardingProgressRepository);
    visitorSessionRepository = module.get<VisitorSessionRepository>(VisitorSessionRepository);
    cognitoService = module.get<CognitoService>(CognitoService);
    googleOAuthService = module.get<GoogleOAuthService>(GoogleOAuthService);
    appleOAuthService = module.get<AppleOAuthService>(AppleOAuthService);
    verificationService = module.get<VerificationService>(VerificationService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== SIGNUP TESTS (T054-T058) ====================

  describe('signup', () => {
    const signupDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!@#',
      displayName: 'New User',
      visitorSessionId: 'visitor-session-123',
    };

    it('should successfully create a new user with valid data', async () => {
      // Arrange
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockCognitoService.signUp.mockResolvedValue({
        userSub: 'cognito-sub-456',
        codeDeliveryDetails: {},
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        id: 'user-456',
        email: signupDto.email,
        displayName: signupDto.displayName,
        cognitoSub: 'cognito-sub-456',
      });
      mockOnboardingProgressRepository.create.mockResolvedValue(mockOnboardingProgress);
      mockVisitorSessionRepository.convertToUser.mockResolvedValue(undefined);
      mockVerificationService.generateToken.mockResolvedValue({
        token: '123456',
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Act
      const result = await authService.signup(signupDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(''); // Empty until email verified
      expect(result.refreshToken).toBe('');
      expect(result.user.email).toBe(signupDto.email);
      expect(result.onboardingProgress.currentStep).toBe(OnboardingStep.VERIFICATION);
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(signupDto.email);
      expect(mockCognitoService.signUp).toHaveBeenCalledWith(signupDto.email, signupDto.password);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockOnboardingProgressRepository.create).toHaveBeenCalled();
      expect(mockVisitorSessionRepository.convertToUser).toHaveBeenCalledWith(signupDto.visitorSessionId, 'user-456');
    });

    it('should throw BadRequestException for weak password', async () => {
      // Arrange
      const weakPasswordDto = { ...signupDto, password: '123' };

      // Act & Assert
      await expect(authService.signup(weakPasswordDto)).rejects.toThrow(BadRequestException);
      expect(mockUserRepository.existsByEmail).not.toHaveBeenCalled();
      expect(mockCognitoService.signUp).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid email format', async () => {
      // Arrange
      const invalidEmailDto = { ...signupDto, email: 'invalid-email' };

      // Act & Assert
      await expect(authService.signup(invalidEmailDto)).rejects.toThrow(BadRequestException);
      expect(mockUserRepository.existsByEmail).not.toHaveBeenCalled();
      expect(mockCognitoService.signUp).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      // Act & Assert
      await expect(authService.signup(signupDto)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(signupDto.email);
      expect(mockCognitoService.signUp).not.toHaveBeenCalled();
    });

    it('should handle Cognito UsernameExistsException', async () => {
      // Arrange
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      const cognitoError = new Error('User exists');
      cognitoError.name = 'UsernameExistsException';
      mockCognitoService.signUp.mockRejectedValue(cognitoError);

      // Act & Assert
      await expect(authService.signup(signupDto)).rejects.toThrow(ConflictException);
      expect(mockCognitoService.signUp).toHaveBeenCalled();
    });

    it('should create user without visitorSessionId if not provided', async () => {
      // Arrange
      const dtoWithoutSession = { ...signupDto, visitorSessionId: undefined };
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockCognitoService.signUp.mockResolvedValue({
        userSub: 'cognito-sub-456',
        codeDeliveryDetails: {},
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: dtoWithoutSession.email,
      });
      mockOnboardingProgressRepository.create.mockResolvedValue(mockOnboardingProgress);
      mockVerificationService.generateToken.mockResolvedValue({
        token: '123456',
        expiresAt: new Date(),
      });

      // Act
      await authService.signup(dtoWithoutSession);

      // Assert
      expect(mockVisitorSessionRepository.convertToUser).not.toHaveBeenCalled();
    });

    it('should generate display name from email if not provided', async () => {
      // Arrange
      const dtoWithoutDisplayName = { ...signupDto, displayName: undefined };
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockCognitoService.signUp.mockResolvedValue({
        userSub: 'cognito-sub-456',
        codeDeliveryDetails: {},
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        displayName: 'Newuser',
      });
      mockOnboardingProgressRepository.create.mockResolvedValue(mockOnboardingProgress);
      mockVerificationService.generateToken.mockResolvedValue({
        token: '123456',
        expiresAt: new Date(),
      });

      // Act
      await authService.signup(dtoWithoutDisplayName);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: expect.any(String),
        })
      );
    });

    it('should set onboarding step to VERIFICATION', async () => {
      // Arrange
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockCognitoService.signUp.mockResolvedValue({
        userSub: 'cognito-sub-456',
        codeDeliveryDetails: {},
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: signupDto.email,
      });
      mockOnboardingProgressRepository.create.mockResolvedValue(mockOnboardingProgress);
      mockVerificationService.generateToken.mockResolvedValue({
        token: '123456',
        expiresAt: new Date(),
      });

      // Act
      const result = await authService.signup(signupDto);

      // Assert
      expect(mockOnboardingProgressRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStep: OnboardingStep.VERIFICATION,
          emailVerified: false,
        })
      );
      expect(result.onboardingProgress.currentStep).toBe(OnboardingStep.VERIFICATION);
    });
  });

  // ==================== EMAIL VERIFICATION TESTS (T061-T062) ====================

  describe('verifyEmail', () => {
    const verifyEmailDto = {
      email: 'test@example.com',
      code: '123456',
    };

    it('should successfully verify email with valid code', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockVerificationService.verifyToken.mockResolvedValue('user-123');
      mockCognitoService.confirmSignUp.mockResolvedValue(undefined);
      mockUserRepository.updateEmailVerified.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });
      mockOnboardingProgressRepository.markEmailVerified.mockResolvedValue(undefined);
      mockCognitoService.initiateAuth.mockResolvedValue(mockCognitoTokens);
      mockOnboardingProgressRepository.findByUserId.mockResolvedValue({
        ...mockOnboardingProgress,
        currentStep: OnboardingStep.TOPICS,
        emailVerified: true,
      });

      // Act
      const result = await authService.verifyEmail(verifyEmailDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockCognitoTokens.accessToken);
      expect(result.refreshToken).toBe(mockCognitoTokens.refreshToken);
      expect(result.user.emailVerified).toBe(true);
      expect(result.onboardingProgress.currentStep).toBe(OnboardingStep.TOPICS);
      expect(mockVerificationService.verifyToken).toHaveBeenCalledWith(verifyEmailDto.email, verifyEmailDto.code);
      expect(mockCognitoService.confirmSignUp).toHaveBeenCalledWith(verifyEmailDto.email, verifyEmailDto.code);
      expect(mockUserRepository.updateEmailVerified).toHaveBeenCalledWith('user-123', true);
      expect(mockOnboardingProgressRepository.markEmailVerified).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.verifyEmail(verifyEmailDto)).rejects.toThrow(NotFoundException);
      expect(mockVerificationService.verifyToken).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already verified', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      // Act & Assert
      await expect(authService.verifyEmail(verifyEmailDto)).rejects.toThrow(BadRequestException);
      expect(mockVerificationService.verifyToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid code', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockVerificationService.verifyToken.mockResolvedValue(false);
      mockVerificationService.getRemainingAttempts.mockResolvedValue(4);

      // Act & Assert
      await expect(authService.verifyEmail(verifyEmailDto)).rejects.toThrow(UnauthorizedException);
      expect(mockVerificationService.verifyToken).toHaveBeenCalled();
      expect(mockCognitoService.confirmSignUp).not.toHaveBeenCalled();
    });

    it('should handle CodeMismatchException from Cognito', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockVerificationService.verifyToken.mockResolvedValue('user-123');
      const cognitoError = new Error('Code mismatch');
      cognitoError.name = 'CodeMismatchException';
      mockCognitoService.confirmSignUp.mockRejectedValue(cognitoError);

      // Act & Assert
      await expect(authService.verifyEmail(verifyEmailDto)).rejects.toThrow(UnauthorizedException);
      expect(mockCognitoService.confirmSignUp).toHaveBeenCalled();
    });

    it('should handle ExpiredCodeException from Cognito', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockVerificationService.verifyToken.mockResolvedValue('user-123');
      const cognitoError = new Error('Code expired');
      cognitoError.name = 'ExpiredCodeException';
      mockCognitoService.confirmSignUp.mockRejectedValue(cognitoError);

      // Act & Assert
      await expect(authService.verifyEmail(verifyEmailDto)).rejects.toThrow(BadRequestException);
      expect(mockCognitoService.confirmSignUp).toHaveBeenCalled();
    });
  });

  // ==================== RESEND VERIFICATION TESTS (T065) ====================

  describe('resendVerification', () => {
    const resendDto = {
      email: 'test@example.com',
    };

    it('should successfully resend verification code', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockVerificationService.getRemainingAttempts.mockResolvedValue(2);
      mockCognitoService.resendCode.mockResolvedValue({
        codeDeliveryDetails: {},
      });
      mockVerificationService.generateToken.mockResolvedValue({
        token: '654321',
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Act
      const result = await authService.resendVerification(resendDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.message).toBe('Verification code resent successfully');
      expect(result.email).toBe(resendDto.email);
      expect(result.remainingAttempts).toBe(1);
      expect(mockCognitoService.resendCode).toHaveBeenCalledWith(resendDto.email);
      expect(mockVerificationService.generateToken).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.resendVerification(resendDto)).rejects.toThrow(NotFoundException);
      expect(mockCognitoService.resendCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already verified', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      // Act & Assert
      await expect(authService.resendVerification(resendDto)).rejects.toThrow(BadRequestException);
      expect(mockCognitoService.resendCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if rate limit exceeded', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockVerificationService.getRemainingAttempts.mockResolvedValue(0);

      // Act & Assert
      await expect(authService.resendVerification(resendDto)).rejects.toThrow(BadRequestException);
      expect(mockCognitoService.resendCode).not.toHaveBeenCalled();
    });
  });

  // ==================== OAUTH INITIATION TESTS (T068) ====================

  describe('initiateOAuth', () => {
    it('should successfully initiate Google OAuth', async () => {
      // Arrange
      const dto = { provider: OAuthProvider.GOOGLE, visitorSessionId: 'visitor-123' };
      mockGoogleOAuthService.generateStateToken.mockReturnValue('state-token-google');
      mockGoogleOAuthService.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize?...');

      // Act
      const result = await authService.initiateOAuth(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.authUrl).toBe('https://accounts.google.com/oauth/authorize?...');
      expect(result.state).toBe('state-token-google');
      expect(result.provider).toBe(OAuthProvider.GOOGLE);
      expect(mockGoogleOAuthService.generateStateToken).toHaveBeenCalled();
      expect(mockGoogleOAuthService.generateAuthUrl).toHaveBeenCalledWith('state-token-google');
    });

    it('should successfully initiate Apple OAuth', async () => {
      // Arrange
      const dto = { provider: OAuthProvider.APPLE, visitorSessionId: 'visitor-123' };
      mockAppleOAuthService.generateStateToken.mockReturnValue('state-token-apple');
      mockAppleOAuthService.generateAuthUrl.mockReturnValue('https://appleid.apple.com/auth/authorize?...');

      // Act
      const result = await authService.initiateOAuth(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.authUrl).toBe('https://appleid.apple.com/auth/authorize?...');
      expect(result.state).toBe('state-token-apple');
      expect(result.provider).toBe(OAuthProvider.APPLE);
      expect(mockAppleOAuthService.generateStateToken).toHaveBeenCalled();
      expect(mockAppleOAuthService.generateAuthUrl).toHaveBeenCalledWith('state-token-apple');
    });

    it('should throw BadRequestException for unsupported provider', async () => {
      // Arrange
      const dto = { provider: 'FACEBOOK' as any, visitorSessionId: 'visitor-123' };

      // Act & Assert
      await expect(authService.initiateOAuth(dto)).rejects.toThrow(BadRequestException);
      expect(mockGoogleOAuthService.generateStateToken).not.toHaveBeenCalled();
      expect(mockAppleOAuthService.generateStateToken).not.toHaveBeenCalled();
    });
  });

  // ==================== OAUTH CALLBACK TESTS (T070-T071) ====================

  describe('handleOAuthCallback', () => {
    const callbackQuery = {
      code: 'oauth-code-123',
      state: 'state-token',
    };

    it('should successfully handle Google OAuth callback for new user', async () => {
      // Arrange
      const googleProfile = {
        email: 'google@example.com',
        emailVerified: true,
        name: 'Google User',
        picture: 'https://example.com/photo.jpg',
        googleId: 'google-id-123',
      };
      mockGoogleOAuthService.verifyAndGetProfile.mockResolvedValue(googleProfile);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: googleProfile.email,
        displayName: googleProfile.name,
        authMethod: AuthMethod.GOOGLE_OAUTH,
        emailVerified: true,
      });
      mockOnboardingProgressRepository.create.mockResolvedValue({
        ...mockOnboardingProgress,
        currentStep: OnboardingStep.TOPICS,
        emailVerified: true,
      });
      mockOnboardingProgressRepository.findByUserId.mockResolvedValue({
        ...mockOnboardingProgress,
        currentStep: OnboardingStep.TOPICS,
        emailVerified: true,
      });

      // Act
      const result = await authService.handleOAuthCallback(OAuthProvider.GOOGLE, callbackQuery, 'visitor-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe(googleProfile.email);
      expect(result.user.authMethod).toBe(AuthMethod.GOOGLE_OAUTH);
      expect(result.onboardingProgress.currentStep).toBe(OnboardingStep.TOPICS);
      expect(mockGoogleOAuthService.verifyAndGetProfile).toHaveBeenCalledWith(callbackQuery.code);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockOnboardingProgressRepository.create).toHaveBeenCalled();
      expect(mockVisitorSessionRepository.convertToUser).toHaveBeenCalled();
    });

    it('should successfully handle Apple OAuth callback for new user', async () => {
      // Arrange
      const appleProfile = {
        email: 'apple@example.com',
        emailVerified: true,
        name: 'Apple User',
        appleId: 'apple-id-123',
      };
      mockAppleOAuthService.verifyAndGetProfile.mockResolvedValue(appleProfile);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: appleProfile.email,
        displayName: appleProfile.name,
        authMethod: AuthMethod.APPLE_OAUTH,
        emailVerified: true,
      });
      mockOnboardingProgressRepository.create.mockResolvedValue({
        ...mockOnboardingProgress,
        currentStep: OnboardingStep.TOPICS,
        emailVerified: true,
      });
      mockOnboardingProgressRepository.findByUserId.mockResolvedValue({
        ...mockOnboardingProgress,
        currentStep: OnboardingStep.TOPICS,
        emailVerified: true,
      });

      // Act
      const result = await authService.handleOAuthCallback(OAuthProvider.APPLE, callbackQuery);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe(appleProfile.email);
      expect(result.user.authMethod).toBe(AuthMethod.APPLE_OAUTH);
      expect(mockAppleOAuthService.verifyAndGetProfile).toHaveBeenCalledWith(callbackQuery.code);
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should successfully handle OAuth callback for existing user', async () => {
      // Arrange
      const googleProfile = {
        email: 'existing@example.com',
        emailVerified: true,
        name: 'Existing User',
        googleId: 'google-id-456',
      };
      const existingUser = {
        ...mockUser,
        email: googleProfile.email,
        emailVerified: true,
      };
      mockGoogleOAuthService.verifyAndGetProfile.mockResolvedValue(googleProfile);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockUserRepository.updateLastLogin.mockResolvedValue(existingUser);
      mockOnboardingProgressRepository.findByUserId.mockResolvedValue(mockOnboardingProgress);

      // Act
      const result = await authService.handleOAuthCallback(OAuthProvider.GOOGLE, callbackQuery);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe(googleProfile.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(existingUser.id);
    });

    it('should throw UnauthorizedException if OAuth error occurs', async () => {
      // Arrange
      const errorQuery = {
        error: 'access_denied',
        error_description: 'User denied access',
        state: 'state-token',
      };

      // Act & Assert
      await expect(
        authService.handleOAuthCallback(OAuthProvider.GOOGLE, errorQuery as any)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockGoogleOAuthService.verifyAndGetProfile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for unsupported provider', async () => {
      // Arrange & Act & Assert
      await expect(
        authService.handleOAuthCallback('FACEBOOK' as any, callbackQuery)
      ).rejects.toThrow(BadRequestException);
    });

    it('should set onboarding step to VERIFICATION if email not verified by OAuth provider', async () => {
      // Arrange
      const googleProfile = {
        email: 'unverified@example.com',
        emailVerified: false,
        name: 'Unverified User',
        googleId: 'google-id-789',
      };
      mockGoogleOAuthService.verifyAndGetProfile.mockResolvedValue(googleProfile);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: googleProfile.email,
        emailVerified: false,
      });
      mockOnboardingProgressRepository.create.mockResolvedValue({
        ...mockOnboardingProgress,
        currentStep: OnboardingStep.VERIFICATION,
        emailVerified: false,
      });
      mockOnboardingProgressRepository.findByUserId.mockResolvedValue({
        ...mockOnboardingProgress,
        currentStep: OnboardingStep.VERIFICATION,
        emailVerified: false,
      });

      // Act
      const result = await authService.handleOAuthCallback(OAuthProvider.GOOGLE, callbackQuery);

      // Assert
      expect(result.onboardingProgress.currentStep).toBe(OnboardingStep.VERIFICATION);
      expect(mockOnboardingProgressRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStep: OnboardingStep.VERIFICATION,
          emailVerified: false,
        })
      );
    });
  });

  // ==================== LOGIN TESTS (T074) ====================

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!@#',
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      const verifiedUser = { ...mockUser, emailVerified: true };
      mockUserRepository.findByEmail.mockResolvedValue(verifiedUser);
      mockCognitoService.initiateAuth.mockResolvedValue(mockCognitoTokens);
      mockUserRepository.updateLastLogin.mockResolvedValue(verifiedUser);
      mockOnboardingProgressRepository.findByUserId.mockResolvedValue(mockOnboardingProgress);

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockCognitoTokens.accessToken);
      expect(result.refreshToken).toBe(mockCognitoTokens.refreshToken);
      expect(result.user.email).toBe(loginDto.email);
      expect(mockCognitoService.initiateAuth).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(verifiedUser.id);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockCognitoService.initiateAuth).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockCognitoService.initiateAuth).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Arrange
      const verifiedUser = { ...mockUser, emailVerified: true };
      mockUserRepository.findByEmail.mockResolvedValue(verifiedUser);
      const cognitoError = new Error('Invalid credentials');
      cognitoError.name = 'NotAuthorizedException';
      mockCognitoService.initiateAuth.mockRejectedValue(cognitoError);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockCognitoService.initiateAuth).toHaveBeenCalled();
    });

    it('should handle UserNotFoundException from Cognito', async () => {
      // Arrange
      const verifiedUser = { ...mockUser, emailVerified: true };
      mockUserRepository.findByEmail.mockResolvedValue(verifiedUser);
      const cognitoError = new Error('User not found');
      cognitoError.name = 'UserNotFoundException';
      mockCognitoService.initiateAuth.mockRejectedValue(cognitoError);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockCognitoService.initiateAuth).toHaveBeenCalled();
    });

    it('should update lastLoginAt on successful login', async () => {
      // Arrange
      const verifiedUser = { ...mockUser, emailVerified: true };
      mockUserRepository.findByEmail.mockResolvedValue(verifiedUser);
      mockCognitoService.initiateAuth.mockResolvedValue(mockCognitoTokens);
      mockUserRepository.updateLastLogin.mockResolvedValue({
        ...verifiedUser,
        lastLoginAt: new Date(),
      });
      mockOnboardingProgressRepository.findByUserId.mockResolvedValue(mockOnboardingProgress);

      // Act
      await authService.login(loginDto);

      // Assert
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(verifiedUser.id);
    });
  });

  // ==================== ERROR SCENARIO TESTS ====================

  describe('error scenarios', () => {
    it('should handle database connection errors during signup', async () => {
      // Arrange
      const signupDto = {
        email: 'test@example.com',
        password: 'SecurePass123!@#',
        displayName: 'Test User',
      };
      mockUserRepository.existsByEmail.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(authService.signup(signupDto)).rejects.toThrow();
    });

    it('should handle transaction rollback on user creation failure', async () => {
      // Arrange
      const signupDto = {
        email: 'test@example.com',
        password: 'SecurePass123!@#',
        displayName: 'Test User',
      };
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockCognitoService.signUp.mockResolvedValue({
        userSub: 'cognito-sub-123',
        codeDeliveryDetails: {},
      });
      mockPrismaService.$transaction.mockRejectedValue(new Error('Transaction failed'));

      // Act & Assert
      await expect(authService.signup(signupDto)).rejects.toThrow();
    });

    it('should handle network errors during OAuth verification', async () => {
      // Arrange
      const callbackQuery = {
        code: 'oauth-code-123',
        state: 'state-token',
      };
      mockGoogleOAuthService.verifyAndGetProfile.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        authService.handleOAuthCallback(OAuthProvider.GOOGLE, callbackQuery)
      ).rejects.toThrow();
    });
  });

  // ==================== EDGE CASES ====================

  describe('edge cases', () => {
    it('should handle email with different casing', async () => {
      // Arrange
      const signupDto = {
        email: 'Test@EXAMPLE.COM',
        password: 'SecurePass123!@#',
        displayName: 'Test User',
      };
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockCognitoService.signUp.mockResolvedValue({
        userSub: 'cognito-sub-123',
        codeDeliveryDetails: {},
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: 'test@example.com', // Normalized
      });
      mockOnboardingProgressRepository.create.mockResolvedValue(mockOnboardingProgress);
      mockVerificationService.generateToken.mockResolvedValue({
        token: '123456',
        expiresAt: new Date(),
      });

      // Act
      await authService.signup(signupDto);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.stringMatching(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/),
        })
      );
    });

    it('should handle OAuth callback without visitor session', async () => {
      // Arrange
      const callbackQuery = {
        code: 'oauth-code-123',
        state: 'state-token',
      };
      const googleProfile = {
        email: 'google@example.com',
        emailVerified: true,
        name: 'Google User',
        googleId: 'google-id-123',
      };
      mockGoogleOAuthService.verifyAndGetProfile.mockResolvedValue(googleProfile);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: googleProfile.email,
      });
      mockOnboardingProgressRepository.create.mockResolvedValue(mockOnboardingProgress);
      mockOnboardingProgressRepository.findByUserId.mockResolvedValue(mockOnboardingProgress);

      // Act
      await authService.handleOAuthCallback(OAuthProvider.GOOGLE, callbackQuery);

      // Assert
      expect(mockVisitorSessionRepository.convertToUser).not.toHaveBeenCalled();
    });

    it('should handle display name generation for email with special characters', async () => {
      // Arrange
      const signupDto = {
        email: 'test.user_name-test@example.com',
        password: 'SecurePass123!@#',
      };
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockCognitoService.signUp.mockResolvedValue({
        userSub: 'cognito-sub-123',
        codeDeliveryDetails: {},
      });
      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        displayName: 'Test User Name Test',
      });
      mockOnboardingProgressRepository.create.mockResolvedValue(mockOnboardingProgress);
      mockVerificationService.generateToken.mockResolvedValue({
        token: '123456',
        expiresAt: new Date(),
      });

      // Act
      await authService.signup(signupDto);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: expect.any(String),
        })
      );
    });
  });
});
