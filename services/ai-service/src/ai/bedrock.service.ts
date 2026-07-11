/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import {
  BedrockClient,
  MockAIClient,
  type AIClientConfig,
  type IAIClient,
} from '@reason-bridge/ai-client';
import { LLM_DEFAULTS, LLM_PRESETS } from '../constants/index.js';

/**
 * Bedrock AI Service
 *
 * Provides AI-powered analysis capabilities using AWS Bedrock.
 * Integrates Claude 3 models for semantic analysis, clustering, and value detection.
 */
@Injectable()
export class BedrockService implements OnModuleDestroy {
  private readonly logger = new Logger(BedrockService.name);
  private readonly client: IAIClient | null;
  private readonly isConfigured: boolean;

  constructor() {
    // Initialize Bedrock client if credentials are available
    const region = process.env['AWS_REGION'] || 'us-east-1';
    const modelId = process.env['BEDROCK_MODEL_ID'] || 'anthropic.claude-3-sonnet-20240229-v1:0';

    // In test/E2E environments, route through a deterministic in-process mock so
    // runs never touch real AWS Bedrock (no spend, no host credentials, no network
    // flakiness). Enabled via AI_MOCK=true — see docker-compose.e2e.yml.
    if (process.env['AI_MOCK'] === 'true') {
      this.client = new MockAIClient();
      this.isConfigured = true;
      this.logger.log('🧪 Bedrock service initialized in MOCK mode (AI_MOCK=true)');
      return;
    }

    try {
      const config: AIClientConfig = {
        region,
        modelId,
        maxTokens: LLM_DEFAULTS.MAX_TOKENS,
        temperature: LLM_DEFAULTS.TEMPERATURE,
      };

      this.client = new BedrockClient(config);
      this.isConfigured = true;
      this.logger.log(`🤖 Bedrock service initialized with model: ${modelId}`);
    } catch (error) {
      this.logger.warn(
        '⚠️  Bedrock service initialized without credentials - AI features will be limited',
      );
      this.client = null;
      this.isConfigured = false;
    }
  }

  /**
   * Clean up AWS SDK resources on module shutdown
   */
  onModuleDestroy(): void {
    // Only the real BedrockClient owns AWS SDK resources; the mock has no destroy().
    const client = this.client as unknown as { destroy?: () => void } | null;
    if (client && typeof client.destroy === 'function') {
      client.destroy();
      this.logger.log('BedrockService client destroyed');
    }
  }

  /**
   * Check if the service is properly configured with AWS credentials
   */
  async isReady(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    return this.client.isReady();
  }

  /**
   * Perform a health check by sending a minimal request to Bedrock
   *
   * @returns Health check result with status and latency
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latencyMs: number;
    modelId: string;
    error?: string;
  }> {
    const startTime = Date.now();
    const modelId = process.env['BEDROCK_MODEL_ID'] || 'anthropic.claude-3-sonnet-20240229-v1:0';

    if (!this.isConfigured || !this.client) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        modelId,
        error: 'Bedrock client not configured',
      };
    }

    try {
      // Send a minimal request to verify connectivity
      const response = await this.client.complete({
        systemPrompt: 'Respond with OK only.',
        messages: [{ role: 'user', content: 'Health check' }],
        maxTokens: LLM_PRESETS.HEALTH_CHECK.maxTokens,
      });

      return {
        healthy: response.content.toLowerCase().includes('ok'),
        latencyMs: Date.now() - startTime,
        modelId,
      };
    } catch (error) {
      this.logger.error('Bedrock health check failed', error);
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze content using AI
   * @param content - The content to analyze
   * @returns Analysis result
   */
  async analyzeContent(content: string): Promise<{ analyzed: boolean; content: string }> {
    if (!this.isConfigured || !this.client) {
      this.logger.debug('Bedrock not configured, returning stub response');
      return {
        analyzed: true,
        content,
      };
    }

    try {
      const response = await this.client.complete({
        systemPrompt:
          'You are an expert content analyzer. Analyze the provided content for clarity, tone, and potential issues.',
        messages: [
          {
            role: 'user',
            content: `Analyze this content:\n\n${content}`,
          },
        ],
      });

      return {
        analyzed: true,
        content: response.content,
      };
    } catch (error) {
      this.logger.error('Failed to analyze content with Bedrock', error);
      return {
        analyzed: false,
        content,
      };
    }
  }

  /**
   * Moderate content for policy violations
   * @param content - The content to moderate
   * @returns Moderation result
   */
  async moderateContent(content: string): Promise<{ flagged: boolean; reason?: string }> {
    if (!this.isConfigured || !this.client) {
      this.logger.debug('Bedrock not configured, returning stub response');
      return {
        flagged: false,
      };
    }

    try {
      const response = await this.client.complete({
        systemPrompt:
          'You are a content moderation system. Analyze content for policy violations including hate speech, harassment, or harmful content. Respond with "SAFE" or "FLAGGED: [reason]".',
        messages: [
          {
            role: 'user',
            content: `Moderate this content:\n\n${content}`,
          },
        ],
        maxTokens: LLM_PRESETS.MODERATION.maxTokens,
      });

      const result = response.content.trim();
      const flagged = !result.startsWith('SAFE');

      if (flagged) {
        return {
          flagged: true,
          reason: result.replace(/^FLAGGED:\s*/, ''),
        };
      }
      return {
        flagged: false,
      };
    } catch (error) {
      this.logger.error('Failed to moderate content with Bedrock', error);
      return {
        flagged: false,
      };
    }
  }

