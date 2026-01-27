import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { CognitoService } from '../../src/auth/cognito.service.js';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Mock AWS SDK
vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const mockSend = vi.fn();
  return {
    CognitoIdentityProviderClient: vi.fn(() => ({
      send: mockSend,
    })),
    SignUpCommand: vi.fn(),
    ConfirmSignUpCommand: vi.fn(),
    InitiateAuthCommand: vi.fn(),
    ResendConfirmationCodeCommand: vi.fn(),
  };
});

describe('Cognito Integration Tests', () => {
  let cognitoService: CognitoService;
  let mockCognitoClient: any;
  let mockSend: any;

  // Test configuration
  const testConfig = {
    COGNITO_USER_POOL_ID: 'us-east-1_TestPool',
    COGNITO_CLIENT_ID: 'test-client-id-123',
    COGNITO_REGION: 'us-east-1',
  };

  // Mock ConfigService
  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: any) => {
      return testConfig[key as keyof typeof testConfig] || defaultValue;
    }),
    getOrThrow: vi.fn((key: string) => {
      const value = testConfig[key as keyof typeof testConfig];
      if (!value) {
        throw new Error(`Configuration key ${key} not found`);
      }
      return value;
    }),
  };

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Get the mocked send function
    mockSend = vi.fn();
    (CognitoIdentityProviderClient as any).mockImplementation(() => ({
      send: mockSend,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CognitoService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    cognitoService = module.get<CognitoService>(CognitoService);
    mockCognitoClient = { send: mockSend };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== SIGNUP FLOW TESTS ====================

  describe('signUp', () => {
    const testEmail = 'integration-test@example.com';
    const testPassword = 'TestPass123!@#';

    it('should successfully sign up a new user', async () => {
      // Arrange
      const mockResponse = {
        UserSub: 'test-user-sub-123',
        CodeDeliveryDetails: {
          Destination: 't***@example.com',
          DeliveryMedium: 'EMAIL',
          AttributeName: 'email',
        },
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await cognitoService.signUp(testEmail, testPassword);

      // Assert
      expect(result).toBeDefined();
      expect(result.userSub).toBe('test-user-sub-123');
      expect(result.codeDeliveryDetails).toBeDefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(SignUpCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ClientId: testConfig.COGNITO_CLIENT_ID,
          Username: testEmail,
          Password: testPassword,
          UserAttributes: expect.arrayContaining([
            expect.objectContaining({
              Name: 'email',
              Value: testEmail,
            }),
          ]),
        }),
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange
      const error: any = new Error('User already exists');
      error.name = 'UsernameExistsException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.signUp(testEmail, testPassword)).rejects.toThrow(
        ConflictException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid password', async () => {
      // Arrange
      const error: any = new Error('Password does not meet requirements');
      error.name = 'InvalidPasswordException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.signUp(testEmail, 'weak')).rejects.toThrow(BadRequestException);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid parameters', async () => {
      // Arrange
      const error: any = new Error('Invalid parameter');
      error.name = 'InvalidParameterException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.signUp('', testPassword)).rejects.toThrow(BadRequestException);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limiting errors', async () => {
      // Arrange
      const error: any = new Error('Too many requests');
      error.name = 'TooManyRequestsException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.signUp(testEmail, testPassword)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle limit exceeded errors', async () => {
      // Arrange
      const error: any = new Error('Limit exceeded');
      error.name = 'LimitExceededException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.signUp(testEmail, testPassword)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== EMAIL VERIFICATION FLOW TESTS ====================

  describe('confirmSignUp', () => {
    const testEmail = 'integration-test@example.com';
    const testCode = '123456';

    it('should successfully confirm signup with valid code', async () => {
      // Arrange
      const mockResponse = {};
      mockSend.mockResolvedValue(mockResponse);

      // Act
      await cognitoService.confirmSignUp(testEmail, testCode);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(ConfirmSignUpCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ClientId: testConfig.COGNITO_CLIENT_ID,
          Username: testEmail,
          ConfirmationCode: testCode,
        }),
      );
    });

    it('should throw BadRequestException for invalid code', async () => {
      // Arrange
      const error: any = new Error('Code mismatch');
      error.name = 'CodeMismatchException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.confirmSignUp(testEmail, testCode)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for expired code', async () => {
      // Arrange
      const error: any = new Error('Code expired');
      error.name = 'ExpiredCodeException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.confirmSignUp(testEmail, testCode)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const error: any = new Error('User not found');
      error.name = 'UserNotFoundException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.confirmSignUp(testEmail, testCode)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle too many failed attempts', async () => {
      // Arrange
      const error: any = new Error('Too many attempts');
      error.name = 'TooManyRequestsException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.confirmSignUp(testEmail, testCode)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== RESEND VERIFICATION CODE TESTS ====================

  describe('resendCode', () => {
    const testEmail = 'integration-test@example.com';

    it('should successfully resend verification code', async () => {
      // Arrange
      const mockResponse = {
        CodeDeliveryDetails: {
          Destination: 't***@example.com',
          DeliveryMedium: 'EMAIL',
          AttributeName: 'email',
        },
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await cognitoService.resendCode(testEmail);

      // Assert
      expect(result).toBeDefined();
      expect(result.codeDeliveryDetails).toBeDefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(ResendConfirmationCodeCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ClientId: testConfig.COGNITO_CLIENT_ID,
          Username: testEmail,
        }),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const error: any = new Error('User not found');
      error.name = 'UserNotFoundException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.resendCode(testEmail)).rejects.toThrow(UnauthorizedException);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limiting on resend', async () => {
      // Arrange
      const error: any = new Error('Too many requests');
      error.name = 'TooManyRequestsException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.resendCode(testEmail)).rejects.toThrow(BadRequestException);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle limit exceeded on resend', async () => {
      // Arrange
      const error: any = new Error('Limit exceeded');
      error.name = 'LimitExceededException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.resendCode(testEmail)).rejects.toThrow(BadRequestException);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== AUTHENTICATION FLOW TESTS ====================

  describe('authenticateUser', () => {
    const testEmail = 'integration-test@example.com';
    const testPassword = 'TestPass123!@#';

    it('should successfully authenticate user with valid credentials', async () => {
      // Arrange
      const mockResponse = {
        AuthenticationResult: {
          AccessToken: 'mock-access-token',
          IdToken: 'mock-id-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await cognitoService.authenticateUser(testEmail, testPassword);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.idToken).toBe('mock-id-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(InitiateAuthCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: testConfig.COGNITO_CLIENT_ID,
          AuthParameters: {
            USERNAME: testEmail,
            PASSWORD: testPassword,
          },
        }),
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Arrange
      const error: any = new Error('Invalid credentials');
      error.name = 'NotAuthorizedException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.authenticateUser(testEmail, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const error: any = new Error('User not found');
      error.name = 'UserNotFoundException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.authenticateUser(testEmail, testPassword)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException if email not confirmed', async () => {
      // Arrange
      const error: any = new Error('User not confirmed');
      error.name = 'UserNotConfirmedException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.authenticateUser(testEmail, testPassword)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle missing authentication result', async () => {
      // Arrange
      const mockResponse = {
        AuthenticationResult: null,
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(cognitoService.authenticateUser(testEmail, testPassword)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== INITIATE AUTH FLOW TESTS ====================

  describe('initiateAuth', () => {
    const testEmail = 'integration-test@example.com';
    const testPassword = 'TestPass123!@#';

    it('should successfully initiate auth and return tokens', async () => {
      // Arrange
      const mockResponse = {
        AuthenticationResult: {
          AccessToken: 'mock-access-token',
          IdToken: 'mock-id-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await cognitoService.initiateAuth(testEmail, testPassword);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.idToken).toBe('mock-id-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.expiresIn).toBe(3600);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication failures', async () => {
      // Arrange
      const error: any = new Error('Authentication failed');
      error.name = 'NotAuthorizedException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.initiateAuth(testEmail, testPassword)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== TOKEN REFRESH FLOW TESTS ====================

  describe('refreshAccessToken', () => {
    const testRefreshToken = 'mock-refresh-token';

    it('should successfully refresh access token', async () => {
      // Arrange
      const mockResponse = {
        AuthenticationResult: {
          AccessToken: 'new-access-token',
          IdToken: 'new-id-token',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await cognitoService.refreshAccessToken(testRefreshToken);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.idToken).toBe('new-id-token');
      expect(result.expiresIn).toBe(3600);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(InitiateAuthCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: testConfig.COGNITO_CLIENT_ID,
          AuthParameters: {
            REFRESH_TOKEN: testRefreshToken,
          },
        }),
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const error: any = new Error('Invalid refresh token');
      error.name = 'NotAuthorizedException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.refreshAccessToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle missing authentication result on refresh', async () => {
      // Arrange
      const mockResponse = {
        AuthenticationResult: null,
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(cognitoService.refreshAccessToken(testRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== COMPLETE FLOW INTEGRATION TESTS ====================

  describe('complete authentication flow', () => {
    const testEmail = 'flow-test@example.com';
    const testPassword = 'FlowTest123!@#';
    const testCode = '654321';

    it('should complete full signup, verification, and login flow', async () => {
      // Step 1: Sign up
      const signupResponse = {
        UserSub: 'flow-user-sub-123',
        CodeDeliveryDetails: {
          Destination: 'f***@example.com',
          DeliveryMedium: 'EMAIL',
        },
      };
      mockSend.mockResolvedValueOnce(signupResponse);

      const signupResult = await cognitoService.signUp(testEmail, testPassword);
      expect(signupResult.userSub).toBe('flow-user-sub-123');
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Step 2: Confirm signup
      mockSend.mockResolvedValueOnce({});
      await cognitoService.confirmSignUp(testEmail, testCode);
      expect(mockSend).toHaveBeenCalledTimes(2);

      // Step 3: Login
      const authResponse = {
        AuthenticationResult: {
          AccessToken: 'flow-access-token',
          IdToken: 'flow-id-token',
          RefreshToken: 'flow-refresh-token',
          ExpiresIn: 3600,
        },
      };
      mockSend.mockResolvedValueOnce(authResponse);

      const loginResult = await cognitoService.authenticateUser(testEmail, testPassword);
      expect(loginResult.accessToken).toBe('flow-access-token');
      expect(mockSend).toHaveBeenCalledTimes(3);

      // Step 4: Refresh token
      const refreshResponse = {
        AuthenticationResult: {
          AccessToken: 'refreshed-access-token',
          IdToken: 'refreshed-id-token',
          ExpiresIn: 3600,
        },
      };
      mockSend.mockResolvedValueOnce(refreshResponse);

      const refreshResult = await cognitoService.refreshAccessToken(loginResult.refreshToken);
      expect(refreshResult.accessToken).toBe('refreshed-access-token');
      expect(mockSend).toHaveBeenCalledTimes(4);
    });

    it('should handle signup with existing user and login instead', async () => {
      // Attempt signup with existing user
      const error: any = new Error('User exists');
      error.name = 'UsernameExistsException';
      mockSend.mockRejectedValueOnce(error);

      await expect(cognitoService.signUp(testEmail, testPassword)).rejects.toThrow(
        ConflictException,
      );

      // Login instead
      const authResponse = {
        AuthenticationResult: {
          AccessToken: 'existing-user-access-token',
          IdToken: 'existing-user-id-token',
          RefreshToken: 'existing-user-refresh-token',
          ExpiresIn: 3600,
        },
      };
      mockSend.mockResolvedValueOnce(authResponse);

      const loginResult = await cognitoService.authenticateUser(testEmail, testPassword);
      expect(loginResult.accessToken).toBe('existing-user-access-token');
    });

    it('should handle verification code expiration and resend', async () => {
      // Step 1: Sign up
      const signupResponse = {
        UserSub: 'resend-user-sub-123',
        CodeDeliveryDetails: {},
      };
      mockSend.mockResolvedValueOnce(signupResponse);
      await cognitoService.signUp(testEmail, testPassword);

      // Step 2: Try to confirm with expired code
      const expiredError: any = new Error('Code expired');
      expiredError.name = 'ExpiredCodeException';
      mockSend.mockRejectedValueOnce(expiredError);

      await expect(cognitoService.confirmSignUp(testEmail, testCode)).rejects.toThrow(
        BadRequestException,
      );

      // Step 3: Resend code
      const resendResponse = {
        CodeDeliveryDetails: {
          Destination: 'f***@example.com',
          DeliveryMedium: 'EMAIL',
        },
      };
      mockSend.mockResolvedValueOnce(resendResponse);

      const resendResult = await cognitoService.resendCode(testEmail);
      expect(resendResult.codeDeliveryDetails).toBeDefined();

      // Step 4: Confirm with new code
      mockSend.mockResolvedValueOnce({});
      await cognitoService.confirmSignUp(testEmail, '789012');
      expect(mockSend).toHaveBeenCalled();
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe('error handling', () => {
    it('should handle unexpected Cognito errors gracefully', async () => {
      // Arrange
      const error: any = new Error('Unknown error');
      error.name = 'UnknownException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.signUp('test@example.com', 'Pass123!@#')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should provide helpful error messages for common failures', async () => {
      // Test various error scenarios
      const errorScenarios = [
        { name: 'InvalidPasswordException', expectedError: BadRequestException },
        { name: 'CodeMismatchException', expectedError: BadRequestException },
        { name: 'ExpiredCodeException', expectedError: BadRequestException },
        { name: 'NotAuthorizedException', expectedError: UnauthorizedException },
        { name: 'UserNotFoundException', expectedError: UnauthorizedException },
        { name: 'TooManyRequestsException', expectedError: BadRequestException },
      ];

      for (const scenario of errorScenarios) {
        const error: any = new Error(scenario.name);
        error.name = scenario.name;
        mockSend.mockRejectedValueOnce(error);

        await expect(cognitoService.signUp('test@example.com', 'Pass123!@#')).rejects.toThrow(
          scenario.expectedError,
        );
      }
    });

    it('should handle network timeouts', async () => {
      // Arrange
      const error: any = new Error('Network timeout');
      error.name = 'NetworkingError';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(cognitoService.signUp('test@example.com', 'Pass123!@#')).rejects.toThrow();
    });
  });

  // ==================== EDGE CASES ====================

  describe('edge cases', () => {
    it('should handle empty authentication result', async () => {
      // Arrange
      const mockResponse = {
        AuthenticationResult: undefined,
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        cognitoService.authenticateUser('test@example.com', 'Pass123!@#'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle partial authentication result', async () => {
      // Arrange
      const mockResponse = {
        AuthenticationResult: {
          AccessToken: 'access-token',
          // Missing other required fields
        },
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        cognitoService.authenticateUser('test@example.com', 'Pass123!@#'),
      ).rejects.toThrow();
    });

    it('should handle null code delivery details', async () => {
      // Arrange
      const mockResponse = {
        UserSub: 'user-sub-123',
        CodeDeliveryDetails: null,
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await cognitoService.signUp('test@example.com', 'Pass123!@#');

      // Assert
      expect(result.userSub).toBe('user-sub-123');
      expect(result.codeDeliveryDetails).toBeNull();
    });

    it('should handle very long email addresses', async () => {
      // Arrange
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const mockResponse = {
        UserSub: 'long-email-user-sub',
        CodeDeliveryDetails: {},
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await cognitoService.signUp(longEmail, 'Pass123!@#');

      // Assert
      expect(result.userSub).toBe('long-email-user-sub');
    });

    it('should handle special characters in password', async () => {
      // Arrange
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';
      const mockResponse = {
        UserSub: 'special-pass-user-sub',
        CodeDeliveryDetails: {},
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await cognitoService.signUp('test@example.com', specialPassword);

      // Assert
      expect(result.userSub).toBe('special-pass-user-sub');
    });
  });

  // ==================== CONCURRENT OPERATIONS TESTS ====================

  describe('concurrent operations', () => {
    it('should handle multiple simultaneous signup requests', async () => {
      // Arrange
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      mockSend.mockImplementation((command) => {
        return Promise.resolve({
          UserSub: `user-sub-${Math.random()}`,
          CodeDeliveryDetails: {},
        });
      });

      // Act
      const results = await Promise.all(
        emails.map((email) => cognitoService.signUp(email, 'Pass123!@#')),
      );

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.userSub).toBeDefined();
      });
    });

    it('should handle simultaneous auth attempts for same user', async () => {
      // Arrange
      const mockResponse = {
        AuthenticationResult: {
          AccessToken: 'access-token',
          IdToken: 'id-token',
          RefreshToken: 'refresh-token',
          ExpiresIn: 3600,
        },
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const results = await Promise.all([
        cognitoService.authenticateUser('test@example.com', 'Pass123!@#'),
        cognitoService.authenticateUser('test@example.com', 'Pass123!@#'),
      ]);

      // Assert
      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.accessToken).toBe('access-token');
      });
    });
  });

  // ==================== OAUTH TOKEN EXCHANGE TESTS ====================

  describe('OAuth token exchange', () => {
    it('should handle OAuth authentication flow', async () => {
      // Arrange
      const mockResponse = {
        AuthenticationResult: {
          AccessToken: 'oauth-access-token',
          IdToken: 'oauth-id-token',
          RefreshToken: 'oauth-refresh-token',
          ExpiresIn: 3600,
        },
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await cognitoService.authenticateUser(
        'oauth@example.com',
        'oauth-temp-password',
      );

      // Assert
      expect(result.accessToken).toBe('oauth-access-token');
      expect(result.refreshToken).toBe('oauth-refresh-token');
    });
  });
});
