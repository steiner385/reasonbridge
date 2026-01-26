import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersController } from './users.controller.js';

const createMockUsersService = () => ({
  findByCognitoSub: vi.fn(),
  updateProfile: vi.fn(),
});

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: ReturnType<typeof createMockUsersService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersService = createMockUsersService();
    controller = new UsersController(mockUsersService as any);
  });

  describe('getCurrentUser', () => {
    it('should return current user profile', async () => {
      const jwtPayload = { sub: 'cognito-sub-123', email: 'user@example.com' };
      const user = {
        id: 'user-1',
        cognitoSub: 'cognito-sub-123',
        email: 'user@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
      };
      mockUsersService.findByCognitoSub.mockResolvedValue(user);

      const result = await controller.getCurrentUser(jwtPayload as any);

      expect(result).toBeDefined();
      expect(mockUsersService.findByCognitoSub).toHaveBeenCalledWith('cognito-sub-123');
    });

    it('should use sub from JWT payload', async () => {
      const jwtPayload = { sub: 'test-sub-456' };
      mockUsersService.findByCognitoSub.mockResolvedValue({
        id: 'user-1',
        cognitoSub: 'test-sub-456',
      });

      await controller.getCurrentUser(jwtPayload as any);

      expect(mockUsersService.findByCognitoSub).toHaveBeenCalledWith('test-sub-456');
    });

    it('should propagate error when user not found', async () => {
      const jwtPayload = { sub: 'non-existent' };
      mockUsersService.findByCognitoSub.mockRejectedValue(new Error('User not found'));

      await expect(controller.getCurrentUser(jwtPayload as any)).rejects.toThrow('User not found');
    });
  });

  describe('updateCurrentUser', () => {
    it('should update user profile', async () => {
      const jwtPayload = { sub: 'cognito-sub-123' };
      const updateProfileDto = { displayName: 'Updated Name', bio: 'New bio' };
      const updatedUser = {
        id: 'user-1',
        cognitoSub: 'cognito-sub-123',
        displayName: 'Updated Name',
        bio: 'New bio',
        updatedAt: new Date(),
      };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateCurrentUser(jwtPayload as any, updateProfileDto as any);

      expect(result).toBeDefined();
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'cognito-sub-123',
        updateProfileDto,
      );
    });

    it('should pass update data to service', async () => {
      const jwtPayload = { sub: 'sub-123' };
      const updateProfileDto = { displayName: 'New Name' };
      mockUsersService.updateProfile.mockResolvedValue({ id: 'user-1' });

      await controller.updateCurrentUser(jwtPayload as any, updateProfileDto as any);

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith('sub-123', updateProfileDto);
    });

    it('should handle partial update', async () => {
      const jwtPayload = { sub: 'sub-123' };
      const updateProfileDto = { bio: 'Only updating bio' };
      mockUsersService.updateProfile.mockResolvedValue({
        id: 'user-1',
        bio: 'Only updating bio',
      });

      const result = await controller.updateCurrentUser(jwtPayload as any, updateProfileDto as any);

      expect(result).toBeDefined();
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith('sub-123', {
        bio: 'Only updating bio',
      });
    });

    it('should propagate validation error', async () => {
      const jwtPayload = { sub: 'sub-123' };
      const updateProfileDto = { displayName: '' };
      mockUsersService.updateProfile.mockRejectedValue(new Error('Display name cannot be empty'));

      await expect(
        controller.updateCurrentUser(jwtPayload as any, updateProfileDto as any),
      ).rejects.toThrow('Display name cannot be empty');
    });
  });
});
