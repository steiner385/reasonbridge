import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CognitoService } from './cognito.service.js';
import { UnauthorizedException } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Mock AWS SDK
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  InitiateAuthCommand: vi.fn(),
}));

const createMockConfigService = () => ({
  get: vi.fn((key: string, defaultValue?: string) => {
    const values: Record<string, string> = {
      AWS_REGION: 'us-east-1',
    };
    return values[key] ?? defaultValue ?? null;
  }),
  getOrThrow: vi.fn((key: string) => {
    const values: Record<string, string> = {
      COGNITO_USER_POOL_ID: 'test-pool-id',
      COGNITO_CLIENT_ID: 'test-client-id',
    };
    const value = values[key];
    if (!value) {
      throw new Error(`Config key ${key} not found`);
    }
    return value;
  }),
});

describe('CognitoService', () => {
  let service: CognitoService;
  let mockConfigService: ReturnType<typeof createMockConfigService>;
  let mockCognitoSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService = createMockConfigService();
    mockCognitoSend = vi.fn();
    (CognitoIdentityProviderClient as any).mockImplementation(() => ({
      send: mockCognitoSend,
    }));
    service = new CognitoService(mockConfigService as any);
  });

  describe('constructor', () => {
    it('should initialize with config values', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_REGION', 'us-east-1');
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('COGNITO_USER_POOL_ID');
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('COGNITO_CLIENT_ID');
    });

    it('should throw if required config is missing', () => {
      const badConfigService = {
        get: vi.fn(() => 'us-east-1'),
        getOrThrow: vi.fn(() => {
          throw new Error('Config not found');
        }),
      };

      expect(() => new CognitoService(badConfigService as any)).toThrow();
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user successfully', async () => {
      mockCognitoSend.mockResolvedValue({
        AuthenticationResult: {
          AccessToken: 'access-token-123',
          IdToken: 'id-token-123',
          RefreshToken: 'refresh-token-123',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      });

      const result = await service.authenticateUser('test@example.com', 'password123');

      expect(InitiateAuthCommand).toHaveBeenCalledWith({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: 'test-client-id',
        AuthParameters: {
          USERNAME: 'test@example.com',
          PASSWORD: 'password123',
        },
      });
      expect(result.accessToken).toBe('access-token-123');
      expect(result.idToken).toBe('id-token-123');
      expect(result.refreshToken).toBe('refresh-token-123');
      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
    });

    it('should use default token type if not provided', async () => {
      mockCognitoSend.mockResolvedValue({
        AuthenticationResult: {
          AccessToken: 'access-token',
          IdToken: 'id-token',
          RefreshToken: 'refresh-token',
          ExpiresIn: 3600,
          TokenType: undefined,
        },
      });

      const result = await service.authenticateUser('test@example.com', 'password');

      expect(result.tokenType).toBe('Bearer');
    });

    it('should throw UnauthorizedException when AuthenticationResult is missing', async () => {
      mockCognitoSend.mockResolvedValue({
        AuthenticationResult: null,
      });

      await expect(service.authenticateUser('test@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for NotAuthorizedException', async () => {
      const error = new Error('Cognito error');
      (error as any).name = 'NotAuthorizedException';
      mockCognitoSend.mockRejectedValue(error);

      await expect(service.authenticateUser('test@example.com', 'wrong-password')).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw UnauthorizedException for UserNotFoundException', async () => {
      const error = new Error('Cognito error');
      (error as any).name = 'UserNotFoundException';
      mockCognitoSend.mockRejectedValue(error);

      await expect(service.authenticateUser('nonexistent@example.com', 'password')).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw UnauthorizedException for UserNotConfirmedException', async () => {
      const error = new Error('Cognito error');
      (error as any).name = 'UserNotConfirmedException';
      mockCognitoSend.mockRejectedValue(error);

      await expect(service.authenticateUser('unverified@example.com', 'password')).rejects.toThrow(
        'Email not verified',
      );
    });

    it('should rethrow UnauthorizedException', async () => {
      const error = new UnauthorizedException('Already unauthorized');
      mockCognitoSend.mockRejectedValue(error);

      await expect(service.authenticateUser('test@example.com', 'password')).rejects.toThrow(
        'Already unauthorized',
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      mockCognitoSend.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.authenticateUser('test@example.com', 'password')).rejects.toThrow(
        'Authentication failed',
      );

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      mockCognitoSend.mockResolvedValue({
        AuthenticationResult: {
          AccessToken: 'new-access-token',
          IdToken: 'new-id-token',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      });

      const result = await service.refreshAccessToken('refresh-token-123');

      expect(InitiateAuthCommand).toHaveBeenCalledWith({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: 'test-client-id',
        AuthParameters: {
          REFRESH_TOKEN: 'refresh-token-123',
        },
      });
      expect(result.accessToken).toBe('new-access-token');
      expect(result.idToken).toBe('new-id-token');
      expect(result.expiresIn).toBe(3600);
    });

    it('should use default token type if not provided', async () => {
      mockCognitoSend.mockResolvedValue({
        AuthenticationResult: {
          AccessToken: 'new-access-token',
          IdToken: 'new-id-token',
          ExpiresIn: 3600,
          TokenType: undefined,
        },
      });

      const result = await service.refreshAccessToken('refresh-token');

      expect(result.tokenType).toBe('Bearer');
    });

    it('should throw UnauthorizedException when AuthenticationResult is missing', async () => {
      mockCognitoSend.mockResolvedValue({
        AuthenticationResult: null,
      });

      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(
        'Token refresh failed',
      );
    });

    it('should throw UnauthorizedException for NotAuthorizedException', async () => {
      const error = new Error('Cognito error');
      (error as any).name = 'NotAuthorizedException';
      mockCognitoSend.mockRejectedValue(error);

      await expect(service.refreshAccessToken('expired-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should rethrow UnauthorizedException', async () => {
      const error = new UnauthorizedException('Already unauthorized');
      mockCognitoSend.mockRejectedValue(error);

      await expect(service.refreshAccessToken('some-token')).rejects.toThrow(
        'Already unauthorized',
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      mockCognitoSend.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.refreshAccessToken('token')).rejects.toThrow('Token refresh failed');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
