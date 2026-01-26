/**
 * Onboarding Service
 * Handles onboarding flow including topic selection
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TopicInterestRepository } from '../repositories/topic-interest.repository';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repository';
import { TopicService } from '../topics/topic.service';
import { SelectTopicsRequestDto } from './dto/select-topics.dto';
import { SelectTopicsResponseDto } from './dto/select-topics-response.dto';
import { SelectedTopicDto } from '../dto/common.dto';
import { ActivityLevel } from '../topics/dto/topic.dto';
import { OnboardingStep } from '@prisma/client';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly topicInterestRepository: TopicInterestRepository,
    private readonly onboardingProgressRepository: OnboardingProgressRepository,
    private readonly topicService: TopicService,
  ) {}

  /**
   * T096-T099: Select topics for user during onboarding
   * Validates 2-3 topics, assigns priorities, warns about low activity
   */
  async selectTopics(userId: string, dto: SelectTopicsRequestDto): Promise<SelectTopicsResponseDto> {
    this.logger.log(`Selecting topics for user: ${userId}`);

    // T097: Validate topic selection (2-3 topics)
    if (dto.topics.length < 2 || dto.topics.length > 3) {
      throw new BadRequestException('You must select between 2 and 3 topics');
    }

    // T097: Validate priorities are unique and in range 1-3
    const priorities = dto.topics.map((t) => t.priority);
    const uniquePriorities = new Set(priorities);
    if (uniquePriorities.size !== dto.topics.length) {
      throw new BadRequestException('Each topic must have a unique priority');
    }

    if (!priorities.every((p) => p >= 1 && p <= 3)) {
      throw new BadRequestException('Priorities must be between 1 (highest) and 3 (lowest)');
    }

    // Fetch topics to validate they exist and get activity levels
    const topicIds = dto.topics.map((t) => t.topicId);
    const topics = await Promise.all(topicIds.map((id) => this.topicService.getTopicById(id)));

    // Validate all topics exist
    if (topics.some((t) => t === null)) {
      throw new NotFoundException('One or more selected topics do not exist');
    }

    // T099: Check if all topics have LOW activity
    const allLowActivity = topics.every((t) => t!.activityLevel === ActivityLevel.LOW);
    let warning: string | undefined;
    let suggestions: SelectedTopicDto[] | undefined;

    if (allLowActivity) {
      warning = 'All selected topics have low activity. Consider selecting at least one high-activity topic for better engagement.';

      // Get high-activity alternatives
      const highActivityTopics = await this.topicService.getHighActivityTopics(3);
      suggestions = highActivityTopics.map((topic) => ({
        topicId: topic.id,
        topicName: topic.name,
        topicDescription: topic.description,
        activityLevel: topic.activityLevel,
        priority: 1,
        selectedAt: new Date().toISOString(),
      }));

      this.logger.warn(`User ${userId} selected all low-activity topics`);
    }

    try {
      // T097: Create TopicInterest records in transaction
      const selectedTopics = await this.prisma.$transaction(async (tx) => {
        // Delete existing topic interests for this user
        await this.topicInterestRepository.deleteAllByUserId(userId);

        // Create new topic interests
        const interests = await Promise.all(
          dto.topics.map((topicSelection) =>
            this.topicInterestRepository.create({
              userId,
              topicId: topicSelection.topicId,
              priority: topicSelection.priority,
            }),
          ),
        );

        // T098: Update OnboardingProgress
        await this.onboardingProgressRepository.markTopicsSelected(userId);

        return interests;
      });

      // Fetch updated onboarding progress
      const onboardingProgress = await this.onboardingProgressRepository.findByUserId(userId);
      if (!onboardingProgress) {
        throw new NotFoundException('Onboarding progress not found');
      }

      // Map to response DTOs
      const selectedTopicDtos: SelectedTopicDto[] = await Promise.all(
        selectedTopics.map(async (interest) => {
          const topic = topics.find((t) => t?.id === interest.topicId);
          return {
            topicId: interest.topicId,
            topicName: topic!.name,
            topicDescription: topic!.description,
            activityLevel: topic!.activityLevel,
            priority: interest.priority,
            selectedAt: interest.createdAt.toISOString(),
          };
        }),
      );

      this.logger.log(`Topics selected successfully for user ${userId}`);

      return {
        selectedTopics: selectedTopicDtos,
        onboardingProgress: {
          userId: onboardingProgress.userId,
          currentStep: onboardingProgress.currentStep,
          completionPercentage: this.calculateCompletionPercentage(onboardingProgress),
          nextAction: this.getNextActionForStep(onboardingProgress.currentStep),
        },
        warning,
        suggestions,
      };
    } catch (error) {
      this.logger.error(`Failed to select topics for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's current onboarding progress
   */
  async getOnboardingProgress(userId: string): Promise<any> {
    const progress = await this.onboardingProgressRepository.findByUserId(userId);
    if (!progress) {
      throw new NotFoundException('Onboarding progress not found');
    }

    return {
      userId: progress.userId,
      currentStep: progress.currentStep,
      completionPercentage: this.calculateCompletionPercentage(progress),
      nextAction: this.getNextActionForStep(progress.currentStep),
      emailVerified: progress.emailVerified,
      topicsSelected: progress.topicsSelected,
      orientationViewed: progress.orientationViewed,
      firstPostMade: progress.firstPostMade,
    };
  }

  /**
   * T115: Mark orientation as viewed
   * Updates orientationViewed flag and advances to FIRST_POST step
   */
  async markOrientationViewed(userId: string): Promise<any> {
    this.logger.log(`Marking orientation as viewed for user: ${userId}`);

    const progress = await this.onboardingProgressRepository.findByUserId(userId);
    if (!progress) {
      throw new NotFoundException('Onboarding progress not found');
    }

    if (progress.orientationViewed) {
      this.logger.warn(`Orientation already viewed for user ${userId}`);
    }

    // Mark orientation viewed and update to FIRST_POST step
    await this.onboardingProgressRepository.markOrientationViewed(userId);

    // Fetch updated progress
    const updatedProgress = await this.onboardingProgressRepository.findByUserId(userId);

    this.logger.log(`Orientation marked as viewed for user ${userId}`);

    return {
      message: 'Orientation marked as viewed',
      currentStep: updatedProgress!.currentStep,
      completionPercentage: this.calculateCompletionPercentage(updatedProgress!),
      nextAction: this.getNextActionForStep(updatedProgress!.currentStep),
    };
  }

  /**
   * T127-T128: Mark first post as made
   * Updates firstPostMade flag, completes onboarding, generates encouragement message
   */
  async markFirstPost(userId: string, postId?: string, discussionId?: string): Promise<any> {
    this.logger.log(`Marking first post for user: ${userId}, postId: ${postId}, discussionId: ${discussionId}`);

    const progress = await this.onboardingProgressRepository.findByUserId(userId);
    if (!progress) {
      throw new NotFoundException('Onboarding progress not found');
    }

    if (progress.firstPostMade) {
      this.logger.warn(`First post already made for user ${userId}`);
      return {
        message: 'First post already recorded',
        encouragement: this.generateEncouragementMessage(),
        currentStep: progress.currentStep,
        completionPercentage: this.calculateCompletionPercentage(progress),
        completedAt: progress.completedAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Mark first post made and complete onboarding
    await this.onboardingProgressRepository.markFirstPostMade(userId);

    // Fetch updated progress
    const updatedProgress = await this.onboardingProgressRepository.findByUserId(userId);

    this.logger.log(`First post marked and onboarding completed for user ${userId}`);

    // T128: Generate encouragement message
    const encouragement = this.generateEncouragementMessage();

    return {
      message: 'Congratulations! You have completed onboarding. Welcome to the community!',
      encouragement,
      currentStep: updatedProgress!.currentStep,
      completionPercentage: this.calculateCompletionPercentage(updatedProgress!),
      completedAt: updatedProgress!.completedAt?.toISOString() || new Date().toISOString(),
      achievement: 'First Post',
    };
  }

  /**
   * T128: Generate encouragement message for first post completion
   */
  private generateEncouragementMessage(): string {
    const messages = [
      'You have taken your first step in constructive dialogue. Keep sharing your perspective!',
      'Great job sharing your first perspective! Your voice adds value to our community.',
      'Welcome to the conversation! Every perspective helps us find common ground.',
      'Excellent! You are now part of a community focused on understanding, not just debating.',
      'Your first contribution is complete! Continue engaging with respectful, thoughtful dialogue.',
    ];

    // Randomly select one
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  /**
   * Helper: Calculate completion percentage
   */
  private calculateCompletionPercentage(progress: any): number {
    const steps = {
      [OnboardingStep.VERIFICATION]: 20,
      [OnboardingStep.TOPICS]: 40,
      [OnboardingStep.ORIENTATION]: 60,
      [OnboardingStep.FIRST_POST]: 80,
      [OnboardingStep.COMPLETED]: 100,
    };

    return steps[progress.currentStep] || 0;
  }

  /**
   * Helper: Get next action based on current step
   */
  private getNextActionForStep(step: OnboardingStep): any {
    const actions: Record<OnboardingStep, any> = {
      VERIFICATION: {
        step: 'VERIFICATION',
        label: 'Verify your email',
        description: 'Check your email for a 6-digit verification code',
        url: '/verify-email',
      },
      TOPICS: {
        step: 'TOPICS',
        label: 'Choose your interests',
        description: 'Select 2-3 topics you want to discuss',
        url: '/onboarding/topics',
      },
      ORIENTATION: {
        step: 'ORIENTATION',
        label: 'Learn how it works',
        description: 'Quick tour of the platform features',
        url: '/onboarding/orientation',
      },
      FIRST_POST: {
        step: 'FIRST_POST',
        label: 'Make your first post',
        description: 'Share your perspective on a topic',
        url: '/discussions',
      },
      COMPLETED: {
        step: 'COMPLETED',
        label: 'Onboarding complete',
        description: 'You are all set!',
        url: '/dashboard',
      },
    };

    return actions[step];
  }
}
