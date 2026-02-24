/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the bedrock service module to prevent AWS SDK loading
vi.mock('../../ai/bedrock.service.js', () => ({
  BedrockService: vi.fn(),
}));

import { ChatService } from './chat.service.js';
import { ModePromptBuilder } from './mode-prompt-builder.js';
import type { ChatRequestDto } from '../dto/chat-request.dto.js';

describe('ChatService', () => {
  let service: ChatService;
  let mockBedrockService: {
    isReady: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
  };
  let modePromptBuilder: ModePromptBuilder;

  const createValidRequest = (overrides: Partial<ChatRequestDto> = {}): ChatRequestDto => ({
    persona: {
      name: 'The Skeptic',
      position: 'Questions all claims and demands evidence',
      background: 'A rigorous analytical thinker',
      tone: 'analytical' as const,
      receptiveness: 0.7,
      argumentation: {
        usesEmotionalAppeals: false,
        citesData: true,
        asksQuestions: true,
      },
    },
    mode: 'socratic',
    difficulty: 'intermediate',
    userMessage: 'I believe climate change is primarily caused by human activity.',
    conversationHistory: [],
    ...overrides,
  });

  beforeEach(() => {
    mockBedrockService = {
      isReady: vi.fn().mockResolvedValue(true),
      complete: vi.fn(),
    };
    modePromptBuilder = new ModePromptBuilder();
    service = new ChatService(
      mockBedrockService as unknown as InstanceType<
        typeof import('../../ai/bedrock.service.js').BedrockService
      >,
      modePromptBuilder,
    );
  });

  describe('generateResponse', () => {
    it('should return a valid ChatResponse with persona response', async () => {
      const expectedResponse = 'What specific evidence supports that claim? Have you considered...';
      mockBedrockService.complete.mockResolvedValue({
        content: expectedResponse,
      });

      const request = createValidRequest();
      const result = await service.generateResponse(request);

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('personaName');
      expect(result).toHaveProperty('timestamp');
      expect(result.response).toBe(expectedResponse);
      expect(result.personaName).toBe('The Skeptic');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should call BedrockService with properly constructed system prompt', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'Test response',
      });

      const request = createValidRequest();
      await service.generateResponse(request);

      expect(mockBedrockService.complete).toHaveBeenCalledTimes(1);
      const callArgs = mockBedrockService.complete.mock.calls[0][0];

      // System prompt should contain persona information
      expect(callArgs.systemPrompt).toContain('The Skeptic');
      expect(callArgs.systemPrompt).toContain('Questions all claims and demands evidence');
      expect(callArgs.systemPrompt).toContain('analytical');

      // System prompt should contain mode instructions
      expect(callArgs.systemPrompt).toContain('Socratic');

      // System prompt should contain difficulty instructions
      expect(callArgs.systemPrompt).toContain('Intermediate');
    });

    it('should use ModePromptBuilder for mode and difficulty instructions', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'Test response',
      });

      const builderSpy = vi.spyOn(modePromptBuilder, 'buildFullSystemPrompt');

      const request = createValidRequest({
        mode: 'debate',
        difficulty: 'expert',
      });
      await service.generateResponse(request);

      expect(builderSpy).toHaveBeenCalledWith(expect.any(String), 'debate', 'expert');
    });

    it('should return fallback response when BedrockService is not ready', async () => {
      mockBedrockService.isReady.mockResolvedValue(false);

      const request = createValidRequest();
      const result = await service.generateResponse(request);

      expect(result.response).toContain('AI service temporarily unavailable');
      expect(result.personaName).toBe('The Skeptic');
      expect(mockBedrockService.complete).not.toHaveBeenCalled();
    });

    it('should format conversation history correctly in messages', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'Follow-up response',
      });

      const request = createValidRequest({
        conversationHistory: [
          { role: 'user', content: 'Initial claim about the topic' },
          { role: 'persona', content: 'What evidence supports that?' },
          { role: 'user', content: 'Here is some evidence...' },
        ],
        userMessage: 'And here is more evidence.',
      });

      await service.generateResponse(request);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];

      // Messages should include conversation history plus current user message
      expect(callArgs.messages).toHaveLength(4);

      // First message should be from user
      expect(callArgs.messages[0]).toEqual({
        role: 'user',
        content: 'Initial claim about the topic',
      });

      // Persona messages should be mapped to assistant role for the AI
      expect(callArgs.messages[1]).toEqual({
        role: 'assistant',
        content: 'What evidence supports that?',
      });

      // Last message should be the current user message
      expect(callArgs.messages[3]).toEqual({
        role: 'user',
        content: 'And here is more evidence.',
      });
    });

    it('should handle BedrockService errors gracefully', async () => {
      mockBedrockService.complete.mockRejectedValue(new Error('API error'));

      const request = createValidRequest();
      const result = await service.generateResponse(request);

      expect(result.response).toContain('AI service temporarily unavailable');
      expect(result.personaName).toBe('The Skeptic');
    });

    it('should include topic context in user message when provided', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'Response with context',
      });

      const request = createValidRequest({
        topicContext: 'Discussion about environmental policy and climate change solutions',
        userMessage: 'Carbon taxes would be effective.',
      });

      await service.generateResponse(request);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];
      const systemPrompt = callArgs.systemPrompt;

      expect(systemPrompt).toContain(
        'Discussion about environmental policy and climate change solutions',
      );
    });

    it('should build persona prompt with argumentation style', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'Test response',
      });

      const request = createValidRequest({
        persona: {
          name: 'The Advocate',
          position: 'Strongly supports the policy',
          background: 'Policy expert',
          tone: 'passionate',
          receptiveness: 0.5,
          argumentation: {
            usesEmotionalAppeals: true,
            citesData: false,
            asksQuestions: false,
          },
          exampleArguments: ['Think of the children!', 'This is a moral imperative.'],
        },
      });

      await service.generateResponse(request);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];

      // System prompt should reflect argumentation style
      expect(callArgs.systemPrompt).toContain('emotional appeals');
      expect(callArgs.systemPrompt).toContain('passionate');
    });

    it('should handle different conversation modes correctly', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'Test response',
      });

      const modes = ['socratic', 'debate', 'steelman', 'common_ground'] as const;

      for (const mode of modes) {
        vi.clearAllMocks();
        const request = createValidRequest({ mode });
        await service.generateResponse(request);

        const callArgs = mockBedrockService.complete.mock.calls[0][0];
        expect(callArgs.systemPrompt.length).toBeGreaterThan(0);
      }
    });

    it('should use appropriate temperature for conversational responses', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'Test response',
      });

      const request = createValidRequest();
      await service.generateResponse(request);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];

      // Temperature should be moderate for natural conversation (0.5-0.7)
      expect(callArgs.temperature).toBeGreaterThanOrEqual(0.5);
      expect(callArgs.temperature).toBeLessThanOrEqual(0.8);
    });

    it('should include receptiveness level in persona behavior', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'Test response',
      });

      const request = createValidRequest({
        persona: {
          name: 'Stubborn Debater',
          position: 'Will not budge',
          background: 'Very set in their ways',
          tone: 'confrontational',
          receptiveness: 0.2,
          argumentation: {
            usesEmotionalAppeals: true,
            citesData: false,
            asksQuestions: false,
          },
        },
      });

      await service.generateResponse(request);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];

      // System prompt should mention low receptiveness
      expect(callArgs.systemPrompt).toContain('receptiveness');
    });
  });
});
