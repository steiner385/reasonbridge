import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  FeedbackPreferencesDto,
  FeedbackSensitivity,
  UpdateFeedbackPreferencesDto,
  FeedbackPreferencesResponseDto,
} from '../users/dto/feedback-preferences.dto.js';

/**
 * FeedbackPreferencesService - Manages user preferences for AI feedback
 *
 * Handles storing and retrieving feedback preferences in the user's
 * feedbackPreferences JSON field. Provides default values for new users
 * and supports partial updates.
 */
@Injectable()
export class FeedbackPreferencesService {
  private readonly logger = new Logger(FeedbackPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get feedback preferences for a user by their Cognito sub
   * Returns default preferences if none are set
   *
   * @param cognitoSub - The Cognito user ID from JWT token
   * @returns FeedbackPreferencesResponseDto with user's preferences
   * @throws NotFoundException if user not found
   */
  async getPreferences(cognitoSub: string): Promise<FeedbackPreferencesResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub },
      select: {
        id: true,
        feedbackPreferences: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Return stored preferences or defaults
    const preferences = user.feedbackPreferences
      ? this.parsePreferences(user.feedbackPreferences)
      : FeedbackPreferencesDto.getDefaults();

    return new FeedbackPreferencesResponseDto(user.id, preferences, user.updatedAt);
  }

  /**
   * Update feedback preferences for a user
   *
   * @param cognitoSub - The Cognito user ID from JWT token
   * @param updateDto - Partial update with fields to change
   * @returns Updated FeedbackPreferencesResponseDto
   * @throws NotFoundException if user not found
   */
  async updatePreferences(
    cognitoSub: string,
    updateDto: UpdateFeedbackPreferencesDto,
  ): Promise<FeedbackPreferencesResponseDto> {
    // Get current preferences
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub },
      select: {
        id: true,
        feedbackPreferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge with existing preferences (or defaults)
    const currentPreferences = user.feedbackPreferences
      ? this.parsePreferences(user.feedbackPreferences)
      : FeedbackPreferencesDto.getDefaults();

    const mergedPreferences = this.mergePreferences(currentPreferences, updateDto);

    // Save updated preferences
    const updatedUser = await this.prisma.user.update({
      where: { cognitoSub },
      data: {
        feedbackPreferences: mergedPreferences as object,
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Updated feedback preferences for user ${user.id}`);

    return new FeedbackPreferencesResponseDto(user.id, mergedPreferences, updatedUser.updatedAt);
  }

  /**
   * Toggle feedback on or off for a user
   * Convenience method that only updates the enabled field
   *
   * @param cognitoSub - The Cognito user ID from JWT token
   * @param enabled - Whether feedback should be enabled
   * @returns Updated FeedbackPreferencesResponseDto
   */
  async toggleFeedback(
    cognitoSub: string,
    enabled: boolean,
  ): Promise<FeedbackPreferencesResponseDto> {
    return this.updatePreferences(cognitoSub, { enabled });
  }

  /**
   * Check if feedback is enabled for a user
   *
   * @param cognitoSub - The Cognito user ID from JWT token
   * @returns boolean indicating if feedback is enabled
   */
  async isFeedbackEnabled(cognitoSub: string): Promise<boolean> {
    const preferences = await this.getPreferences(cognitoSub);
    return preferences.enabled;
  }

  /**
   * Parse stored JSON preferences into DTO
   * Handles type coercion and missing fields
   *
   * @param stored - Raw JSON from database
   * @returns Parsed FeedbackPreferencesDto
   */
  private parsePreferences(stored: unknown): FeedbackPreferencesDto {
    const defaults = FeedbackPreferencesDto.getDefaults();

    if (!stored || typeof stored !== 'object') {
      return defaults;
    }

    // Type-safe access to stored preferences
    const prefs = stored as {
      enabled?: unknown;
      sensitivity?: unknown;
      minConfidenceThreshold?: unknown;
      showEducationalResources?: unknown;
      autoDismissLowConfidence?: unknown;
      enabledTypes?: {
        fallacy?: unknown;
        inflammatory?: unknown;
        unsourced?: unknown;
        bias?: unknown;
        affirmation?: unknown;
      };
    };

    const dto = new FeedbackPreferencesDto();

    // Parse with defaults for missing fields
    dto.enabled = typeof prefs.enabled === 'boolean' ? prefs.enabled : defaults.enabled;

    // Parse sensitivity with type-safe enum assignment
    const sens = prefs.sensitivity;
    if (sens === 'low' || sens === 'medium' || sens === 'high') {
      dto.sensitivity = sens as FeedbackSensitivity;
    } else {
      dto.sensitivity = defaults.sensitivity;
    }

    dto.minConfidenceThreshold =
      typeof prefs.minConfidenceThreshold === 'number'
        ? prefs.minConfidenceThreshold
        : defaults.minConfidenceThreshold;
    dto.showEducationalResources =
      typeof prefs.showEducationalResources === 'boolean'
        ? prefs.showEducationalResources
        : defaults.showEducationalResources;
    dto.autoDismissLowConfidence =
      typeof prefs.autoDismissLowConfidence === 'boolean'
        ? prefs.autoDismissLowConfidence
        : defaults.autoDismissLowConfidence;

    // Parse enabled types
    const storedTypes = prefs.enabledTypes;
    dto.enabledTypes = {
      fallacy:
        typeof storedTypes?.fallacy === 'boolean'
          ? storedTypes.fallacy
          : defaults.enabledTypes.fallacy,
      inflammatory:
        typeof storedTypes?.inflammatory === 'boolean'
          ? storedTypes.inflammatory
          : defaults.enabledTypes.inflammatory,
      unsourced:
        typeof storedTypes?.unsourced === 'boolean'
          ? storedTypes.unsourced
          : defaults.enabledTypes.unsourced,
      bias: typeof storedTypes?.bias === 'boolean' ? storedTypes.bias : defaults.enabledTypes.bias,
      affirmation:
        typeof storedTypes?.affirmation === 'boolean'
          ? storedTypes.affirmation
          : defaults.enabledTypes.affirmation,
    };

    return dto;
  }

  /**
   * Merge partial update into existing preferences
   *
   * @param current - Current preferences
   * @param update - Partial update DTO
   * @returns Merged preferences
   */
  private mergePreferences(
    current: FeedbackPreferencesDto,
    update: UpdateFeedbackPreferencesDto,
  ): FeedbackPreferencesDto {
    const merged = new FeedbackPreferencesDto();

    merged.enabled = update.enabled ?? current.enabled;
    merged.sensitivity = update.sensitivity ?? current.sensitivity;
    merged.minConfidenceThreshold = update.minConfidenceThreshold ?? current.minConfidenceThreshold;
    merged.showEducationalResources =
      update.showEducationalResources ?? current.showEducationalResources;
    merged.autoDismissLowConfidence =
      update.autoDismissLowConfidence ?? current.autoDismissLowConfidence;

    // Merge enabled types (partial update)
    merged.enabledTypes = {
      fallacy: update.enabledTypes?.fallacy ?? current.enabledTypes.fallacy,
      inflammatory: update.enabledTypes?.inflammatory ?? current.enabledTypes.inflammatory,
      unsourced: update.enabledTypes?.unsourced ?? current.enabledTypes.unsourced,
      bias: update.enabledTypes?.bias ?? current.enabledTypes.bias,
      affirmation: update.enabledTypes?.affirmation ?? current.enabledTypes.affirmation,
    };

    return merged;
  }
}
