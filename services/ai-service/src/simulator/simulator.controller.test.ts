/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the bedrock service module to prevent AWS SDK loading
vi.mock('../ai/bedrock.service.js', () => ({
  BedrockService: vi.fn(),
}));

import { SimulatorController } from './simulator.controller.js';
import { PRESET_PERSONAS } from './data/preset-personas.js';
import type { ChatRequestDto } from './dto/chat-request.dto.js';
import type { AnalyzeArgumentDto } from './dto/analyze-argument.dto.js';
import type { GenerateInsightsDto } from './dto/generate-insights.dto.js';

const createMockSimulatorService = () => ({
  generatePositions: vi.fn(),
  generateResponse: vi.fn(),
  generatePrompt: vi.fn(),
});

const createMockChatService = () => ({
  generateResponse: vi.fn(),
});

const createMockArgumentAnalyzerService = () => ({
  analyze: vi.fn(),
});

const createMockInsightsGeneratorService = () => ({
  generateInsights: vi.fn(),
});

describe('SimulatorController', () => {
  let controller: SimulatorController;
  let mockSimulatorService: ReturnType<typeof createMockSimulatorService>;
  let mockChatService: ReturnType<typeof createMockChatService>;
  let mockArgumentAnalyzerService: ReturnType<typeof createMockArgumentAnalyzerService>;
  let mockInsightsGeneratorService: ReturnType<typeof createMockInsightsGeneratorService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulatorService = createMockSimulatorService();
    mockChatService = createMockChatService();
    mockArgumentAnalyzerService = createMockArgumentAnalyzerService();
    mockInsightsGeneratorService = createMockInsightsGeneratorService();
    controller = new SimulatorController(
      mockSimulatorService as ReturnType<typeof createMockSimulatorService>,
      mockChatService as ReturnType<typeof createMockChatService>,
      mockArgumentAnalyzerService as ReturnType<typeof createMockArgumentAnalyzerService>,
      mockInsightsGeneratorService as ReturnType<typeof createMockInsightsGeneratorService>,
    );
  });

  describe('getPresetPersonas', () => {
    it('should return all preset personas', () => {
      const result = controller.getPresetPersonas();

      expect(result).toEqual(PRESET_PERSONAS);
      expect(result).toHaveLength(6);
    });

    it('should include expected persona properties', () => {
      const result = controller.getPresetPersonas();

      const skeptic = result.find((p) => p.id === 'skeptic');
      expect(skeptic).toBeDefined();
      expect(skeptic?.name).toBe('The Skeptic');
      expect(skeptic?.modeAffinity).toBe('socratic');
    });

    it('should include all persona ids', () => {
      const result = controller.getPresetPersonas();
      const ids = result.map((p) => p.id);

      expect(ids).toContain('skeptic');
      expect(ids).toContain('advocate');
      expect(ids).toContain('devils-advocate');
      expect(ids).toContain('mediator');
      expect(ids).toContain('expert');
      expect(ids).toContain('idealist');
    });
  });

  describe('chat', () => {
    const validChatRequest: ChatRequestDto = {
      persona: {
        name: 'The Skeptic',
        position: 'Questions all claims',
        background: 'Academic philosopher',
        tone: 'analytical',
        receptiveness: 0.5,
        argumentation: {
          usesEmotionalAppeals: false,
          citesData: true,
          asksQuestions: true,
        },
      },
      mode: 'socratic',
      difficulty: 'intermediate',
      userMessage: 'I believe climate change is a serious issue.',
      conversationHistory: [],
    };

    it('should generate a persona response', async () => {
      const mockResponse = {
        response: 'What evidence supports that claim?',
        personaName: 'The Skeptic',
        timestamp: '2026-02-21T10:00:00.000Z',
      };
      mockChatService.generateResponse.mockResolvedValue(mockResponse);

      const result = await controller.chat(validChatRequest);

      expect(result).toEqual(mockResponse);
      expect(mockChatService.generateResponse).toHaveBeenCalledWith(validChatRequest);
    });

    it('should pass conversation history to service', async () => {
      const requestWithHistory: ChatRequestDto = {
        ...validChatRequest,
        conversationHistory: [
          { role: 'user', content: 'Hello' },
          { role: 'persona', content: 'Greetings' },
        ],
      };
      mockChatService.generateResponse.mockResolvedValue({
        response: 'Interesting point.',
        personaName: 'The Skeptic',
        timestamp: '2026-02-21T10:00:00.000Z',
      });

      await controller.chat(requestWithHistory);

      expect(mockChatService.generateResponse).toHaveBeenCalledWith(requestWithHistory);
    });

    it('should handle topic context', async () => {
      const requestWithContext: ChatRequestDto = {
        ...validChatRequest,
        topicContext: 'Discussion about environmental policy',
      };
      mockChatService.generateResponse.mockResolvedValue({
        response: 'What specific policies are you referring to?',
        personaName: 'The Skeptic',
        timestamp: '2026-02-21T10:00:00.000Z',
      });

      await controller.chat(requestWithContext);

      expect(mockChatService.generateResponse).toHaveBeenCalledWith(requestWithContext);
    });

    it('should handle service errors', async () => {
      mockChatService.generateResponse.mockRejectedValue(new Error('Service unavailable'));

      await expect(controller.chat(validChatRequest)).rejects.toThrow('Service unavailable');
    });
  });

  describe('analyzeArgument', () => {
    const validAnalyzeRequest: AnalyzeArgumentDto = {
      userMessage: 'Everyone who disagrees with me is wrong because they are stupid.',
      conversationContext: [],
    };

    it('should analyze user argument', async () => {
      const mockAnalysis = {
        fallacies: [
          {
            type: 'Ad Hominem',
            description: 'Attacking the person instead of the argument',
            excerpt: 'they are stupid',
            severity: 'major' as const,
          },
        ],
        unsupportedClaims: ['Everyone who disagrees is wrong'],
        toneScore: 3,
        evidenceScore: 1,
        coherenceScore: 4,
        suggestions: ['Focus on the argument, not the person', 'Provide evidence for your claims'],
      };
      mockArgumentAnalyzerService.analyze.mockResolvedValue(mockAnalysis);

      const result = await controller.analyzeArgument(validAnalyzeRequest);

      expect(result).toEqual(mockAnalysis);
      expect(mockArgumentAnalyzerService.analyze).toHaveBeenCalledWith(validAnalyzeRequest);
    });

    it('should include conversation context in analysis', async () => {
      const requestWithContext: AnalyzeArgumentDto = {
        userMessage: 'That contradicts what you said before.',
        conversationContext: [
          { role: 'persona', content: 'I believe X is true.' },
          { role: 'user', content: 'But earlier you said X is false.' },
        ],
      };
      mockArgumentAnalyzerService.analyze.mockResolvedValue({
        fallacies: [],
        unsupportedClaims: [],
        toneScore: 7,
        evidenceScore: 6,
        coherenceScore: 8,
        suggestions: ['Good use of reference to prior statements'],
      });

      await controller.analyzeArgument(requestWithContext);

      expect(mockArgumentAnalyzerService.analyze).toHaveBeenCalledWith(requestWithContext);
    });

    it('should handle service errors', async () => {
      mockArgumentAnalyzerService.analyze.mockRejectedValue(new Error('Analysis failed'));

      await expect(controller.analyzeArgument(validAnalyzeRequest)).rejects.toThrow(
        'Analysis failed',
      );
    });
  });

  describe('generateInsights', () => {
    const validInsightsRequest: GenerateInsightsDto = {
      transcript: [
        { id: '1', role: 'user', content: 'I think X is true.', timestamp: '2026-02-21T10:00:00Z' },
        {
          id: '2',
          role: 'persona',
          content: 'What evidence supports that?',
          timestamp: '2026-02-21T10:01:00Z',
        },
        {
          id: '3',
          role: 'user',
          content: 'Well, everyone knows it.',
          timestamp: '2026-02-21T10:02:00Z',
        },
      ],
      mode: 'socratic',
      persona: {
        name: 'The Skeptic',
        position: 'Questions all claims',
        tone: 'analytical',
      },
    };

    it('should generate learning insights from transcript', async () => {
      const mockInsights = {
        strengths: ['Engaged with the question'],
        improvements: ['Provide specific evidence', 'Avoid appeals to popularity'],
        fallaciesCommitted: [
          { type: 'Appeal to Popularity', exchange: 3, excerpt: 'everyone knows it' },
        ],
        recommendedReadings: [
          { title: 'Thinking, Fast and Slow', reason: 'Understanding cognitive biases' },
        ],
        overallAssessment: 'The user showed willingness to engage but relied on weak reasoning.',
      };
      mockInsightsGeneratorService.generateInsights.mockResolvedValue(mockInsights);

      const result = await controller.generateInsights(validInsightsRequest);

      expect(result).toEqual(mockInsights);
      expect(mockInsightsGeneratorService.generateInsights).toHaveBeenCalledWith(
        validInsightsRequest,
      );
    });

    it('should handle topic context in insights', async () => {
      const requestWithContext: GenerateInsightsDto = {
        ...validInsightsRequest,
        topicContext: 'Climate change debate',
      };
      mockInsightsGeneratorService.generateInsights.mockResolvedValue({
        strengths: [],
        improvements: [],
        fallaciesCommitted: [],
        recommendedReadings: [],
        overallAssessment: 'Analysis completed.',
      });

      await controller.generateInsights(requestWithContext);

      expect(mockInsightsGeneratorService.generateInsights).toHaveBeenCalledWith(
        requestWithContext,
      );
    });

    it('should handle service errors', async () => {
      mockInsightsGeneratorService.generateInsights.mockRejectedValue(
        new Error('Insights generation failed'),
      );

      await expect(controller.generateInsights(validInsightsRequest)).rejects.toThrow(
        'Insights generation failed',
      );
    });
  });

  // Tests for existing endpoints to ensure they still work
  describe('generatePositions (existing endpoint)', () => {
    it('should call simulator service generatePositions', async () => {
      const dto = { topicTitle: 'Should we ban plastic bags?' };
      const mockResult = {
        position1: { label: 'Pro', summary: 'Support the ban' },
        position2: { label: 'Con', summary: 'Oppose the ban' },
      };
      mockSimulatorService.generatePositions.mockResolvedValue(mockResult);

      const result = await controller.generatePositions(dto as never);

      expect(result).toEqual(mockResult);
      expect(mockSimulatorService.generatePositions).toHaveBeenCalledWith(dto);
    });
  });

  describe('generateResponse (existing endpoint)', () => {
    it('should call simulator service generateResponse', async () => {
      const dto = { persona: { name: 'Test' }, action: 'respond' };
      const mockResult = { content: 'Generated response', reasoning: 'Based on context' };
      mockSimulatorService.generateResponse.mockResolvedValue(mockResult);

      const result = await controller.generateResponse(dto as never);

      expect(result).toEqual(mockResult);
      expect(mockSimulatorService.generateResponse).toHaveBeenCalledWith(dto);
    });
  });

  describe('generatePrompt (existing endpoint)', () => {
    it('should call simulator service generatePrompt', async () => {
      const dto = { persona: { name: 'Test', position: 'Pro' } };
      const mockResult = { systemPrompt: 'You are Test...' };
      mockSimulatorService.generatePrompt.mockResolvedValue(mockResult);

      const result = await controller.generatePrompt(dto as never);

      expect(result).toEqual(mockResult);
      expect(mockSimulatorService.generatePrompt).toHaveBeenCalledWith(dto);
    });
  });
});
