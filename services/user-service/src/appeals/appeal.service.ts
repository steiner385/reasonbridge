/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import {
  TierAppealType,
  TierAppealStatus,
  TierLevel,
  ExpertiseLevel,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RankingService } from '../ranking/ranking.service.js';
import { ExpertiseService } from '../expertise/expertise.service.js';
import { AppealDto, SubmitAppealDto, AppealEligibilityDto } from './dto/appeal.dto.js';

/**
 * Number of days between appeal submissions (rate limit)
 */
const APPEAL_COOLDOWN_DAYS = 30;

/**
 * Tier level enum values in order
 */
const TIER_LEVELS: TierLevel[] = [
  TierLevel.NEWCOMER,
  TierLevel.CONTRIBUTOR,
  TierLevel.TRUSTED,
  TierLevel.LEADER,
  TierLevel.EXPERT,
];

/**
 * Expertise level enum values in order
 */
const EXPERTISE_LEVELS: ExpertiseLevel[] = [
  ExpertiseLevel.NOVICE,
  ExpertiseLevel.FAMILIAR,
  ExpertiseLevel.KNOWLEDGEABLE,
  ExpertiseLevel.EXPERT,
];

/**
 * Human-readable names for tier levels
 */
const TIER_LEVEL_NAMES: Record<TierLevel, string> = {
  NEWCOMER: 'Newcomer',
  CONTRIBUTOR: 'Contributor',
  TRUSTED: 'Trusted',
  LEADER: 'Leader',
  EXPERT: 'Expert',
};

/**
 * Human-readable names for expertise levels
 */
const EXPERTISE_LEVEL_NAMES: Record<ExpertiseLevel, string> = {
  NOVICE: 'Novice',
  FAMILIAR: 'Familiar',
  KNOWLEDGEABLE: 'Knowledgeable',
  EXPERT: 'Expert',
};

/**
 * Database tier appeal record shape with relations
 */
interface DbTierAppeal {
  id: string;
  userId: string;
  appealType: TierAppealType;
  tagId: string | null;
  requestedLevel: number;
  reason: string;
  status: TierAppealStatus;
  reviewedById: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  user?: { displayName: string | null } | null;
  tag?: { name: string } | null;
  reviewedBy?: { displayName: string | null } | null;
}

/**
 * AppealService - Manages tier appeals for the ranking system
 *
 * Handles submission, review, approval, and denial of appeals for
 * global tier rankings and domain expertise levels.
 *
 * @remarks
 * - Users can submit one appeal every 30 days (cooldown period)
 * - GLOBAL_TIER appeals request advancement in the global tier system
 * - DOMAIN_EXPERTISE appeals request advancement in specific topic categories
 * - Approved appeals trigger manual tier/expertise level updates
 * - Denied appeals include explanation for the user
 *
 * Appeal Process:
 * 1. User submits appeal with justification
 * 2. Appeal enters admin queue (PENDING status)
 * 3. Admin reviews history, patterns, contributions
 * 4. Resolution: Approve (manual tier bump) or Deny (with explanation)
 * 5. User notified of outcome
 */
@Injectable()
export class AppealService {
  private readonly logger = new Logger(AppealService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
    private readonly expertiseService: ExpertiseService,
  ) {}

