import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface BotDetectionResult {
  isSuspicious: boolean;
  riskScore: number; // 0.0 - 1.0
  patterns: string[];
  reasoning: string;
}

export interface CoordinationPattern {
  pattern: string;
  confidence: number;
  affectedUserIds?: string[];
}

@Injectable()
export class BotDetectorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Detect if a new user account exhibits suspicious bot-like patterns
   * @param userId - The user ID to analyze
   * @returns Detection result with risk score and patterns identified
   */
  async detectNewAccountBotPatterns(userId: string): Promise<BotDetectionResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        responses: {
          select: { id: true, createdAt: true, topicId: true },
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const patterns: string[] = [];
    let riskScore = 0;

    // Check 1: Account age - new accounts are higher risk
    const accountAgeHours = this.getHoursSinceCreation(user.createdAt);
    if (accountAgeHours < 24) {
      patterns.push('very_new_account');
      riskScore += 0.15;
    } else if (accountAgeHours < 168) {
      // 1 week
      patterns.push('new_account');
      riskScore += 0.1;
    }

    // Check 2: Rapid posting pattern - many responses in short timeframe
    if (user.responses.length > 0) {
      const postingSpeedResult = this.analyzePostingSpeed(user.responses);
      if (postingSpeedResult.isRapid) {
        patterns.push('rapid_posting');
        riskScore += postingSpeedResult.riskContribution;
      }
    }

    // Check 3: Topic concentration - posting only on specific topics (narrow focus)
    if (user.responses.length >= 5) {
      const topicConcentrationResult = this.analyzeTopicConcentration(user.responses);
      if (topicConcentrationResult.isConcentrated) {
        patterns.push('topic_concentration');
        riskScore += topicConcentrationResult.riskContribution;
      }
    }

    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 1.0);

    const isSuspicious = riskScore >= 0.4; // Threshold for requiring additional verification

    return {
      isSuspicious,
      riskScore,
      patterns,
      reasoning: this.generateReasoning(patterns, riskScore, accountAgeHours),
    };
  }

  /**
   * Detect coordinated posting patterns across multiple accounts
   * Identifies groups of accounts posting similar content in same topics
   * @param topicId - Topic to analyze for coordination patterns
   * @returns Array of detected coordination patterns with affected users
   */
  async detectCoordinatedPostingPatterns(
    topicId: string,
  ): Promise<CoordinationPattern[]> {
    const responses = await this.prisma.response.findMany({
      where: { topicId },
      include: {
        author: { select: { id: true, createdAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (responses.length < 5) {
      // Need minimum responses to detect coordination
      return [];
    }

    const patterns: CoordinationPattern[] = [];

    // Check 1: Timing coordination - multiple new accounts posting within short windows
    const timingPattern = this.analyzeTimingCoordination(responses);
    if (timingPattern.confidence > 0.6) {
      patterns.push(timingPattern);
    }

    // Check 2: Account age coordination - multiple very new accounts on same topic
    const accountAgePattern = this.analyzeAccountAgeCoordination(responses);
    if (accountAgePattern.confidence > 0.6) {
      patterns.push(accountAgePattern);
    }

    return patterns;
  }

  /**
   * Analyze if an account shows rapid posting behavior
   */
  private analyzePostingSpeed(
    responses: Array<{ id: string; createdAt: Date }>,
  ): { isRapid: boolean; riskContribution: number } {
    if (responses.length < 3) {
      return { isRapid: false, riskContribution: 0 };
    }

    // Calculate average time between posts
    const timeDifferences: number[] = [];
    for (let i = 1; i < responses.length; i++) {
      const current = responses[i];
      const previous = responses[i - 1];
      if (!current || !previous) continue;

      const diffMs = current.createdAt.getTime() - previous.createdAt.getTime();
      timeDifferences.push(diffMs);
    }

    const avgTimeBetweenPostsMs =
      timeDifferences.reduce((a, b) => a + b, 0) / timeDifferences.length;
    const avgTimeBetweenPostsMinutes = avgTimeBetweenPostsMs / (1000 * 60);

    // Rapid: average less than 5 minutes between posts
    if (avgTimeBetweenPostsMinutes < 5) {
      return { isRapid: true, riskContribution: 0.25 };
    }

    // Moderately rapid: average less than 15 minutes
    if (avgTimeBetweenPostsMinutes < 15) {
      return { isRapid: true, riskContribution: 0.1 };
    }

    return { isRapid: false, riskContribution: 0 };
  }

  /**
   * Analyze if account posts only in narrow topic range (indicator of targeted campaigns)
   */
  private analyzeTopicConcentration(
    responses: Array<{ id: string; topicId: string }>,
  ): { isConcentrated: boolean; riskContribution: number } {
    const uniqueTopics = new Set(responses.map((r) => r.topicId));
    const concentrationRatio = uniqueTopics.size / responses.length;

    // If posting 5+ times but only in 1-2 topics, shows narrow focus
    if (concentrationRatio < 0.4) {
      return { isConcentrated: true, riskContribution: 0.1 };
    }

    return { isConcentrated: false, riskContribution: 0 };
  }

  /**
   * Detect if multiple new accounts are posting in same topic at similar times
   */
  private analyzeTimingCoordination(
    responses: Array<{ author: { id: string; createdAt: Date }; createdAt: Date }>,
  ): CoordinationPattern {
    // Group responses by time windows (5-minute buckets)
    const timeWindows = new Map<number, string[]>();

    responses.forEach((response) => {
      const windowKey = Math.floor(response.createdAt.getTime() / (5 * 60 * 1000));
      if (!timeWindows.has(windowKey)) {
        timeWindows.set(windowKey, []);
      }
      timeWindows.get(windowKey)!.push(response.author.id);
    });

    // Find time windows with multiple different authors
    let coordinationCount = 0;
    const coordinatedUsers = new Set<string>();

    timeWindows.forEach((userIds) => {
      const uniqueUsers = new Set(userIds);
      if (uniqueUsers.size >= 3) {
        coordinationCount++;
        uniqueUsers.forEach((uid) => coordinatedUsers.add(uid));
      }
    });

    // Calculate confidence based on how many coordinated posting events occurred
    const confidence = Math.min(coordinationCount / 5, 1.0);

    return {
      pattern: 'timing_coordination',
      confidence,
      affectedUserIds: Array.from(coordinatedUsers),
    };
  }

  /**
   * Detect if multiple very new accounts are posting in same topic
   */
  private analyzeAccountAgeCoordination(
    responses: Array<{ author: { id: string; createdAt: Date }; createdAt: Date }>,
  ): CoordinationPattern {
    // Find accounts created within last 24 hours
    const newAccounts = responses
      .filter((r) => this.getHoursSinceCreation(r.author.createdAt) < 24)
      .map((r) => r.author.id);

    const uniqueNewAccounts = new Set(newAccounts);

    // If 3+ very new accounts posting in same topic, suspicious
    if (uniqueNewAccounts.size >= 3) {
      const confidence = Math.min(uniqueNewAccounts.size / 10, 1.0); // Higher confidence with more accounts
      return {
        pattern: 'new_account_coordination',
        confidence,
        affectedUserIds: Array.from(uniqueNewAccounts),
      };
    }

    return {
      pattern: 'new_account_coordination',
      confidence: 0,
    };
  }

  /**
   * Get hours since account creation
   */
  private getHoursSinceCreation(createdAt: Date): number {
    const nowMs = Date.now();
    const createdMs = createdAt.getTime();
    return (nowMs - createdMs) / (1000 * 60 * 60);
  }

  /**
   * Generate human-readable reasoning for the detection result
   */
  private generateReasoning(
    patterns: string[],
    riskScore: number,
    accountAgeHours: number,
  ): string {
    if (patterns.length === 0) {
      return 'No suspicious patterns detected.';
    }

    const parts: string[] = [];

    if (patterns.includes('very_new_account')) {
      parts.push(`Account created ${Math.round(accountAgeHours)} hours ago`);
    } else if (patterns.includes('new_account')) {
      parts.push(`Account created ${Math.round(accountAgeHours)} hours ago`);
    }

    if (patterns.includes('rapid_posting')) {
      parts.push('posting unusually frequently');
    }

    if (patterns.includes('topic_concentration')) {
      parts.push('focused posting on limited topics');
    }

    const reasoning = parts.join(', ') + '.';
    const threshold =
      riskScore >= 0.6
        ? 'High risk of automated behavior. '
        : 'Moderate risk of automated behavior. ';

    return threshold + reasoning;
  }
}
