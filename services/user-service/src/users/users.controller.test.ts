import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersController } from './users.controller.js';

const createMockUsersService = () => ({
  findById: vi.fn(),
  updateProfileById: vi.fn(),
});

const createMockFeedbackPreferencesService = () => ({
  getPreferencesById: vi.fn(),
  updatePreferences: vi.fn(),
});

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: ReturnType<typeof createMockUsersService>;
  let mockFeedbackService: ReturnType<typeof createMockFeedbackPreferencesService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersService = createMockUsersService();
    mockFeedbackService = createMockFeedbackPreferencesService();
    controller = new UsersController(mockUsersService as any, mockFeedbackService as any);
  });

  describe('getCurrentUser', () => {
    it('should return current user profile', async () => {
      // JWT sub now contains user.id (UUID)
      const userId = '12345678-1234-4234-a234-123456789012';
      const jwtPayload = { sub: userId, email: 'user@example.com' };
      const user = {
        id: userId,
        cognitoSub: 'cognito-sub-123',
        email: 'user@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
      };
      mockUsersService.findById.mockResolvedValue(user);

      const result = await controller.getCurrentUser(jwtPayload as any);

      expect(result).toBeDefined();
      expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
    });

    it('should use sub from JWT payload', async () => {
      const userId = '87654321-4321-4321-a321-210987654321';
      const jwtPayload = { sub: userId };
      mockUsersService.findById.mockResolvedValue({
        id: userId,
        cognitoSub: 'cognito-sub-456',
      });

      await controller.getCurrentUser(jwtPayload as any);

      expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
    });

    it('should propagate error when user not found', async () => {
      const userId = '99999999-9999-4999-a999-999999999999';
      const jwtPayload = { sub: userId };
      mockUsersService.findById.mockRejectedValue(new Error('User not found'));

      await expect(controller.getCurrentUser(jwtPayload as any)).rejects.toThrow('User not found');
    });
  });

  describe('updateCurrentUser', () => {
    const userId = '12345678-1234-4234-a234-123456789012';

    it('should update user profile', async () => {
      const jwtPayload = { sub: userId };
      const updateProfileDto = { displayName: 'Updated Name', bio: 'New bio' };
      const updatedUser = {
        id: userId,
        cognitoSub: 'cognito-sub-123',
        displayName: 'Updated Name',
        bio: 'New bio',
        updatedAt: new Date(),
      };
      mockUsersService.updateProfileById.mockResolvedValue(updatedUser);

      const result = await controller.updateCurrentUser(jwtPayload as any, updateProfileDto as any);

      expect(result).toBeDefined();
      expect(mockUsersService.updateProfileById).toHaveBeenCalledWith(userId, updateProfileDto);
    });

    it('should pass update data to service', async () => {
      const jwtPayload = { sub: userId };
      const updateProfileDto = { displayName: 'New Name' };
      mockUsersService.updateProfileById.mockResolvedValue({ id: userId });

      await controller.updateCurrentUser(jwtPayload as any, updateProfileDto as any);

      expect(mockUsersService.updateProfileById).toHaveBeenCalledWith(userId, updateProfileDto);
    });

    it('should handle partial update', async () => {
      const jwtPayload = { sub: userId };
      const updateProfileDto = { bio: 'Only updating bio' };
      mockUsersService.updateProfileById.mockResolvedValue({
        id: userId,
        bio: 'Only updating bio',
      });

      const result = await controller.updateCurrentUser(jwtPayload as any, updateProfileDto as any);

      expect(result).toBeDefined();
      expect(mockUsersService.updateProfileById).toHaveBeenCalledWith(userId, {
        bio: 'Only updating bio',
      });
    });

    it('should propagate validation error', async () => {
      const jwtPayload = { sub: userId };
      const updateProfileDto = { displayName: '' };
      mockUsersService.updateProfileById.mockRejectedValue(
        new Error('Display name cannot be empty'),
      );

      await expect(
        controller.updateCurrentUser(jwtPayload as any, updateProfileDto as any),
      ).rejects.toThrow('Display name cannot be empty');
    });
  });
});
