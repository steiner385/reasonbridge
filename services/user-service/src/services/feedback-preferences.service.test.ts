// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FeedbackPreferencesService } from './feedback-preferences.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  FeedbackPreferencesDto,
  FeedbackSensitivity,
  UpdateFeedbackPreferencesDto,
} from '../users/dto/feedback-preferences.dto.js';

describe('FeedbackPreferencesService', () => {
  let service: FeedbackPreferencesService;

  const mockCognitoSub = 'test-cognito-sub-123';
  const mockUserId = 'user-uuid-123';
  const mockUpdatedAt = new Date('2026-01-31T00:00:00Z');

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Direct instantiation - bypasses NestJS DI issues with vitest
    service = new FeedbackPreferencesService(mockPrismaService);
  });

  describe('getPreferences', () => {
    it('should return default preferences when user has no stored preferences', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: null,
        updatedAt: mockUpdatedAt,
      });

      const result = await service.getPreferences(mockCognitoSub);

      expect(result.userId).toBe(mockUserId);
      expect(result.enabled).toBe(true);
      expect(result.sensitivity).toBe(FeedbackSensitivity.MEDIUM);
      expect(result.minConfidenceThreshold).toBe(0.7);
      expect(result.showEducationalResources).toBe(true);
      expect(result.autoDismissLowConfidence).toBe(false);
      expect(result.enabledTypes).toEqual({
        fallacy: true,
        inflammatory: true,
        unsourced: true,
        bias: true,
        affirmation: true,
      });
    });

    it('should return stored preferences when available', async () => {
      const storedPreferences = {
        enabled: false,
        sensitivity: 'low',
        minConfidenceThreshold: 0.9,
        showEducationalResources: false,
        autoDismissLowConfidence: true,
        enabledTypes: {
          fallacy: true,
          inflammatory: false,
          unsourced: true,
          bias: false,
          affirmation: true,
        },
      };

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: storedPreferences,
        updatedAt: mockUpdatedAt,
      });

      const result = await service.getPreferences(mockCognitoSub);

      expect(result.userId).toBe(mockUserId);
      expect(result.enabled).toBe(false);
      expect(result.sensitivity).toBe(FeedbackSensitivity.LOW);
      expect(result.minConfidenceThreshold).toBe(0.9);
      expect(result.showEducationalResources).toBe(false);
      expect(result.autoDismissLowConfidence).toBe(true);
      expect(result.enabledTypes.inflammatory).toBe(false);
      expect(result.enabledTypes.bias).toBe(false);
    });

    it('should throw NotFoundException when user not found', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getPreferences(mockCognitoSub)).rejects.toThrow(NotFoundException);
    });

    it('should handle partially stored preferences with defaults for missing fields', async () => {
      const partialPreferences = {
        enabled: false,
        // Missing other fields
      };

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: partialPreferences,
        updatedAt: mockUpdatedAt,
      });

      const result = await service.getPreferences(mockCognitoSub);

      expect(result.enabled).toBe(false);
      expect(result.sensitivity).toBe(FeedbackSensitivity.MEDIUM); // Default
      expect(result.minConfidenceThreshold).toBe(0.7); // Default
    });

    it('should handle invalid sensitivity value with default', async () => {
      const invalidPreferences = {
        enabled: true,
        sensitivity: 'invalid_value',
      };

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: invalidPreferences,
        updatedAt: mockUpdatedAt,
      });

      const result = await service.getPreferences(mockCognitoSub);

      expect(result.sensitivity).toBe(FeedbackSensitivity.MEDIUM); // Default fallback
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences and return merged result', async () => {
      const existingPreferences = {
        enabled: true,
        sensitivity: 'medium',
        minConfidenceThreshold: 0.7,
        showEducationalResources: true,
        autoDismissLowConfidence: false,
        enabledTypes: {
          fallacy: true,
          inflammatory: true,
          unsourced: true,
          bias: true,
          affirmation: true,
        },
      };

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: existingPreferences,
      });

      (mockPrismaService.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        updatedAt: mockUpdatedAt,
      });

      const updateDto: UpdateFeedbackPreferencesDto = {
        enabled: false,
        sensitivity: FeedbackSensitivity.HIGH,
      };

      const result = await service.updatePreferences(mockCognitoSub, updateDto);

      expect(result.enabled).toBe(false);
      expect(result.sensitivity).toBe(FeedbackSensitivity.HIGH);
      // Other fields should retain defaults
      expect(result.minConfidenceThreshold).toBe(0.7);
      expect(result.showEducationalResources).toBe(true);
    });

    it('should update enabledTypes partially', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: null,
      });

      (mockPrismaService.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        updatedAt: mockUpdatedAt,
      });

      const updateDto: UpdateFeedbackPreferencesDto = {
        enabledTypes: {
          fallacy: false,
          bias: false,
        },
      };

      const result = await service.updatePreferences(mockCognitoSub, updateDto);

      expect(result.enabledTypes.fallacy).toBe(false);
      expect(result.enabledTypes.bias).toBe(false);
      // Other types retain defaults
      expect(result.enabledTypes.inflammatory).toBe(true);
      expect(result.enabledTypes.unsourced).toBe(true);
      expect(result.enabledTypes.affirmation).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.updatePreferences(mockCognitoSub, { enabled: false })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should save updated preferences to database', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: null,
      });

      (mockPrismaService.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        updatedAt: mockUpdatedAt,
      });

      await service.updatePreferences(mockCognitoSub, { enabled: false });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { cognitoSub: mockCognitoSub },
        data: {
          feedbackPreferences: expect.objectContaining({
            enabled: false,
          }),
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('toggleFeedback', () => {
    it('should enable feedback', async () => {
      const existingPreferences = {
        enabled: false,
        sensitivity: 'medium',
        minConfidenceThreshold: 0.7,
        showEducationalResources: true,
        autoDismissLowConfidence: false,
        enabledTypes: {
          fallacy: true,
          inflammatory: true,
          unsourced: true,
          bias: true,
          affirmation: true,
        },
      };

      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: existingPreferences,
      });

      (mockPrismaService.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        updatedAt: mockUpdatedAt,
      });

      const result = await service.toggleFeedback(mockCognitoSub, true);

      expect(result.enabled).toBe(true);
    });

    it('should disable feedback', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: FeedbackPreferencesDto.getDefaults(),
      });

      (mockPrismaService.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        updatedAt: mockUpdatedAt,
      });

      const result = await service.toggleFeedback(mockCognitoSub, false);

      expect(result.enabled).toBe(false);
    });
  });

  describe('isFeedbackEnabled', () => {
    it('should return true when feedback is enabled', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: { enabled: true },
        updatedAt: mockUpdatedAt,
      });

      const result = await service.isFeedbackEnabled(mockCognitoSub);

      expect(result).toBe(true);
    });

    it('should return false when feedback is disabled', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: { enabled: false },
        updatedAt: mockUpdatedAt,
      });

      const result = await service.isFeedbackEnabled(mockCognitoSub);

      expect(result).toBe(false);
    });

    it('should return true (default) when no preferences stored', async () => {
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        feedbackPreferences: null,
        updatedAt: mockUpdatedAt,
      });

      const result = await service.isFeedbackEnabled(mockCognitoSub);

      expect(result).toBe(true); // Default is enabled
    });
  });
});

describe('FeedbackPreferencesDto', () => {
  describe('getDefaults', () => {
    it('should return correct default values', () => {
      const defaults = FeedbackPreferencesDto.getDefaults();

      expect(defaults.enabled).toBe(true);
      expect(defaults.sensitivity).toBe(FeedbackSensitivity.MEDIUM);
      expect(defaults.minConfidenceThreshold).toBe(0.7);
      expect(defaults.showEducationalResources).toBe(true);
      expect(defaults.autoDismissLowConfidence).toBe(false);
      expect(defaults.enabledTypes).toEqual({
        fallacy: true,
        inflammatory: true,
        unsourced: true,
        bias: true,
        affirmation: true,
      });
    });
  });
});
