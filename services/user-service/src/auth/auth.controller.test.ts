import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller.js';

const createMockCognitoService = () => ({
  authenticateUser: vi.fn(),
  refreshAccessToken: vi.fn(),
});

describe('AuthController', () => {
  let controller: AuthController;
  let mockCognitoService: ReturnType<typeof createMockCognitoService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCognitoService = createMockCognitoService();
    controller = new AuthController(mockCognitoService as any);
  });

  describe('login', () => {
    it('should authenticate user and return tokens', async () => {
      const loginDto = { email: 'user@example.com', password: 'password123' };
      const expectedResponse = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        idToken: 'id-token-789',
        expiresIn: 3600,
      };
      mockCognitoService.authenticateUser.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto as any);

      expect(result).toEqual(expectedResponse);
      expect(mockCognitoService.authenticateUser).toHaveBeenCalledWith(
        'user@example.com',
        'password123',
      );
    });

    it('should pass credentials to cognito service', async () => {
      const loginDto = { email: 'test@test.com', password: 'securepass' };
      mockCognitoService.authenticateUser.mockResolvedValue({ accessToken: 'token' });

      await controller.login(loginDto as any);

      expect(mockCognitoService.authenticateUser).toHaveBeenCalledWith(
        'test@test.com',
        'securepass',
      );
    });

    it('should propagate authentication error', async () => {
      const loginDto = { email: 'user@example.com', password: 'wrongpassword' };
      mockCognitoService.authenticateUser.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto as any)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const refreshDto = { refreshToken: 'refresh-token-123' };
      const expectedResponse = {
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
        expiresIn: 3600,
      };
      mockCognitoService.refreshAccessToken.mockResolvedValue(expectedResponse);

      const result = await controller.refresh(refreshDto as any);

      expect(result).toEqual(expectedResponse);
      expect(mockCognitoService.refreshAccessToken).toHaveBeenCalledWith('refresh-token-123');
    });

    it('should propagate refresh token error', async () => {
      const refreshDto = { refreshToken: 'invalid-refresh-token' };
      mockCognitoService.refreshAccessToken.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(controller.refresh(refreshDto as any)).rejects.toThrow('Invalid refresh token');
    });

    it('should handle expired refresh token', async () => {
      const refreshDto = { refreshToken: 'expired-token' };
      mockCognitoService.refreshAccessToken.mockRejectedValue(new Error('Refresh token expired'));

      await expect(controller.refresh(refreshDto as any)).rejects.toThrow('Refresh token expired');
    });
  });
});
