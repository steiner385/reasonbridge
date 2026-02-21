import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

const createMockPrismaService = () => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  userFollow: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
});

const createMockBotDetectorService = () => ({
  detectNewAccountBotPatterns: vi.fn(),
});

// Valid UUID v4 format for test user (variant bits 8-b in 4th segment)
const VALID_USER_ID = '11111111-1111-4111-a111-111111111111';

const createMockUser = (overrides = {}) => ({
  id: VALID_USER_ID,
  cognitoSub: 'cognito-sub-123',
  email: 'test@example.com',
  displayName: 'Test User',
  verificationLevel: 'BASIC',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockBotDetector: ReturnType<typeof createMockBotDetectorService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockBotDetector = createMockBotDetectorService();
    service = new UsersService(mockPrisma as any, mockBotDetector as any);
  });

  describe('findByCognitoSub', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByCognitoSub('cognito-sub-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { cognitoSub: 'cognito-sub-123' },
      });
      expect(result.id).toBe(VALID_USER_ID);
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findByCognitoSub('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(VALID_USER_ID);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: VALID_USER_ID },
      });
      expect(result.id).toBe(VALID_USER_ID);
    });

    it('should throw NotFoundException when user not found', async () => {
      const nonexistentId = '99999999-9999-4999-a999-999999999999';
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(nonexistentId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.findById('nonexistent')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockUser = createMockUser();
      const updatedUser = createMockUser({ displayName: 'Updated Name' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('cognito-sub-123', {
        displayName: 'Updated Name',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'cognito-sub-123' },
        data: { displayName: 'Updated Name' },
      });
      expect(result.displayName).toBe('Updated Name');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent', { displayName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('checkAndHandleBotPatterns', () => {
    it('should return detection result for non-suspicious user', async () => {
      const detectionResult = {
        isSuspicious: false,
        riskScore: 0.2,
        patterns: [],
        reasoning: ['Account age is reasonable'],
      };
      mockBotDetector.detectNewAccountBotPatterns.mockResolvedValue(detectionResult);

      const result = await service.checkAndHandleBotPatterns(VALID_USER_ID);

      expect(mockBotDetector.detectNewAccountBotPatterns).toHaveBeenCalledWith(VALID_USER_ID);
      expect(result.isSuspicious).toBe(false);
      expect(result.riskScore).toBe(0.2);
    });

    it('should return detection result for suspicious user', async () => {
      const detectionResult = {
        isSuspicious: true,
        riskScore: 0.8,
        patterns: ['rapid_posting', 'topic_concentration'],
        reasoning: ['Very rapid posting detected', 'Unusually narrow topic focus'],
      };
      mockBotDetector.detectNewAccountBotPatterns.mockResolvedValue(detectionResult);

      const result = await service.checkAndHandleBotPatterns(VALID_USER_ID);

      expect(result.isSuspicious).toBe(true);
      expect(result.riskScore).toBe(0.8);
      expect(result.patterns).toEqual(['rapid_posting', 'topic_concentration']);
      expect(result.reasoning).toHaveLength(2);
    });
  });

  describe('followUser', () => {
    const validFollowerId = '12345678-1234-4234-a234-123456789012';
    const validFollowedId = '87654321-4321-4321-a321-210987654321';

    it('should create follow relationship successfully', async () => {
      const mockFollow = {
        id: 'follow-123',
        followerId: validFollowerId,
        followedId: validFollowedId,
        createdAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue({ id: validFollowedId });
      mockPrisma.userFollow.findUnique.mockResolvedValue(null);
      mockPrisma.userFollow.create.mockResolvedValue(mockFollow);

      const result = await service.followUser(validFollowerId, validFollowedId);

      expect(mockPrisma.userFollow.create).toHaveBeenCalledWith({
        data: {
          followerId: validFollowerId,
          followedId: validFollowedId,
        },
      });
      expect(result.followerId).toBe(validFollowerId);
      expect(result.followedId).toBe(validFollowedId);
    });

    it('should throw BadRequestException when trying to follow yourself', async () => {
      await expect(service.followUser(validFollowerId, validFollowerId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.followUser(validFollowerId, validFollowerId)).rejects.toThrow(
        'Cannot follow yourself',
      );
    });

    it('should throw BadRequestException for invalid follower UUID', async () => {
      await expect(service.followUser('invalid-uuid', validFollowedId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid followed UUID', async () => {
      await expect(service.followUser(validFollowerId, 'invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when user to follow does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.followUser(validFollowerId, validFollowedId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when already following', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: validFollowedId });
      mockPrisma.userFollow.findUnique.mockResolvedValue({
        id: 'existing-follow',
        followerId: validFollowerId,
        followedId: validFollowedId,
      });

      await expect(service.followUser(validFollowerId, validFollowedId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.followUser(validFollowerId, validFollowedId)).rejects.toThrow(
        'Already following this user',
      );
    });
  });

  describe('unfollowUser', () => {
    const validFollowerId = '12345678-1234-4234-a234-123456789012';
    const validFollowedId = '87654321-4321-4321-a321-210987654321';

    it('should delete follow relationship successfully', async () => {
      mockPrisma.userFollow.findUnique.mockResolvedValue({
        id: 'follow-123',
        followerId: validFollowerId,
        followedId: validFollowedId,
      });
      mockPrisma.userFollow.delete.mockResolvedValue({});

      await service.unfollowUser(validFollowerId, validFollowedId);

      expect(mockPrisma.userFollow.delete).toHaveBeenCalledWith({
        where: {
          followerId_followedId: {
            followerId: validFollowerId,
            followedId: validFollowedId,
          },
        },
      });
    });

    it('should throw BadRequestException when trying to unfollow yourself', async () => {
      await expect(service.unfollowUser(validFollowerId, validFollowerId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when not following the user', async () => {
      mockPrisma.userFollow.findUnique.mockResolvedValue(null);

      await expect(service.unfollowUser(validFollowerId, validFollowedId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.unfollowUser(validFollowerId, validFollowedId)).rejects.toThrow(
        'Not following this user',
      );
    });
  });

  describe('isFollowing', () => {
    const validFollowerId = '12345678-1234-4234-a234-123456789012';
    const validFollowedId = '87654321-4321-4321-a321-210987654321';

    it('should return true when following', async () => {
      mockPrisma.userFollow.findUnique.mockResolvedValue({
        id: 'follow-123',
        followerId: validFollowerId,
        followedId: validFollowedId,
      });

      const result = await service.isFollowing(validFollowerId, validFollowedId);

      expect(result).toBe(true);
    });

    it('should return false when not following', async () => {
      mockPrisma.userFollow.findUnique.mockResolvedValue(null);

      const result = await service.isFollowing(validFollowerId, validFollowedId);

      expect(result).toBe(false);
    });

    it('should return false for invalid UUIDs', async () => {
      const result = await service.isFollowing('invalid', validFollowedId);

      expect(result).toBe(false);
      expect(mockPrisma.userFollow.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getFollowerCount', () => {
    const validUserId = '12345678-1234-4234-a234-123456789012';

    it('should return follower count', async () => {
      mockPrisma.userFollow.count.mockResolvedValue(42);

      const result = await service.getFollowerCount(validUserId);

      expect(mockPrisma.userFollow.count).toHaveBeenCalledWith({
        where: { followedId: validUserId },
      });
      expect(result).toBe(42);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.getFollowerCount('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFollowingCount', () => {
    const validUserId = '12345678-1234-4234-a234-123456789012';

    it('should return following count', async () => {
      mockPrisma.userFollow.count.mockResolvedValue(15);

      const result = await service.getFollowingCount(validUserId);

      expect(mockPrisma.userFollow.count).toHaveBeenCalledWith({
        where: { followerId: validUserId },
      });
      expect(result).toBe(15);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.getFollowingCount('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });
});
