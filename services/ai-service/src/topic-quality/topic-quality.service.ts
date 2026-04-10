/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { BedrockService } from '../ai/bedrock.service.js';
import {
  CheckTopicQualityDto,
  TopicQualityIssueType,
  TopicQualityRating,
} from './dto/topic-quality.dto.js';
import type { TopicQualityResponseDto, TopicQualityIssue } from './dto/topic-quality.dto.js';
import { LLM_PRESETS } from '../constants/index.js';

/**
 * Raw AI-parsed issue from LLM response
 */
interface AIParsedIssue {
  type: string;
  severity?: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  confidenceScore?: number;
}

/**
 * Service for analyzing topic quality
 * Feature 016: Topic Management (T214)
 *
 * Provides both fast regex-based analysis and optional AI-enhanced analysis
 * for checking topic title and description quality before publishing.
 */
@Injectable()
export class TopicQualityService {
  private readonly logger = new Logger(TopicQualityService.name);

  // Patterns for detecting quality issues
  private readonly loadedLanguagePatterns = [
    /\b(obviously|clearly|undeniably|indisputably|without question)\b/gi,
    /\b(everyone knows|it's a fact that|studies show|experts agree)\b/gi,
    /\b(always|never|all|none|every|no one)\b/gi,
  ];

  private readonly leadingQuestionPatterns = [
    /^(why do|why don't|how come|isn't it true)\b/i,
    /\?$/,
    /^(don't you think|wouldn't you agree|isn't it obvious)\b/i,
  ];

  private readonly oneSidedFramingPatterns = [
    /\b(the problem with|what's wrong with|the failure of)\b/gi,
    /\b(must be stopped|needs to end|should be banned)\b/gi,
    /\b(the only solution|the right way|the correct approach)\b/gi,
  ];

  private readonly vagueTitlePatterns = [
    /^(this|that|it|things|stuff|topic)\b/i,
    /^(what do you think|thoughts on|opinions about)\b/i,
    /^.{1,15}$/, // Very short titles
  ];

  constructor(@Optional() private readonly bedrockService?: BedrockService) {
    if (bedrockService) {
      this.logger.log('TopicQualityService initialized with AI support');
    } else {
      this.logger.log('TopicQualityService initialized (regex-only mode)');
    }
  }

  /**
   * Check the quality of a topic before publishing
   */
  async checkQuality(dto: CheckTopicQualityDto): Promise<TopicQualityResponseDto> {
    const issues: TopicQualityIssue[] = [];
    const strengths: string[] = [];

    // Run regex-based analysis (fast, <50ms)
    this.analyzeTitleQuality(dto.title, issues, strengths);
    this.analyzeDescriptionQuality(dto.description, issues, strengths);
    this.analyzeFramingBalance(dto.title, dto.description, issues, strengths);

    // Optionally enhance with AI analysis
    let usedAI = false;
    if (dto.useAI && this.bedrockService) {
      const aiReady = await this.bedrockService.isReady();
      if (aiReady) {
        try {
          const aiIssues = await this.runAIAnalysis(dto.title, dto.description);
          issues.push(...aiIssues);
          usedAI = true;
        } catch (error) {
          this.logger.warn('AI analysis failed, using regex-only results', error);
        }
      }
    }

    // Calculate score and rating
    const { score, rating } = this.calculateScoreAndRating(issues, strengths);

    // Generate summary
    const summary = this.generateSummary(rating, issues.length, strengths.length);

    return {
      rating,
      score,
      issues,
      strengths,
      summary,
      usedAI,
      analyzedAt: new Date(),
    };
  }

  /**
   * Analyze title quality
   */
  private analyzeTitleQuality(
    title: string,
    issues: TopicQualityIssue[],
    strengths: string[],
  ): void {
    // Check for vague titles
    for (const pattern of this.vagueTitlePatterns) {
      if (pattern.test(title)) {
        issues.push({
          type: TopicQualityIssueType.TITLE_TOO_VAGUE,
          severity: 'medium',
          message: 'The title is too vague or generic',
          suggestion: 'Use a more specific title that clearly identifies the topic of discussion',
          affectedText: title,
          confidenceScore: 0.8,
        });
        break;
      }
    }

    // Check for leading questions in title
    for (const pattern of this.leadingQuestionPatterns) {
      if (pattern.test(title)) {
        issues.push({
          type: TopicQualityIssueType.TITLE_TOO_LEADING,
          severity: 'medium',
          message: 'The title appears to be a leading question',
          suggestion:
            'Rephrase as a neutral statement or open question that invites multiple perspectives',
          affectedText: title,
          confidenceScore: 0.75,
        });
        break;
      }
    }

    // Check for good title characteristics
    if (title.length >= 20 && title.length <= 100) {
      strengths.push('Title length is appropriate for clarity');
    }

    if (/\b(vs|versus|and|or)\b/i.test(title)) {
      strengths.push('Title suggests multiple perspectives will be considered');
    }
  }

  /**
   * Analyze description quality
   */
  private analyzeDescriptionQuality(
    description: string,
    issues: TopicQualityIssue[],
    strengths: string[],
  ): void {
    // Check description length
    if (description.length < 100) {
      issues.push({
        type: TopicQualityIssueType.DESCRIPTION_TOO_SHORT,
        severity: 'high',
        message: 'The description is too short to provide adequate context',
        suggestion: 'Add more context, background information, or specific questions to explore',
        confidenceScore: 0.95,
      });
    }

    // Check for loaded language
    for (const pattern of this.loadedLanguagePatterns) {
      const matches = description.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          type: TopicQualityIssueType.LOADED_LANGUAGE,
          severity: 'medium',
          message: 'The description contains loaded or absolute language',
          suggestion: 'Consider using more neutral language that acknowledges complexity',
          affectedText: matches[0],
          confidenceScore: 0.7,
        });
        break;
      }
    }

    // Check for good description characteristics
    if (description.length >= 200) {
      strengths.push('Description provides substantial context');
    }

    if (/\?/.test(description)) {
      strengths.push('Description includes questions to guide discussion');
    }

    if (/\b(however|although|on the other hand|alternatively)\b/i.test(description)) {
      strengths.push('Description acknowledges multiple perspectives');
    }
  }

