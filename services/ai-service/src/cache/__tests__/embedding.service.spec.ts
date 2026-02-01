import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EmbeddingService } from '../embedding.service.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockCacheManager: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };
  let mockOpenAI: {
    embeddings: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
    };

    mockOpenAI = {
      embeddings: {
        create: vi.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: 'OPENAI_CLIENT', useValue: mockOpenAI },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  });

  describe('getEmbedding', () => {
    it('should return cached embedding if available', async () => {
      const cachedEmbedding = [0.1, 0.2, 0.3];
      mockCacheManager.get.mockResolvedValue(cachedEmbedding);

      const result = await service.getEmbedding('test content');

      expect(result).toEqual(cachedEmbedding);
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });

    it('should call OpenAI and cache result on cache miss', async () => {
      const embedding = [0.4, 0.5, 0.6];
      mockCacheManager.get.mockResolvedValue(null);
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding }],
      });

      const result = await service.getEmbedding('test content');

      expect(result).toEqual(embedding);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test content',
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should use content hash as cache key', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1] }],
      });

      await service.getEmbedding('test content');

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringMatching(/^feedback:embedding:[a-f0-9]{64}$/),
      );
    });

    it('should cache with 7-day TTL by default', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2] }],
      });

      await service.getEmbedding('test content');

      // 7 days in milliseconds = 604800 * 1000
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^feedback:embedding:/),
        [0.1, 0.2],
        604800000,
      );
    });

    it('should throw error when OpenAI returns no embedding', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [],
      });

      await expect(service.getEmbedding('test content')).rejects.toThrow(
        'No embedding returned from OpenAI',
      );
    });
  });

  describe('getCachedEmbedding', () => {
    it('should return cached embedding without generating new one', async () => {
      const cachedEmbedding = [0.1, 0.2, 0.3];
      mockCacheManager.get.mockResolvedValue(cachedEmbedding);

      const result = await service.getCachedEmbedding('test content');

      expect(result).toEqual(cachedEmbedding);
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });

    it('should return null when no cached embedding exists', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getCachedEmbedding('test content');

      expect(result).toBeNull();
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });
  });
});