  /**
   * Cluster semantically similar text items
   * @param texts - Array of texts to cluster
   * @param maxClusters - Maximum number of clusters to create
   * @returns Array of clusters with their members
   */
  async clusterTexts(
    texts: string[],
    maxClusters: number = 3,
  ): Promise<Array<{ theme: string; members: string[] }>> {
    if (!this.isConfigured || !this.client || texts.length === 0) {
      this.logger.debug('Bedrock not configured or no texts provided');
      return [];
    }

    try {
      const textList = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');

      const response = await this.client.complete({
        systemPrompt: `You are an expert at semantic clustering. Group similar texts by meaning.
Return ONLY a JSON array of clusters in this exact format:
[{"theme": "description", "members": [1, 2, 3]}]
where members are the numeric IDs of the texts.`,
        messages: [
          {
            role: 'user',
            content: `Cluster these ${texts.length} texts into at most ${maxClusters} semantic groups:\n\n${textList}`,
          },
        ],
        ...LLM_PRESETS.ANALYSIS,
      });

      // Parse JSON response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn('Failed to parse clustering response');
        return [];
      }

      const clusters = JSON.parse(jsonMatch[0]) as Array<{ theme: string; members: number[] }>;

      // Map member indices back to actual texts
      return clusters.map((cluster) => ({
        theme: cluster.theme,
        members: cluster.members
          .filter((idx) => idx > 0 && idx <= texts.length)
          .map((idx) => texts[idx - 1])
          .filter((text): text is string => text !== undefined),
      }));
    } catch (error) {
      this.logger.error('Failed to cluster texts with Bedrock', error);
      return [];
    }
  }

  /**
   * Identify underlying values in text
   * @param texts - Array of texts expressing positions
   * @returns Array of identified values
   */
  async identifyValues(texts: string[]): Promise<string[]> {
    if (!this.isConfigured || !this.client || texts.length === 0) {
      this.logger.debug('Bedrock not configured or no texts provided');
      return ['Underlying values will be identified through AI-powered moral foundations analysis'];
    }

    try {
      const textList = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');

      const response = await this.client.complete({
        systemPrompt: `You are an expert in moral psychology and value analysis. Identify the core values underlying different positions.
Focus on fundamental values like: fairness, liberty, loyalty, authority, sanctity, care, harm prevention, etc.
Return ONLY a JSON array of values: ["value1", "value2", "value3"]`,
        messages: [
          {
            role: 'user',
            content: `Identify the underlying values in these positions:\n\n${textList}`,
          },
        ],
        ...LLM_PRESETS.VALUE_ANALYSIS,
      });

      // Parse JSON response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn('Failed to parse values response');
        return ['Underlying values analysis incomplete'];
      }

      const values = JSON.parse(jsonMatch[0]) as string[];
      return values.length > 0
        ? values
        : ['Underlying values will be identified through AI-powered moral foundations analysis'];
    } catch (error) {
      this.logger.error('Failed to identify values with Bedrock', error);
      return ['Underlying values analysis failed'];
    }
  }

  /**
   * Generate clarifying explanation for misunderstanding
   * @param topic - The topic being misunderstood
   * @param interpretations - Different interpretations participants have
   * @returns Clarifying explanation
   */
  async generateClarification(
    topic: string,
    interpretations: Array<{ interpretation: string; participantCount: number }>,
  ): Promise<string> {
    if (!this.isConfigured || !this.client) {
      this.logger.debug('Bedrock not configured');
      return `This topic has ${interpretations.length} different interpretations, suggesting participants may interpret key terms differently. AI-powered semantic analysis will provide specific clarification.`;
    }

    try {
      const interpList = interpretations
        .map((i) => `- ${i.interpretation} (${i.participantCount} participants)`)
        .join('\n');

      const response = await this.client.complete({
        systemPrompt:
          'You are a mediator helping clarify misunderstandings. Provide a concise clarification that addresses different interpretations.',
        messages: [
          {
            role: 'user',
            content: `Topic: "${topic}"\n\nDifferent interpretations:\n${interpList}\n\nProvide a brief clarification (2-3 sentences max) to help participants understand the different perspectives.`,
          },
        ],
        ...LLM_PRESETS.CLARIFICATION,
      });

      return response.content.trim();
    } catch (error) {
      this.logger.error('Failed to generate clarification with Bedrock', error);
      return `This topic has ${interpretations.length} different interpretations. Consider clarifying key terms to align understanding.`;
    }
  }

  /**
   * Get a completion from Bedrock using custom prompts
   * Exposed for advanced use cases that need direct control over the prompt
   *
   * @param request - Completion request with system prompt and messages
   * @returns Completion response with generated content
   */
  async complete(request: {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ content: string }> {
    if (!this.isConfigured || !this.client) {
      throw new Error('Bedrock client not configured');
    }

    return this.client.complete(request);
  }
}
