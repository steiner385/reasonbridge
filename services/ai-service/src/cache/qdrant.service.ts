import { Injectable, Inject, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import type { QdrantClient } from '@qdrant/js-client-rest';
import { FeedbackType } from '@reason-bridge/db-models';
import type { AnalysisResult } from '../services/response-analyzer.service.js';
import type { CachedFeedback, FeedbackMetadata } from './types.js';
import { randomUUID } from 'crypto';

const VECTOR_SIZE = 1536; // text-embedding-3-small dimensions

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly collectionName: string;

  constructor(@Inject('QDRANT_CLIENT') private readonly client: QdrantClient) {
    this.collectionName = process.env['QDRANT_COLLECTION'] || 'feedback_embeddings';
  }

  async onModuleInit(): Promise<void> {
    await this.ensureCollectionExists();
  }

  /**
   * Ensure the Qdrant collection exists with correct schema
   */
  private async ensureCollectionExists(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);

      if (!exists) {
        this.logger.log(`Creating Qdrant collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Qdrant collection', error);
      throw error;
    }
  }

  /**
   * Search for similar content in Qdrant
   */
  async searchSimilar(embedding: number[], threshold: number): Promise<CachedFeedback | null> {
    try {
      const results = await this.client.search(this.collectionName, {
        vector: embedding,
        limit: 1,
        score_threshold: threshold,
      });

      if (results.length === 0) {
        return null;
      }

      const match = results[0];
      if (!match || match.score < threshold) {
        return null;
      }

      const payload = match.payload as unknown as FeedbackMetadata;

      return {
        result: {
          type: payload.feedbackType as FeedbackType,
          subtype: payload.subtype ?? undefined,
          suggestionText: payload.suggestionText,
          reasoning: payload.reasoning,
          confidenceScore: payload.confidenceScore,
        },
        metadata: payload,
        similarity: match.score,
      };
    } catch (error) {
      this.logger.error('Qdrant search failed', error);
      return null;
    }
  }

  /**
   * Store embedding with feedback metadata
   */
  async store(
    embedding: number[],
    result: AnalysisResult,
    metadata: FeedbackMetadata,
  ): Promise<void> {
    try {
      await this.client.upsert(this.collectionName, {
        wait: false, // Async write
        points: [
          {
            id: randomUUID(),
            vector: embedding,
            payload: metadata as unknown as Record<string, unknown>,
          },
        ],
      });
      this.logger.debug(`Stored feedback in Qdrant: ${metadata.contentHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error('Failed to store in Qdrant', error);
      // Don't throw - graceful degradation
    }
  }
}
