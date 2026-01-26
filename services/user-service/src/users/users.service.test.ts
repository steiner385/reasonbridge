import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { NotFoundException } from '@nestjs/common';

const createMockPrismaService = () => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
});

const createMockBotDetectorService = () => ({
  detectNewAccountBotPatterns: vi.fn(),
});

const createMockUser = (overrides = {}) => ({
  id: 'user-123',
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
      expect(result.id).toBe('user-123');
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

      const result = await service.findById('user-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result.id).toBe('user-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
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

      const result = await service.checkAndHandleBotPatterns('user-123');

      expect(mockBotDetector.detectNewAccountBotPatterns).toHaveBeenCalledWith('user-123');
      expect(result.isSuspicious).toBe(false);
      expect(result.riskScore).toBe(0.2);
    });

    it('should log and return detection result for suspicious user', async () => {
      const detectionResult = {
        isSuspicious: true,
        riskScore: 0.8,
        patterns: ['rapid_posting', 'topic_concentration'],
        reasoning: ['Very rapid posting detected', 'Unusually narrow topic focus'],
      };
      mockBotDetector.detectNewAccountBotPatterns.mockResolvedValue(detectionResult);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await service.checkAndHandleBotPatterns('user-123');

      expect(result.isSuspicious).toBe(true);
      expect(result.riskScore).toBe(0.8);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
