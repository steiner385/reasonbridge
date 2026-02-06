/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { OnboardingProgress } from '@prisma/client';
import { OnboardingStep } from '@prisma/client';

/**
 * Onboarding Progress Repository
 *
 * Data access layer for OnboardingProgress entity operations.
 * Tracks user progress through onboarding steps.
 *
 * Onboarding steps:
 * 1. VERIFICATION - Email verification
 * 2. TOPICS - Topic interest selection
 * 3. ORIENTATION - Platform orientation/tutorial
 * 4. COMPLETE - All steps completed
 */
@Injectable()
export class OnboardingProgressRepository {
  private readonly logger = new Logger(OnboardingProgressRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create onboarding progress for a new user
   *
   * @param userId - User ID
   * @returns Created onboarding progress
   */
  async create(userId: string): Promise<OnboardingProgress> {
    try {
      this.logger.debug(`Creating onboarding progress for user: ${userId}`);

      const progress = await this.prisma.onboardingProgress.create({
        data: {
          userId,
          currentStep: OnboardingStep.VERIFICATION,
          emailVerified: false,
          topicsSelected: false,
          orientationViewed: false,
          firstPostMade: false,
        },
      });

      this.logger.log(`Onboarding progress created for user: ${userId}`);
      return progress;
    } catch (error: any) {
      this.logger.error(`Failed to create onboarding progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find onboarding progress by user ID
   *
   * @param userId - User ID
   * @returns Onboarding progress or null if not found
   */
  async findByUserId(userId: string): Promise<OnboardingProgress | null> {
    try {
      return await this.prisma.onboardingProgress.findUnique({
        where: { userId },
      });
    } catch (error: any) {
      this.logger.error(`Failed to find onboarding progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark email as verified and advance to topics step
   *
   * @param userId - User ID
   * @returns Updated onboarding progress
   */
  async markEmailVerified(userId: string): Promise<OnboardingProgress> {
    try {
      this.logger.debug(`Marking email verified for user: ${userId}`);

      const progress = await this.prisma.onboardingProgress.update({
        where: { userId },
        data: {
          emailVerified: true,
          currentStep: OnboardingStep.TOPICS,
        },
      });

      this.logger.log(`Email verification step completed for user: ${userId}`);
      return progress;
    } catch (error: any) {
      this.logger.error(`Failed to mark email verified: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark topics as selected and advance to orientation step
   *
   * @param userId - User ID
   * @returns Updated onboarding progress
   */
  async markTopicsSelected(userId: string): Promise<OnboardingProgress> {
    try {
      this.logger.debug(`Marking topics selected for user: ${userId}`);

      const progress = await this.prisma.onboardingProgress.update({
        where: { userId },
        data: {
          topicsSelected: true,
          currentStep: OnboardingStep.ORIENTATION,
        },
      });

      this.logger.log(`Topics selection step completed for user: ${userId}`);
      return progress;
    } catch (error: any) {
      this.logger.error(`Failed to mark topics selected: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark orientation as viewed
   *
   * @param userId - User ID
   * @returns Updated onboarding progress
   */
  async markOrientationViewed(userId: string): Promise<OnboardingProgress> {
    try {
      this.logger.debug(`Marking orientation viewed for user: ${userId}`);

      const progress = await this.prisma.onboardingProgress.update({
        where: { userId },
        data: {
          orientationViewed: true,
        },
      });

      this.logger.log(`Orientation step completed for user: ${userId}`);
      return progress;
    } catch (error: any) {
      this.logger.error(`Failed to mark orientation viewed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark first post as made and complete onboarding
   *
   * @param userId - User ID
   * @returns Updated onboarding progress
   */
  async markFirstPostMade(userId: string): Promise<OnboardingProgress> {
    try {
      this.logger.debug(`Marking first post made for user: ${userId}`);

      const progress = await this.prisma.onboardingProgress.update({
        where: { userId },
        data: {
          firstPostMade: true,
          currentStep: OnboardingStep.COMPLETE,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Onboarding completed for user: ${userId}`);
      return progress;
    } catch (error: any) {
      this.logger.error(`Failed to mark first post made: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update current step manually
   *
   * @param userId - User ID
   * @param step - New onboarding step
   * @returns Updated onboarding progress
   */
  async updateCurrentStep(userId: string, step: OnboardingStep): Promise<OnboardingProgress> {
    try {
      this.logger.debug(`Updating current step for user ${userId} to: ${step}`);

      const progress = await this.prisma.onboardingProgress.update({
        where: { userId },
        data: {
          currentStep: step,
        },
      });

      this.logger.log(`Current step updated for user: ${userId}`);
      return progress;
    } catch (error: any) {
      this.logger.error(`Failed to update current step: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if onboarding is complete
   *
   * @param userId - User ID
   * @returns True if onboarding is complete
   */
  async isComplete(userId: string): Promise<boolean> {
    try {
      const progress = await this.findByUserId(userId);

      if (!progress) {
        return false;
      }

      return (
        progress.emailVerified &&
        progress.topicsSelected &&
        progress.orientationViewed &&
        progress.firstPostMade
      );
    } catch (error: any) {
      this.logger.error(`Failed to check onboarding completion: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get completion percentage (0-100)
   *
   * @param userId - User ID
   * @returns Completion percentage
   */
  async getCompletionPercentage(userId: string): Promise<number> {
    try {
      const progress = await this.findByUserId(userId);

      if (!progress) {
        return 0;
      }

      const steps = [
        progress.emailVerified,
        progress.topicsSelected,
        progress.orientationViewed,
        progress.firstPostMade,
      ];

      const completedSteps = steps.filter((step) => step).length;
      return Math.round((completedSteps / steps.length) * 100);
    } catch (error: any) {
      this.logger.error(`Failed to calculate completion percentage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get users with incomplete onboarding
   *
   * @param limit - Maximum number of users to return
   * @returns Array of onboarding progress records
   */
  async findIncomplete(limit: number = 100): Promise<OnboardingProgress[]> {
    try {
      return await this.prisma.onboardingProgress.findMany({
        where: {
          currentStep: {
            not: OnboardingStep.COMPLETE,
          },
        },
        orderBy: {
          lastUpdatedAt: 'desc',
        },
        take: limit,
      });
    } catch (error: any) {
      this.logger.error(`Failed to find incomplete onboarding: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get onboarding completion statistics
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    byStep: Record<string, number>;
  }> {
    try {
      const total = await this.prisma.onboardingProgress.count();
      const completed = await this.prisma.onboardingProgress.count({
        where: { currentStep: OnboardingStep.COMPLETE },
      });

      const byStep = await this.prisma.onboardingProgress.groupBy({
        by: ['currentStep'],
        _count: true,
      });

      const stepCounts = byStep.reduce(
        (acc, item) => {
          acc[item.currentStep] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        total,
        completed,
        inProgress: total - completed,
        byStep: stepCounts,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get onboarding statistics: ${error.message}`, error.stack);
      throw error;
    }
  }
}
