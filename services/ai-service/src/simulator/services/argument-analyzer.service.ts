/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../../ai/bedrock.service.js';
import type { ArgumentAnalysis } from '../types/conversation-mode.types.js';
import type { AnalyzeArgumentDto } from '../dto/analyze-argument.dto.js';

@Injectable()
export class ArgumentAnalyzerService {
  private readonly logger = new Logger(ArgumentAnalyzerService.name);

  constructor(private readonly bedrockService: BedrockService) {}

  async analyze(dto: AnalyzeArgumentDto): Promise<ArgumentAnalysis> {
    const isReady = await this.bedrockService.isReady();
    if (!isReady) {
      return this.getFallbackAnalysis();
    }

    try {
      const systemPrompt = this.buildAnalysisPrompt();
      const userPrompt = this.buildUserPrompt(dto);

      const response = await this.bedrockService.complete({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 1024,
        temperature: 0.3,
      });

      return this.parseAnalysisResponse(response.content);
    } catch (error) {
      this.logger.error('Failed to analyze argument', error);
      return this.getFallbackAnalysis();
    }
  }

  private buildAnalysisPrompt(): string {
    return `You are an argument analysis engine. Analyze the user's message for:

1. LOGICAL FALLACIES: Identify any logical fallacies (ad hominem, strawman, slippery slope, false dichotomy, appeal to authority, etc.)
2. UNSUPPORTED CLAIMS: List claims made without evidence
3. TONE: Score civility 0-10 (10 = perfectly civil)
4. EVIDENCE: Score evidence quality 0-10 (10 = well-supported)
5. COHERENCE: Score logical coherence 0-10 (10 = perfectly coherent)
6. SUGGESTIONS: Provide 2-3 actionable improvements

Respond ONLY with valid JSON in this exact format:
{
  "fallacies": [{"type": "string", "description": "string", "excerpt": "string", "severity": "minor|moderate|major"}],
  "unsupportedClaims": ["string"],
  "toneScore": number,
  "evidenceScore": number,
  "coherenceScore": number,
  "suggestions": ["string"]
}`;
  }

  private buildUserPrompt(dto: AnalyzeArgumentDto): string {
    let prompt = `Analyze this argument:\n\n"${dto.userMessage}"`;

    if (dto.conversationContext.length > 0) {
      const context = dto.conversationContext
        .slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');
      prompt += `\n\nConversation context:\n${context}`;
    }

    return prompt;
  }

  private parseAnalysisResponse(content: string): ArgumentAnalysis {
    try {
      const parsed = JSON.parse(content);
      return {
        fallacies: parsed.fallacies || [],
        unsupportedClaims: parsed.unsupportedClaims || [],
        toneScore: parsed.toneScore ?? 5,
        evidenceScore: parsed.evidenceScore ?? 5,
        coherenceScore: parsed.coherenceScore ?? 5,
        suggestions: parsed.suggestions || [],
      };
    } catch {
      return this.getFallbackAnalysis();
    }
  }

  private getFallbackAnalysis(): ArgumentAnalysis {
    return {
      fallacies: [],
      unsupportedClaims: [],
      toneScore: 5,
      evidenceScore: 5,
      coherenceScore: 5,
      suggestions: ['Analysis unavailable - AI service temporarily down'],
    };
  }
}
