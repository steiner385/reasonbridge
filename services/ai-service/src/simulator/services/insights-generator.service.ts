/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../../ai/bedrock.service.js';
import type { GenerateInsightsDto } from '../dto/generate-insights.dto.js';
import type { LearningInsights } from '../types/conversation-mode.types.js';

/**
 * Insights Generator Service for Discussion Simulator Persona Mode
 *
 * Analyzes completed simulation transcripts to generate learning insights for users.
 * The service:
 * - Accepts a transcript of the conversation with mode and persona context
 * - Identifies user strengths in argumentation
 * - Identifies areas for improvement
 * - Lists fallacies committed with exchange references and excerpts
 * - Recommends relevant readings based on identified weaknesses
 * - Provides an overall assessment of the user's argumentation skills
 *
 * @remarks
 * This service uses AI to analyze conversation patterns and provide educational
 * feedback to help users improve their argumentation and critical thinking skills.
 */
@Injectable()
export class InsightsGeneratorService {
  private readonly logger = new Logger(InsightsGeneratorService.name);

  constructor(private readonly bedrockService: BedrockService) {}

  /**
   * Generate learning insights from a completed simulation transcript
   *
   * @param dto - The insights generation request containing transcript, mode, and persona
   * @returns LearningInsights with strengths, improvements, fallacies, readings, and assessment
   */
  async generateInsights(dto: GenerateInsightsDto): Promise<LearningInsights> {
    const isReady = await this.bedrockService.isReady();
    if (!isReady) {
      return this.getFallbackInsights();
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(dto);

      const response = await this.bedrockService.complete({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 2048,
        temperature: 0.2,
      });

      return this.parseAIResponse(response.content);
    } catch (error) {
      this.logger.error('Failed to generate insights', error);
      return this.getFallbackInsights();
    }
  }

  /**
   * Build the system prompt instructing the AI on the expected JSON output format
   */
  private buildSystemPrompt(): string {
    return `You are an expert in argumentation analysis and critical thinking education.
Analyze discussion transcripts to provide constructive feedback for learners.

You MUST respond with a valid JSON object in this exact format:
{
  "strengths": ["List of specific argumentation strengths observed"],
  "improvements": ["List of specific areas where the user can improve"],
  "fallaciesCommitted": [
    {
      "type": "Name of the logical fallacy",
      "exchange": 1,
      "excerpt": "The exact text that contains the fallacy"
    }
  ],
  "recommendedReadings": [
    {
      "title": "Book or article title",
      "reason": "Why this reading would help"
    }
  ],
  "overallAssessment": "A 2-3 sentence summary of the user's argumentation performance"
}

Guidelines:
- Be specific and constructive in feedback
- Reference exact exchanges and quotes when identifying fallacies
- Recommend readings that address identified weaknesses
- Strengths should highlight effective argumentation techniques used
- Improvements should be actionable and specific
- The overall assessment should be balanced and encouraging`;
  }

  /**
   * Build the user prompt containing the transcript and context
   *
   * @param dto - The insights generation request
   */
  private buildUserPrompt(dto: GenerateInsightsDto): string {
    const { transcript, mode, persona, topicContext } = dto;

    let prompt = `Analyze this discussion transcript and provide learning insights.

CONVERSATION MODE: ${mode}
PERSONA: ${persona.name} (${persona.position}, ${persona.tone} tone)`;

    if (topicContext) {
      prompt += `\nTOPIC CONTEXT: ${topicContext}`;
    }

    prompt += `\n\nTRANSCRIPT:\n`;

    // Number exchanges for reference
    transcript.forEach((message, index) => {
      const exchangeNum = index + 1;
      const speaker = message.role === 'user' ? 'USER' : persona.name.toUpperCase();
      prompt += `\nExchange ${exchangeNum} (${speaker}):\n"${message.content}"\n`;
    });

    prompt += `\nProvide your analysis as a JSON object following the specified format.`;

    return prompt;
  }

  /**
   * Parse the AI response into a LearningInsights object
   *
   * @param content - The raw AI response content
   * @returns Parsed LearningInsights with defaults for missing fields
   */
  private parseAIResponse(content: string): LearningInsights {
    try {
      // Handle JSON wrapped in markdown code blocks
      let jsonContent = content;

      // Remove markdown code block wrapper if present
      const jsonBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonBlockMatch && jsonBlockMatch[1] !== undefined) {
        jsonContent = jsonBlockMatch[1];
      }

      // Also try to extract just the JSON object if there's extra text
      const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonContent = jsonObjectMatch[0];
      }

      const parsed = JSON.parse(jsonContent) as Partial<LearningInsights>;

      // Ensure all required fields are present with defaults
      return {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        fallaciesCommitted: Array.isArray(parsed.fallaciesCommitted)
          ? parsed.fallaciesCommitted
          : [],
        recommendedReadings: Array.isArray(parsed.recommendedReadings)
          ? parsed.recommendedReadings
          : [],
        overallAssessment:
          typeof parsed.overallAssessment === 'string' && parsed.overallAssessment.length > 0
            ? parsed.overallAssessment
            : 'Analysis completed.',
      };
    } catch (error) {
      this.logger.warn('Failed to parse AI response as JSON', error);
      return {
        strengths: [],
        improvements: [],
        fallaciesCommitted: [],
        recommendedReadings: [],
        overallAssessment:
          'Unable to generate detailed insights. Please review the transcript manually.',
      };
    }
  }

  /**
   * Generate fallback insights when AI service is unavailable
   */
  private getFallbackInsights(): LearningInsights {
    return {
      strengths: [],
      improvements: [],
      fallaciesCommitted: [],
      recommendedReadings: [],
      overallAssessment:
        'AI service temporarily unavailable. Please try again later to receive detailed learning insights.',
    };
  }
}