  /**
   * Analyze framing balance
   */
  private analyzeFramingBalance(
    title: string,
    description: string,
    issues: TopicQualityIssue[],
    strengths: string[],
  ): void {
    const combinedText = `${title} ${description}`;

    // Check for one-sided framing
    let oneSidedCount = 0;
    for (const pattern of this.oneSidedFramingPatterns) {
      const matches = combinedText.match(pattern);
      if (matches) {
        oneSidedCount += matches.length;
      }
    }

    if (oneSidedCount >= 2) {
      issues.push({
        type: TopicQualityIssueType.ONE_SIDED_FRAMING,
        severity: 'high',
        message: 'The topic appears to be framed in a one-sided manner',
        suggestion: 'Try to present the topic neutrally, inviting diverse viewpoints',
        confidenceScore: 0.8,
      });
    }

    // Check for balanced framing
    if (
      /\b(some argue|others believe|there are differing views|debate|discussion)\b/i.test(
        combinedText,
      )
    ) {
      strengths.push('Topic is framed in a balanced way that invites discussion');
    }
  }

  /**
   * Run AI-enhanced analysis for nuanced issues
   */
  private async runAIAnalysis(title: string, description: string): Promise<TopicQualityIssue[]> {
    if (!this.bedrockService) {
      return [];
    }

    const systemPrompt = `You are an expert at evaluating discussion topic quality for a rational discourse platform.
Analyze the given topic title and description for quality issues that might hinder productive discussion.

Focus on detecting:
1. Implicit assumptions or biases
2. Scope issues (too broad or too narrow)
3. Missing context that would be helpful
4. Framing that might discourage certain perspectives

Return ONLY a JSON array of issues in this exact format:
[{"type": "one_sided_framing|missing_context|too_broad|too_narrow", "severity": "low|medium|high", "message": "description of issue", "suggestion": "how to improve", "confidenceScore": 0.0-1.0}]

If no issues are found, return an empty array: []`;

    const userMessage = `Title: ${title}

Description: ${description}

Analyze this topic for quality issues.`;

    const response = await this.bedrockService.complete({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      ...LLM_PRESETS.TOPIC_QUALITY,
    });

    // Extract JSON from response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as AIParsedIssue[];
      return parsed.map(
        (issue: AIParsedIssue): TopicQualityIssue => ({
          type: this.mapAIIssueType(issue.type),
          severity: issue.severity ?? 'medium',
          message: issue.message,
          suggestion: issue.suggestion,
          confidenceScore: issue.confidenceScore || 0.7,
        }),
      );
    } catch (parseError) {
      this.logger.warn('Failed to parse AI analysis JSON response', parseError);
      return [];
    }
  }

  /**
   * Map AI issue type string to enum
   */
  private mapAIIssueType(type: string): TopicQualityIssueType {
    const mapping: Record<string, TopicQualityIssueType> = {
      one_sided_framing: TopicQualityIssueType.ONE_SIDED_FRAMING,
      missing_context: TopicQualityIssueType.MISSING_CONTEXT,
      too_broad: TopicQualityIssueType.TOO_BROAD,
      too_narrow: TopicQualityIssueType.TOO_NARROW,
      loaded_language: TopicQualityIssueType.LOADED_LANGUAGE,
    };
    return mapping[type] || TopicQualityIssueType.DESCRIPTION_UNCLEAR;
  }

  /**
   * Calculate overall score and rating
   */
  private calculateScoreAndRating(
    issues: TopicQualityIssue[],
    strengths: string[],
  ): { score: number; rating: TopicQualityRating } {
    // Start with base score of 100
    let score = 100;

    // Deduct points for issues based on severity
    for (const issue of issues) {
      switch (issue.severity) {
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Add bonus for strengths (max 10 points)
    score += Math.min(strengths.length * 3, 10);

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine rating
    let rating: TopicQualityRating;
    if (score >= 85) {
      rating = TopicQualityRating.EXCELLENT;
    } else if (score >= 70) {
      rating = TopicQualityRating.GOOD;
    } else if (score >= 50) {
      rating = TopicQualityRating.NEEDS_IMPROVEMENT;
    } else {
      rating = TopicQualityRating.POOR;
    }

    return { score, rating };
  }

  /**
   * Generate a human-readable summary
   */
  private generateSummary(
    rating: TopicQualityRating,
    issueCount: number,
    strengthCount: number,
  ): string {
    switch (rating) {
      case TopicQualityRating.EXCELLENT:
        return 'This topic is well-crafted and ready for productive discussion.';
      case TopicQualityRating.GOOD:
        return `This topic is good overall with ${issueCount} minor suggestion${issueCount !== 1 ? 's' : ''} for improvement.`;
      case TopicQualityRating.NEEDS_IMPROVEMENT:
        return `This topic has ${issueCount} issue${issueCount !== 1 ? 's' : ''} that should be addressed before publishing.`;
      case TopicQualityRating.POOR:
        return `This topic needs significant revision. Please address the ${issueCount} issue${issueCount !== 1 ? 's' : ''} identified.`;
    }
  }
}
