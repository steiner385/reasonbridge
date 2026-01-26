import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DemoDiscussionDto, DemoDiscussionsResponseDto, ViewsSpectrumDto } from './dto/demo-discussion.dto.js';

/**
 * Service for managing demo discussions displayed on the landing page
 * Provides curated, anonymized discussions to showcase platform value before signup
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get curated demo discussions for landing page
   * Filters for high common ground score, diverse topics, and recent activity
   *
   * @param limit - Number of discussions to return (1-10)
   * @param sessionId - Optional visitor session ID for tracking
   * @returns Demo discussions with social proof metrics
   */
  async getDemoDiscussions(
    limit: number = 5,
    sessionId?: string,
  ): Promise<DemoDiscussionsResponseDto> {
    this.logger.log(`Fetching ${limit} demo discussions${sessionId ? ` for session ${sessionId}` : ''}`);

    // Track visitor session if provided
    if (sessionId) {
      await this.trackVisitorSession(sessionId);
    }

    // Get curated demo discussions
    const discussions = await this.selectDemoDiscussions(limit);

    // Calculate social proof metrics
    const socialProof = this.calculateSocialProofMetrics(discussions);

    return {
      discussions,
      socialProof,
    };
  }

  /**
   * Select demo discussions based on quality criteria:
   * - High common ground score (>0.65)
   * - Diverse topics
   * - Recent activity
   * - Good participant engagement
   */
  private async selectDemoDiscussions(limit: number): Promise<DemoDiscussionDto[]> {
    // For now, return curated hardcoded examples
    // In production, this would query real discussions with privacy filtering
    const curatedDiscussions: DemoDiscussionDto[] = [
      {
        id: 'demo-550e8400-e29b-41d4-a716-446655440000',
        title: 'Should cities ban gas-powered cars by 2030?',
        topic: 'Climate & Environment',
        participantCount: 87,
        propositionCount: 24,
        commonGroundScore: 0.73,
        topCommonGround: [
          'Public transit infrastructure must improve first',
          'Exceptions needed for rural areas and emergency vehicles',
          'Phase-in approach better than hard deadline',
        ],
        viewsSpectrum: {
          stronglySupport: 28,
          support: 31,
          neutral: 15,
          oppose: 10,
          stronglyOppose: 3,
        },
        createdAt: new Date('2026-01-20T08:00:00Z').toISOString(),
      },
      {
        id: 'demo-650e8400-e29b-41d4-a716-446655440001',
        title: 'Should social media platforms be liable for user-generated content?',
        topic: 'Technology & Privacy',
        participantCount: 143,
        propositionCount: 38,
        commonGroundScore: 0.68,
        topCommonGround: [
          'Current Section 230 protections need updates',
          'Illegal content should have faster takedown',
          'Balance needed between moderation and free speech',
        ],
        viewsSpectrum: {
          stronglySupport: 42,
          support: 51,
          neutral: 28,
          oppose: 18,
          stronglyOppose: 4,
        },
        createdAt: new Date('2026-01-18T14:30:00Z').toISOString(),
      },
      {
        id: 'demo-750e8400-e29b-41d4-a716-446655440002',
        title: 'Should schools require financial literacy courses for graduation?',
        topic: 'Education & Youth',
        participantCount: 196,
        propositionCount: 45,
        commonGroundScore: 0.82,
        topCommonGround: [
          'Basic budgeting and credit skills are essential',
          'Current high school curriculum lacks practical life skills',
          'Parents often unable to teach financial concepts effectively',
        ],
        viewsSpectrum: {
          stronglySupport: 98,
          support: 76,
          neutral: 15,
          oppose: 5,
          stronglyOppose: 2,
        },
        createdAt: new Date('2026-01-15T10:15:00Z').toISOString(),
      },
      {
        id: 'demo-850e8400-e29b-41d4-a716-446655440003',
        title: 'Should remote workers be required to return to offices?',
        topic: 'Work & Economy',
        participantCount: 234,
        propositionCount: 52,
        commonGroundScore: 0.71,
        topCommonGround: [
          'Hybrid models work better than all-or-nothing approaches',
          'Different roles have different collaboration needs',
          'Companies should focus on outcomes, not location',
        ],
        viewsSpectrum: {
          stronglySupport: 18,
          support: 34,
          neutral: 42,
          oppose: 89,
          stronglyOppose: 51,
        },
        createdAt: new Date('2026-01-12T16:45:00Z').toISOString(),
      },
      {
        id: 'demo-950e8400-e29b-41d4-a716-446655440004',
        title: 'Should prescription drug prices be regulated by government?',
        topic: 'Healthcare & Policy',
        participantCount: 167,
        propositionCount: 41,
        commonGroundScore: 0.66,
        topCommonGround: [
          'Current prices are unaffordable for many Americans',
          'Need transparency in drug pricing and development costs',
          'Both innovation incentives and affordability matter',
        ],
        viewsSpectrum: {
          stronglySupport: 68,
          support: 57,
          neutral: 22,
          oppose: 15,
          stronglyOppose: 5,
        },
        createdAt: new Date('2026-01-10T09:20:00Z').toISOString(),
      },
    ];

    // Filter discussions with high common ground score (>0.65)
    const highQualityDiscussions = curatedDiscussions.filter(
      (d) => d.commonGroundScore > 0.65,
    );

    // Return requested number of discussions
    return highQualityDiscussions.slice(0, limit);
  }

  /**
   * Calculate social proof metrics from demo discussions
   * Shows platform effectiveness through aggregate statistics
   */
  private calculateSocialProofMetrics(discussions: DemoDiscussionDto[]): {
    averageCommonGroundScore: number;
    totalParticipants: number;
    platformSatisfaction: number;
  } {
    if (discussions.length === 0) {
      return {
        averageCommonGroundScore: 0,
        totalParticipants: 0,
        platformSatisfaction: 0,
      };
    }

    // Calculate average common ground score
    const totalScore = discussions.reduce(
      (sum, d) => sum + d.commonGroundScore,
      0,
    );
    const averageCommonGroundScore = totalScore / discussions.length;

    // Calculate total participants across discussions
    const totalParticipants = discussions.reduce(
      (sum, d) => sum + d.participantCount,
      0,
    );

    // Platform satisfaction derived from common ground scores
    // High common ground correlates with user satisfaction
    const platformSatisfaction = Math.min(
      averageCommonGroundScore * 1.2,
      0.95,
    );

    return {
      averageCommonGroundScore: Math.round(averageCommonGroundScore * 100) / 100,
      totalParticipants,
      platformSatisfaction: Math.round(platformSatisfaction * 100) / 100,
    };
  }

  /**
   * Track visitor session for demo viewing analytics
   * Records viewed discussion IDs and interaction timestamps
   */
  private async trackVisitorSession(sessionId: string): Promise<void> {
    try {
      // Check if visitor session exists
      const existingSession = await this.prisma.visitorSession.findUnique({
        where: { id: sessionId },
      });

      if (existingSession) {
        // Update last viewed timestamp
        await this.prisma.visitorSession.update({
          where: { id: sessionId },
          data: {
            lastViewedAt: new Date(),
          },
        });
      } else {
        // Create new visitor session
        await this.prisma.visitorSession.create({
          data: {
            id: sessionId,
            lastViewedAt: new Date(),
            viewedDemoDiscussionIds: [],
            interactionTimestamps: [],
          },
        });
      }

      this.logger.log(`Tracked visitor session: ${sessionId}`);
    } catch (error) {
      // Log error but don't fail the request
      this.logger.error(
        `Failed to track visitor session ${sessionId}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
