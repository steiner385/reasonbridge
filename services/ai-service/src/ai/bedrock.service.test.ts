import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BedrockService } from './bedrock.service.js';

// Mock the ai-client module at the top level
vi.mock('@reason-bridge/ai-client', () => {
  const mockComplete = vi.fn();
  const mockIsReady = vi.fn().mockResolvedValue(true);

  return {
    BedrockClient: vi.fn().mockImplementation(() => ({
      isReady: mockIsReady,
      complete: mockComplete,
    })),
    __mockComplete: mockComplete,
    __mockIsReady: mockIsReady,
  };
});

// Access the mocks
const getMocks = async () => {
  const mod = await import('@reason-bridge/ai-client');
  return {
    mockComplete: (mod as any).__mockComplete as ReturnType<typeof vi.fn>,
    mockIsReady: (mod as any).__mockIsReady as ReturnType<typeof vi.fn>,
  };
};

describe('BedrockService', () => {
  let service: BedrockService;
  let mocks: Awaited<ReturnType<typeof getMocks>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks = await getMocks();
    service = new BedrockService();
  });

  describe('isReady', () => {
    it('should return true when client is ready', async () => {
      mocks.mockIsReady.mockResolvedValue(true);

      const result = await service.isReady();

      expect(result).toBe(true);
    });

    it('should return false when client is not ready', async () => {
      mocks.mockIsReady.mockResolvedValue(false);

      const result = await service.isReady();

      expect(result).toBe(false);
    });
  });

  describe('analyzeContent', () => {
    it('should return analyzed content from Bedrock', async () => {
      mocks.mockComplete.mockResolvedValue({
        content: 'This content is clear and well-structured.',
      });

      const result = await service.analyzeContent('Test content');

      expect(result.analyzed).toBe(true);
      expect(mocks.mockComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('content analyzer'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Test content'),
            }),
          ]),
        }),
      );
    });

    it('should return original content when analysis fails', async () => {
      mocks.mockComplete.mockRejectedValue(new Error('API error'));

      const result = await service.analyzeContent('Test content');

      expect(result.analyzed).toBe(false);
      expect(result.content).toBe('Test content');
    });
  });

  describe('moderateContent', () => {
    it('should return flagged=false for SAFE content', async () => {
      mocks.mockComplete.mockResolvedValue({
        content: 'SAFE',
      });

      const result = await service.moderateContent('Friendly message');

      expect(result.flagged).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should return flagged=true with reason for flagged content', async () => {
      mocks.mockComplete.mockResolvedValue({
        content: 'FLAGGED: Hate speech detected',
      });

      const result = await service.moderateContent('Harmful content');

      expect(result.flagged).toBe(true);
      expect(result.reason).toBe('Hate speech detected');
    });

    it('should return flagged=false when moderation fails', async () => {
      mocks.mockComplete.mockRejectedValue(new Error('API error'));

      const result = await service.moderateContent('Test content');

      expect(result.flagged).toBe(false);
    });

    it('should use correct system prompt for moderation', async () => {
      mocks.mockComplete.mockResolvedValue({ content: 'SAFE' });

      await service.moderateContent('Test');

      expect(mocks.mockComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('content moderation system'),
          maxTokens: 256,
        }),
      );
    });
  });

  describe('clusterTexts', () => {
    it('should return empty array for empty input', async () => {
      const result = await service.clusterTexts([]);

      expect(result).toEqual([]);
    });

    it('should cluster texts successfully', async () => {
      mocks.mockComplete.mockResolvedValue({
        content:
          '[{"theme": "Support theme", "members": [1, 2]}, {"theme": "Oppose theme", "members": [3]}]',
      });

      const texts = ['I support this', 'I agree', 'I disagree'];
      const result = await service.clusterTexts(texts, 2);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        theme: 'Support theme',
        members: ['I support this', 'I agree'],
      });
      expect(result[1]).toEqual({
        theme: 'Oppose theme',
        members: ['I disagree'],
      });
    });

    it('should return empty array when clustering fails', async () => {
      mocks.mockComplete.mockRejectedValue(new Error('API error'));

      const result = await service.clusterTexts(['text1', 'text2']);

      expect(result).toEqual([]);
    });

    it('should return empty array when response is not valid JSON', async () => {
      mocks.mockComplete.mockResolvedValue({
        content: 'Not valid JSON response',
      });

      const result = await service.clusterTexts(['text1', 'text2']);

      expect(result).toEqual([]);
    });

    it('should filter out invalid member indices', async () => {
      mocks.mockComplete.mockResolvedValue({
        content: '[{"theme": "Test", "members": [1, 5, -1, 0]}]',
      });

      const texts = ['text1', 'text2'];
      const result = await service.clusterTexts(texts);

      expect(result[0].members).toEqual(['text1']);
    });

    it('should default to maxClusters of 3', async () => {
      mocks.mockComplete.mockResolvedValue({ content: '[]' });

      await service.clusterTexts(['text1']);

      expect(mocks.mockComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('at most 3 semantic groups'),
            }),
          ]),
        }),
      );
    });
  });

  describe('identifyValues', () => {
    it('should return default message for empty input', async () => {
      const result = await service.identifyValues([]);

      expect(result).toEqual([
        'Underlying values will be identified through AI-powered moral foundations analysis',
      ]);
    });

    it('should identify values from texts', async () => {
      mocks.mockComplete.mockResolvedValue({
        content: '["fairness", "liberty", "care"]',
      });

      const result = await service.identifyValues(['I believe in equal rights']);

      expect(result).toEqual(['fairness', 'liberty', 'care']);
    });

    it('should return error message when identification fails', async () => {
      mocks.mockComplete.mockRejectedValue(new Error('API error'));

      const result = await service.identifyValues(['text']);

      expect(result).toEqual(['Underlying values analysis failed']);
    });

    it('should return incomplete message for invalid JSON', async () => {
      mocks.mockComplete.mockResolvedValue({
        content: 'Not valid JSON',
      });

      const result = await service.identifyValues(['text']);

      expect(result).toEqual(['Underlying values analysis incomplete']);
    });

    it('should return default when empty array returned', async () => {
      mocks.mockComplete.mockResolvedValue({
        content: '[]',
      });

      const result = await service.identifyValues(['text']);

      expect(result).toEqual([
        'Underlying values will be identified through AI-powered moral foundations analysis',
      ]);
    });
  });

  describe('generateClarification', () => {
    it('should generate clarification for interpretations', async () => {
      mocks.mockComplete.mockResolvedValue({
        content: 'The term can mean different things to different people.',
      });

      const result = await service.generateClarification('Freedom', [
        { interpretation: 'Freedom from government', participantCount: 5 },
        { interpretation: 'Freedom to do anything', participantCount: 3 },
      ]);

      expect(result).toBe('The term can mean different things to different people.');
    });

    it('should return fallback message when generation fails', async () => {
      mocks.mockComplete.mockRejectedValue(new Error('API error'));

      const result = await service.generateClarification('Topic', [
        { interpretation: 'Interp 1', participantCount: 2 },
        { interpretation: 'Interp 2', participantCount: 3 },
      ]);

      expect(result).toContain('2 different interpretations');
    });

    it('should include participant counts in prompt', async () => {
      mocks.mockComplete.mockResolvedValue({ content: 'Clarification' });

      await service.generateClarification('Topic', [
        { interpretation: 'View A', participantCount: 5 },
      ]);

      expect(mocks.mockComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('5 participants'),
            }),
          ]),
        }),
      );
    });
  });
});
