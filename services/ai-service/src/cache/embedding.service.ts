import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type OpenAI from 'openai';
import { computeContentHash } from './hash.util.js';

const EMBEDDING_CACHE_PREFIX = 'feedback:embedding:';
const DEFAULT_TTL = 604800; // 7 days in seconds

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly model: string;
  private readonly ttl: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject('OPENAI_CLIENT') private readonly openai: OpenAI,
  ) {
    this.model = process.env['OPENAI_EMBEDDING_MODEL'] || 'text-embedding-3-small';
    this.ttl = parseInt(process.env['EMBEDDING_CACHE_TTL'] || String(DEFAULT_TTL), 10);
  }

  /**
   * Get embedding for content, using cache when available
   */
  async getEmbedding(content: string): Promise<number[]> {
    const contentHash = computeContentHash(content);
    const cacheKey = `${EMBEDDING_CACHE_PREFIX}${contentHash}`;

    // Check cache first
    const cached = await this.cache.get<number[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Embedding cache hit for ${contentHash.slice(0, 8)}...`);
      return cached;
    }

    // Generate embedding via OpenAI
    this.logger.debug(`Generating embedding for ${contentHash.slice(0, 8)}...`);
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: content,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    // Cache the embedding (TTL in milliseconds for cache-manager)
    await this.cache.set(cacheKey, embedding, this.ttl * 1000);

    return embedding;
  }

  /**
   * Get cached embedding without generating new one
   */
  async getCachedEmbedding(content: string): Promise<number[] | null> {
    const contentHash = computeContentHash(content);
    const cacheKey = `${EMBEDDING_CACHE_PREFIX}${contentHash}`;
    const cached = await this.cache.get<number[]>(cacheKey);
    return cached ?? null;
  }
}
