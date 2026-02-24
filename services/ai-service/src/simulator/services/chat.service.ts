/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../../ai/bedrock.service.js';
import { ModePromptBuilder } from './mode-prompt-builder.js';
import type { ChatRequestDto } from '../dto/chat-request.dto.js';

/**
 * Response from the chat service containing the AI persona's response
 */
export interface ChatResponse {
  /** The AI-generated response in character as the persona */
  response: string;
  /** Name of the persona that generated this response */
  personaName: string;
  /** ISO 8601 timestamp when the response was generated */
  timestamp: string;
}

/**
 * Chat Service for Discussion Simulator Persona Mode
 *
 * Generates AI persona responses for simulated discussions. The service:
 * - Builds persona prompts from configuration (name, position, tone, etc.)
 * - Uses ModePromptBuilder for conversation mode and difficulty instructions
 * - Formats conversation history for contextual responses
 * - Calls BedrockService to generate natural language responses
 *
 * @remarks
 * This service is the core engine for persona-based discussions, enabling
 * users to practice argumentation against AI personas with different styles
 * and debate strategies.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly modePromptBuilder: ModePromptBuilder,
  ) {}

  /**
   * Generate a persona response for the current conversation state
   *
   * @param dto - The chat request containing persona config, mode, and conversation
   * @returns ChatResponse with the AI-generated response
   */
  async generateResponse(dto: ChatRequestDto): Promise<ChatResponse> {
    const isReady = await this.bedrockService.isReady();
    if (!isReady) {
      return this.getFallbackResponse(dto.persona.name);
    }

    try {
      const personaPrompt = this.buildPersonaPrompt(dto);
      const systemPrompt = this.modePromptBuilder.buildFullSystemPrompt(
        personaPrompt,
        dto.mode,
        dto.difficulty,
      );

      const messages = this.formatConversationHistory(dto);

      const response = await this.bedrockService.complete({
        systemPrompt,
        messages,
        maxTokens: 1024,
        temperature: 0.7, // Moderate temperature for natural, varied responses
      });

      return {
        response: response.content,
        personaName: dto.persona.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to generate persona response', error);
      return this.getFallbackResponse(dto.persona.name);
    }
  }

  /**
   * Build the persona-specific system prompt section
   *
   * @param dto - The chat request with persona configuration
   * @returns Formatted persona prompt string
   */
  private buildPersonaPrompt(dto: ChatRequestDto): string {
    const { persona, topicContext } = dto;

    const argumentationStyle = this.formatArgumentationStyle(persona.argumentation);
    const receptivenessDescription = this.describeReceptiveness(persona.receptiveness);

    let prompt = `PERSONA: ${persona.name}
POSITION: ${persona.position}
BACKGROUND: ${persona.background}
TONE: ${persona.tone}

RECEPTIVENESS: ${receptivenessDescription}
Your receptiveness to changing position is ${persona.receptiveness.toFixed(1)}/1.0.

ARGUMENTATION STYLE:
${argumentationStyle}`;

    if (persona.exampleArguments && persona.exampleArguments.length > 0) {
      prompt += `

EXAMPLE ARGUMENTS (use similar style):
${persona.exampleArguments.map((arg) => `- "${arg}"`).join('\n')}`;
    }

    if (topicContext) {
      prompt += `

TOPIC CONTEXT:
${topicContext}`;
    }

    return prompt;
  }

  /**
   * Format the argumentation configuration into readable instructions
   */
  private formatArgumentationStyle(
    argumentation: ChatRequestDto['persona']['argumentation'],
  ): string {
    const styles: string[] = [];

    if (argumentation.usesEmotionalAppeals) {
      styles.push('- Use emotional appeals and personal stories to connect');
    } else {
      styles.push('- Avoid emotional appeals, focus on logic and facts');
    }

    if (argumentation.citesData) {
      styles.push('- Cite data, statistics, and research to support claims');
    } else {
      styles.push('- Focus on reasoning and principles rather than data');
    }

    if (argumentation.asksQuestions) {
      styles.push('- Ask probing questions to challenge assumptions');
    } else {
      styles.push('- Make direct statements and assertions');
    }

    return styles.join('\n');
  }

  /**
   * Describe receptiveness level in human-readable terms
   */
  private describeReceptiveness(receptiveness: number): string {
    if (receptiveness >= 0.8) {
      return 'Very open to persuasion - willing to change position if convinced';
    } else if (receptiveness >= 0.6) {
      return 'Moderately open - will acknowledge good points but defends position';
    } else if (receptiveness >= 0.4) {
      return 'Somewhat resistant - defends position firmly but can be moved';
    } else if (receptiveness >= 0.2) {
      return 'Quite resistant - rarely concedes points, strongly defends position';
    } else {
      return 'Very resistant - almost never concedes, highly confrontational';
    }
  }

  /**
   * Format conversation history for the AI model
   *
   * Maps 'persona' role to 'assistant' for the AI context
   */
  private formatConversationHistory(
    dto: ChatRequestDto,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add conversation history
    for (const msg of dto.conversationHistory) {
      messages.push({
        // Map 'persona' to 'assistant' for the AI model
        role: msg.role === 'persona' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: dto.userMessage,
    });

    return messages;
  }

  /**
   * Generate a fallback response when AI service is unavailable
   */
  private getFallbackResponse(personaName: string): ChatResponse {
    return {
      response:
        'AI service temporarily unavailable. Please try again in a moment. ' +
        'The discussion simulator requires an active AI connection to generate persona responses.',
      personaName,
      timestamp: new Date().toISOString(),
    };
  }
}