  /**
   * Submit a new tier appeal
   *
   * @param userId - The user submitting the appeal
   * @param data - The appeal submission data
   * @returns The created appeal with PENDING status
   * @throws NotFoundException if the user or category does not exist
   * @throws BadRequestException if the user has submitted an appeal within 30 days
   * @throws BadRequestException if categoryId is missing for domain expertise appeals
   */
  async submitAppeal(userId: string, data: SubmitAppealDto): Promise<AppealDto> {
    // Verify the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check for domain expertise appeal requirements
    if (data.appealType === TierAppealType.DOMAIN_EXPERTISE && !data.categoryId) {
      throw new BadRequestException('categoryId is required for DOMAIN_EXPERTISE appeals');
    }

    // Check 30-day cooldown
    const canSubmit = await this.canSubmitAppeal(userId);
    if (!canSubmit) {
      throw new BadRequestException(
        `You can only submit one appeal every ${APPEAL_COOLDOWN_DAYS} days`,
      );
    }

    // If domain expertise appeal, verify the tag exists
    let tag: { id: string; name: string } | null = null;
    if (data.categoryId) {
      tag = await this.prisma.tag.findUnique({
        where: { id: data.categoryId },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${data.categoryId} not found`);
      }
    }

    // Create the appeal
    const appeal = await this.prisma.tierAppeal.create({
      data: {
        userId,
        appealType: data.appealType,
        tagId: data.categoryId,
        requestedLevel: data.requestedLevel,
        reason: data.reason,
        status: TierAppealStatus.PENDING,
      },
      include: {
        user: true,
        tag: true,
      },
    });

    this.logger.log(`Appeal submitted: ${appeal.id} by user ${userId} for ${data.appealType}`);

    return this.toAppealDto(appeal);
  }

  /**
   * Get all appeals for a user
   *
   * @param userId - The user's unique identifier
   * @returns Array of AppealDto for all user appeals
   */
  async getUserAppeals(userId: string): Promise<AppealDto[]> {
    const appeals = await this.prisma.tierAppeal.findMany({
      where: { userId },
      include: {
        user: true,
        tag: true,
        reviewedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return appeals.map((appeal) => this.toAppealDto(appeal));
  }

  /**
   * Get a specific appeal by ID
   *
   * @param appealId - The appeal's unique identifier
   * @returns AppealDto
   * @throws NotFoundException if the appeal does not exist
   */
  async getAppeal(appealId: string): Promise<AppealDto> {
    const appeal = await this.prisma.tierAppeal.findUnique({
      where: { id: appealId },
      include: {
        user: true,
        tag: true,
        reviewedBy: true,
      },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal with ID ${appealId} not found`);
    }

    return this.toAppealDto(appeal);
  }

  /**
   * Get all pending appeals for admin review
   *
   * @returns Array of AppealDto with PENDING status, oldest first
   */
  async getPendingAppeals(): Promise<AppealDto[]> {
    const appeals = await this.prisma.tierAppeal.findMany({
      where: { status: TierAppealStatus.PENDING },
      include: {
        user: true,
        tag: true,
        reviewedBy: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return appeals.map((appeal) => this.toAppealDto(appeal));
  }

  /**
   * Approve an appeal (admin action)
   *
   * Marks the appeal as APPROVED and triggers the tier/expertise bump.
   *
   * @param appealId - The appeal's unique identifier
   * @param adminId - The admin performing the approval
   * @param notes - Optional notes about the approval
   * @returns The updated AppealDto
   * @throws NotFoundException if the appeal does not exist
   * @throws BadRequestException if the appeal is not pending
   */
  async approveAppeal(appealId: string, adminId: string, notes?: string): Promise<AppealDto> {
    // Get the appeal
    const appeal = await this.prisma.tierAppeal.findUnique({
      where: { id: appealId },
      include: {
        user: true,
        tag: true,
      },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal with ID ${appealId} not found`);
    }

    if (appeal.status !== TierAppealStatus.PENDING) {
      throw new BadRequestException(
        `Appeal is not pending review (current status: ${appeal.status})`,
      );
    }

    // Update the appeal
    const now = new Date();
    const updatedAppeal = await this.prisma.tierAppeal.update({
      where: { id: appealId },
      data: {
        status: TierAppealStatus.APPROVED,
        reviewedById: adminId,
        reviewNotes: notes,
        resolvedAt: now,
      },
      include: {
        user: true,
        tag: true,
        reviewedBy: true,
      },
    });

    this.logger.log(`Appeal approved: ${appealId} by admin ${adminId} for user ${appeal.userId}`);

    // Trigger the tier/expertise bump
    if (appeal.appealType === TierAppealType.GLOBAL_TIER) {
      await this.applyGlobalTierBump(appeal.userId, appeal.requestedLevel);
    } else if (appeal.appealType === TierAppealType.DOMAIN_EXPERTISE && appeal.tagId) {
      await this.applyExpertiseBump(appeal.userId, appeal.tagId, appeal.requestedLevel);
    }

    return this.toAppealDto(updatedAppeal);
  }

  /**
   * Deny an appeal (admin action)
   *
   * Marks the appeal as DENIED with a reason.
   *
   * @param appealId - The appeal's unique identifier
   * @param adminId - The admin performing the denial
   * @param reason - The reason for denial
   * @returns The updated AppealDto
   * @throws NotFoundException if the appeal does not exist
   * @throws BadRequestException if the appeal is not pending
   */
  async denyAppeal(appealId: string, adminId: string, reason: string): Promise<AppealDto> {
    // Get the appeal
    const appeal = await this.prisma.tierAppeal.findUnique({
      where: { id: appealId },
      include: {
        user: true,
        tag: true,
      },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal with ID ${appealId} not found`);
    }

    if (appeal.status !== TierAppealStatus.PENDING) {
      throw new BadRequestException(
        `Appeal is not pending review (current status: ${appeal.status})`,
      );
    }

    // Update the appeal
    const now = new Date();
    const updatedAppeal = await this.prisma.tierAppeal.update({
      where: { id: appealId },
      data: {
        status: TierAppealStatus.DENIED,
        reviewedById: adminId,
        reviewNotes: reason,
        resolvedAt: now,
      },
      include: {
        user: true,
        tag: true,
        reviewedBy: true,
      },
    });

    this.logger.log(`Appeal denied: ${appealId} by admin ${adminId} for user ${appeal.userId}`);

    // No tier/expertise changes for denial

    return this.toAppealDto(updatedAppeal);
  }

  /**
   * Check if a user can submit a new appeal (30-day cooldown)
   *
   * @param userId - The user's unique identifier
   * @returns true if the user can submit, false otherwise
   */
  async canSubmitAppeal(userId: string): Promise<boolean> {
    const cooldownDate = new Date(Date.now() - APPEAL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const recentAppeal = await this.prisma.tierAppeal.findFirst({
      where: {
        userId,
        createdAt: { gte: cooldownDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    return recentAppeal === null;
  }

  /**
   * Get appeal eligibility information for a user
   *
   * Returns detailed eligibility status including reason and next eligible date
   * if the user is currently in cooldown.
   *
   * @param userId - The user's unique identifier
   * @returns AppealEligibilityDto with eligibility details
   */
  async getAppealEligibility(userId: string): Promise<AppealEligibilityDto> {
    const cooldownDate = new Date(Date.now() - APPEAL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const recentAppeal = await this.prisma.tierAppeal.findFirst({
      where: {
        userId,
        createdAt: { gte: cooldownDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentAppeal === null) {
      return new AppealEligibilityDto({ canSubmit: true });
    }

    // Calculate next eligible date
    const nextEligibleDate = new Date(
      recentAppeal.createdAt.getTime() + APPEAL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
    );

    return new AppealEligibilityDto({
      canSubmit: false,
      reason: `You can only submit one appeal every ${APPEAL_COOLDOWN_DAYS} days`,
      nextEligibleDate,
    });
  }

  /**
   * Apply a global tier level bump from an approved appeal
   */
  private async applyGlobalTierBump(userId: string, requestedLevel: number): Promise<void> {
    const tierLevel = TIER_LEVELS[requestedLevel] ?? TierLevel.NEWCOMER;

    // Get the score threshold for this tier
    const compositeScore = this.getTierScoreThreshold(tierLevel);

    await this.prisma.userRank.upsert({
      where: { userId },
      create: {
        userId,
        tierLevel,
        compositeScore: new Prisma.Decimal(compositeScore),
        engagementScore: new Prisma.Decimal(0.5),
        qualityScore: new Prisma.Decimal(0.5),
        tenureBonus: new Prisma.Decimal(0),
        nextTierThreshold: new Prisma.Decimal(this.getNextTierThreshold(tierLevel)),
        badges: [],
        lastCalculated: new Date(),
      },
      update: {
        tierLevel,
        compositeScore: new Prisma.Decimal(compositeScore),
        lastCalculated: new Date(),
      },
    });

    this.logger.log(`Applied global tier bump for user ${userId}: tier=${tierLevel}`);
  }

  /**
   * Apply a domain expertise level bump from an approved appeal
   */
  private async applyExpertiseBump(
    userId: string,
    tagId: string,
    requestedLevel: number,
  ): Promise<void> {
    const expertiseLevel = EXPERTISE_LEVELS[requestedLevel] ?? ExpertiseLevel.NOVICE;

    // Get the score threshold for this expertise level
    const expertiseScore = this.getExpertiseScoreThreshold(expertiseLevel);

    await this.prisma.topicExpertise.upsert({
      where: {
        userId_tagId: {
          userId,
          tagId,
        },
      },
      create: {
        userId,
        tagId,
        expertiseLevel,
        expertiseScore: new Prisma.Decimal(expertiseScore),
        responseCount: 0,
        avgQualityScore: new Prisma.Decimal(0.5),
        credentialBoost: new Prisma.Decimal(0),
        lastActive: new Date(),
      },
      update: {
        expertiseLevel,
        expertiseScore: new Prisma.Decimal(expertiseScore),
        lastActive: new Date(),
      },
    });

    this.logger.log(
      `Applied expertise bump for user ${userId} in tag ${tagId}: level=${expertiseLevel}`,
    );
  }

  /**
   * Get the minimum composite score for a tier level
   */
  private getTierScoreThreshold(tier: TierLevel): number {
    switch (tier) {
      case TierLevel.EXPERT:
        return 0.8;
      case TierLevel.LEADER:
        return 0.6;
      case TierLevel.TRUSTED:
        return 0.4;
      case TierLevel.CONTRIBUTOR:
        return 0.2;
      case TierLevel.NEWCOMER:
      default:
        return 0.0;
    }
  }

  /**
   * Get the next tier threshold
   */
  private getNextTierThreshold(tier: TierLevel): number {
    switch (tier) {
      case TierLevel.NEWCOMER:
        return 0.2;
      case TierLevel.CONTRIBUTOR:
        return 0.4;
      case TierLevel.TRUSTED:
        return 0.6;
      case TierLevel.LEADER:
        return 0.8;
      case TierLevel.EXPERT:
        return 1.0;
    }
  }

  /**
   * Get the minimum expertise score for an expertise level
   */
  private getExpertiseScoreThreshold(level: ExpertiseLevel): number {
    switch (level) {
      case ExpertiseLevel.EXPERT:
        return 0.75;
      case ExpertiseLevel.KNOWLEDGEABLE:
        return 0.5;
      case ExpertiseLevel.FAMILIAR:
        return 0.25;
      case ExpertiseLevel.NOVICE:
      default:
        return 0.0;
    }
  }

  /**
   * Convert a database tier appeal to AppealDto
   */
  private toAppealDto(appeal: DbTierAppeal): AppealDto {
    // Determine the level name based on appeal type
    let requestedLevelName: string;
    if (appeal.appealType === TierAppealType.GLOBAL_TIER) {
      const tierLevel = TIER_LEVELS[appeal.requestedLevel];
      requestedLevelName = tierLevel ? TIER_LEVEL_NAMES[tierLevel] : 'Unknown';
    } else {
      const expertiseLevel = EXPERTISE_LEVELS[appeal.requestedLevel];
      requestedLevelName = expertiseLevel ? EXPERTISE_LEVEL_NAMES[expertiseLevel] : 'Unknown';
    }

    return new AppealDto({
      id: appeal.id,
      userId: appeal.userId,
      userName: appeal.user?.displayName ?? 'Unknown',
      appealType: appeal.appealType,
      categoryId: appeal.tagId ?? undefined,
      categoryName: appeal.tag?.name ?? undefined,
      requestedLevel: appeal.requestedLevel,
      requestedLevelName,
      reason: appeal.reason,
      status: appeal.status,
      reviewedBy: appeal.reviewedById ?? undefined,
      reviewerName: appeal.reviewedBy?.displayName ?? undefined,
      reviewNotes: appeal.reviewNotes ?? undefined,
      createdAt: appeal.createdAt,
      resolvedAt: appeal.resolvedAt ?? undefined,
    });
  }
}
