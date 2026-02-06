/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BedrockService } from '../ai/bedrock.service.js';
import {
  GenerateResponseDto,
  GenerateResponseResultDto,
  GeneratePositionsDto,
  GeneratePositionsResultDto,
  GeneratePromptDto,
  GeneratePromptResultDto,
  PersonaTone,
} from './dto/index.js';

/**
 * Service for discussion simulator functionality
 * Generates AI-driven discussion responses and positions
 */
@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(private readonly bedrockService: BedrockService) {}

  /**
   * Generate opposing positions for a custom topic
   * Analyzes a topic and suggests two contrasting positions
   */
  async generatePositions(dto: GeneratePositionsDto): Promise<GeneratePositionsResultDto> {
    this.logger.log(`Generating positions for topic: ${dto.topicTitle}`);

    const systemPrompt = `You are an expert at identifying genuine philosophical and value-based disagreements on controversial topics.
Your task is to generate two contrasting positions that represent authentic viewpoints people might hold.

IMPORTANT: Return ONLY valid JSON with this exact structure:
{
  "positionA": {
    "label": "Brief label (3-5 words)",
    "summary": "One paragraph summary of this position",
    "suggestedPersona": "Suggested persona name"
  },
  "positionB": {
    "label": "Brief label (3-5 words)",
    "summary": "One paragraph summary of this position",
    "suggestedPersona": "Suggested persona name"
  }
}

Do not include any text outside the JSON object.`;

    const userPrompt = `Topic: ${dto.topicTitle}
${dto.context ? `Context: ${dto.context}\n` : ''}
Generate two genuinely contrasting positions that:
1. Represent different core values or principles
2. Are both intellectually defensible
3. Reflect real viewpoints people hold
4. Avoid strawman or extreme positions

Return only the JSON object as specified.`;

    try {
      const response = await this.bedrockService.complete({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 1024,
        temperature: 0.7,
      });

      // Parse JSON from response
      let jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error(`Failed to parse JSON from response: ${response.content}`);
        throw new BadRequestException('Failed to parse positions from AI response');
      }

      const positions = JSON.parse(jsonMatch[0]);

      return {
        positionA: positions.positionA,
        positionB: positions.positionB,
      };
    } catch (error) {
      this.logger.error('Failed to generate positions', error);
      throw new BadRequestException('Failed to generate positions');
    }
  }

  /**
   * Generate an AI agent response based on persona configuration
   */
  async generateResponse(dto: GenerateResponseDto): Promise<GenerateResponseResultDto> {
    if (!dto.customPersona) {
      throw new BadRequestException('Custom persona is required');
    }

    this.logger.log(`Generating response for persona: ${dto.customPersona.name}`);

    const systemPrompt = this.buildPersonaSystemPrompt(dto);

    const conversationContext =
      dto.discussionHistory && dto.discussionHistory.length > 0
        ? `\n\nConversation history:\n${dto.discussionHistory.join('\n\n')}`
        : '';

    const userPrompt =
      dto.action === 'draft'
        ? `Topic: ${dto.topicTitle || 'General Discussion'}${conversationContext}

Write a thoughtful response that represents your persona's viewpoint. Your response should:
1. Reflect your stated values and communication style
2. Engage with any previous points in the discussion
3. Be 2-3 paragraphs
4. Stay in character

Respond as ${dto.customPersona.name}.`
        : `Topic: ${dto.topicTitle || 'General Discussion'}${conversationContext}

Current draft:
${dto.currentDraft}

Feedback received:
${dto.feedback?.map((f) => `- ${f.suggestionText}: ${f.reasoning}`).join('\n')}

Revise the draft to address the feedback while maintaining your persona's voice and values.`;

    try {
      const response = await this.bedrockService.complete({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 2048,
        temperature: 0.8,
      });

      return {
        content: response.content,
        reasoning: `Generated response based on ${dto.customPersona.name}'s ${dto.customPersona.tone} tone with ${dto.customPersona.receptiveness * 100}% receptiveness`,
        revisedAreas: dto.action === 'revise' ? ['Content revised based on feedback'] : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to generate response', error);
      throw new BadRequestException('Failed to generate response');
    }
  }

  /**
   * Generate system prompt from custom persona config
   */
  async generatePrompt(dto: GeneratePromptDto): Promise<GeneratePromptResultDto> {
    const prompt = this.buildPersonaSystemPrompt({
      customPersona: dto.persona,
      topicTitle: dto.topicTitle,
      action: 'draft',
      discussionId: 'sim',
    });

    return { systemPrompt: prompt };
  }

  /**
   * Build a system prompt from persona configuration
   */
  private buildPersonaSystemPrompt(
    dto:
      | GenerateResponseDto
      | {
          customPersona: GenerateResponseDto['customPersona'];
          topicTitle?: string;
          action: string;
          discussionId: string;
        },
  ): string {
    const persona = dto.customPersona!;

    const toneDescriptions = {
      [PersonaTone.MEASURED]: 'calm, balanced, and diplomatic',
      [PersonaTone.ANALYTICAL]: 'logical, data-driven, and methodical',
      [PersonaTone.PASSIONATE]: 'enthusiastic, emotionally engaged, and compelling',
      [PersonaTone.CONFRONTATIONAL]: 'direct, challenging, and assertive',
    };

    const receptivenessDescription =
      persona.receptiveness >= 0.7
        ? 'very open to opposing views and willing to find common ground'
        : persona.receptiveness >= 0.4
          ? 'moderately open to different perspectives but firm in your values'
          : 'strongly committed to your position with limited flexibility';

    return `You are ${persona.name}, a discussion participant with the following characteristics:

Core Values: ${persona.values.join(', ')}

Communication Style:
- Tone: ${toneDescriptions[persona.tone as PersonaTone]}
- Receptiveness: ${receptivenessDescription}
- Uses emotional appeals: ${persona.usesEmotionalAppeals ? 'Yes' : 'No'}
- Cites data/statistics: ${persona.citesData ? 'Yes' : 'No'}
- Asks clarifying questions: ${persona.asksQuestions ? 'Yes' : 'No'}
${persona.biases && persona.biases.length > 0 ? `\nCognitive Biases to simulate: ${persona.biases.join(', ')}` : ''}

Your task is to participate in a discussion while authentically representing these characteristics.
Stay in character and let your values guide your arguments.`;
  }
}
