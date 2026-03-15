/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generation Orchestrator
 *
 * Coordinates all LLM-powered generators to produce a complete set of seeding data.
 * Manages caching to avoid regeneration when content is already available.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { createSeedingClient, type SeedingLLMClient } from './llm-client.js';
import { TopicGenerator } from './topic-generator.js';
import { ResponseGenerator } from './response-generator.js';
import { PropositionGenerator } from './proposition-generator.js';
import { CommonGroundGenerator } from './common-ground-generator.js';
import { BridgingGenerator } from './bridging-generator.js';
import type {
  CachedData,
  GenerationMetadata,
  GeneratedTopic,
  GeneratedResponse,
  GeneratedProposition,
  GeneratedCommonGround,
  GeneratedBridgingSuggestion,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Current cache version - increment when schema changes */
export const CACHE_VERSION = 1;

/** Default starting topic number (after existing 12 topics: 101-112) */
const DEFAULT_STARTING_TOPIC_NUMBER = 113;

/** Cache file names */
const CACHE_FILES = {
  metadata: 'generation-metadata.json',
  topics: 'generated-topics.json',
  responses: 'generated-responses.json',
  propositions: 'generated-propositions.json',
  commonGround: 'generated-common-ground.json',
  bridging: 'generated-bridging.json',
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface OrchestratorOptions {
  /** Force regeneration even if cache is valid */
  forceRegenerate?: boolean;
  /** Custom cache directory path */
  cacheDir?: string;
  /** Starting topic number for ID generation */
  startingTopicNumber?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the default cache directory path.
 */
function getDefaultCacheDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, '..', 'cache');
}

/**
 * Check if the cache is valid.
 *
 * @param cacheDir - Path to the cache directory
 * @param expectedVersion - Expected cache version (default: CACHE_VERSION)
 * @returns True if cache exists and version matches
 */
export async function isCacheValid(
  cacheDir: string,
  expectedVersion: number = CACHE_VERSION,
): Promise<boolean> {
  try {
    const metadataPath = path.join(cacheDir, CACHE_FILES.metadata);
    await fs.access(metadataPath);

    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent) as GenerationMetadata;

    return metadata.cacheVersion === expectedVersion;
  } catch {
    return false;
  }
}

// =============================================================================
// ORCHESTRATOR CLASS
// =============================================================================

/**
 * Orchestrates all generation steps and manages caching.
 */
export class GenerationOrchestrator {
  private client: SeedingLLMClient;
  private ownsClient: boolean;
  private destroyed = false;

  /**
   * Create a new orchestrator.
   *
   * @param client - Optional LLM client (creates one if not provided)
   */
  constructor(client?: SeedingLLMClient) {
    if (client) {
      this.client = client;
      this.ownsClient = false;
    } else {
      this.client = createSeedingClient();
      this.ownsClient = true;
    }
  }

  /**
   * Get cached data or generate new data.
   *
   * @param options - Generation options
   * @returns Complete cached data including all generated content
   */
  async getData(options: OrchestratorOptions = {}): Promise<CachedData> {
    const {
      forceRegenerate = false,
      cacheDir = getDefaultCacheDir(),
      startingTopicNumber = DEFAULT_STARTING_TOPIC_NUMBER,
    } = options;

    // Check cache validity
    const cacheValid = await isCacheValid(cacheDir);

    if (cacheValid && !forceRegenerate) {
      return this.loadFromCache(cacheDir);
    }

    // Generate all content
    return this.generateAndCache(cacheDir, startingTopicNumber);
  }

  /**
   * Load data from cache files.
   */
  private async loadFromCache(cacheDir: string): Promise<CachedData> {
    const [metadata, topics, responses, propositions, commonGround, bridging] = await Promise.all([
      this.loadCacheFile<GenerationMetadata>(cacheDir, CACHE_FILES.metadata),
      this.loadCacheFile<GeneratedTopic[]>(cacheDir, CACHE_FILES.topics),
      this.loadCacheFile<GeneratedResponse[]>(cacheDir, CACHE_FILES.responses),
      this.loadCacheFile<GeneratedProposition[]>(cacheDir, CACHE_FILES.propositions),
      this.loadCacheFile<GeneratedCommonGround[]>(cacheDir, CACHE_FILES.commonGround),
      this.loadCacheFile<GeneratedBridgingSuggestion[]>(cacheDir, CACHE_FILES.bridging),
    ]);

    return {
      metadata,
      topics,
      responses,
      propositions,
      commonGround,
      bridging,
    };
  }

  /**
   * Load a single cache file.
   */
  private async loadCacheFile<T>(cacheDir: string, filename: string): Promise<T> {
    const filePath = path.join(cacheDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  /**
   * Generate all content and save to cache.
   */
  private async generateAndCache(
    cacheDir: string,
    startingTopicNumber: number,
  ): Promise<CachedData> {
    const startTime = Date.now();

    // Ensure cache directory exists
    await fs.mkdir(cacheDir, { recursive: true });

    // Create generators with shared client
    const topicGenerator = new TopicGenerator(this.client);
    const responseGenerator = new ResponseGenerator(this.client);
    const propositionGenerator = new PropositionGenerator(this.client);
    const commonGroundGenerator = new CommonGroundGenerator(this.client);
    const bridgingGenerator = new BridgingGenerator(this.client);

    // Generate in sequence: topics -> responses -> propositions -> commonGround -> bridging
    // eslint-disable-next-line no-console -- Intentional progress logging for seeding operations
    console.log('Generating topics...');
    const topics = await topicGenerator.generateAll(startingTopicNumber);

    // eslint-disable-next-line no-console -- Intentional progress logging for seeding operations
    console.log('Generating responses...');
    const responses = await responseGenerator.generateForAllTopics(topics);

    // eslint-disable-next-line no-console -- Intentional progress logging for seeding operations
    console.log('Generating propositions...');
    const propositions = await propositionGenerator.generateForAllTopics(topics, responses);

    // eslint-disable-next-line no-console -- Intentional progress logging for seeding operations
    console.log('Generating common ground analyses...');
    const commonGround = await commonGroundGenerator.generateForAllTopics(
      topics,
      responses,
      propositions,
    );

    // eslint-disable-next-line no-console -- Intentional progress logging for seeding operations
    console.log('Generating bridging suggestions...');
    const bridging = await bridgingGenerator.generateForAllTopics(
      topics,
      propositions,
      commonGround,
    );

    const endTime = Date.now();

    // Create metadata
    const metadata: GenerationMetadata = {
      generatedAt: new Date().toISOString(),
      modelVersion: 'claude-3-5-sonnet',
      topicCount: topics.length,
      responseCount: responses.length,
      propositionCount: propositions.length,
      commonGroundCount: commonGround.length,
      bridgingCount: bridging.length,
      generationDurationMs: endTime - startTime,
      cacheVersion: CACHE_VERSION,
    };

    // Save to cache
    await this.saveToCache(cacheDir, {
      metadata,
      topics,
      responses,
      propositions,
      commonGround,
      bridging,
    });

    // eslint-disable-next-line no-console -- Intentional progress logging for seeding operations
    console.log(`Generation complete in ${metadata.generationDurationMs}ms`);

    return {
      metadata,
      topics,
      responses,
      propositions,
      commonGround,
      bridging,
    };
  }

  /**
   * Save all data to cache files.
   */
  private async saveToCache(cacheDir: string, data: CachedData): Promise<void> {
    await Promise.all([
      this.saveCacheFile(cacheDir, CACHE_FILES.metadata, data.metadata),
      this.saveCacheFile(cacheDir, CACHE_FILES.topics, data.topics),
      this.saveCacheFile(cacheDir, CACHE_FILES.responses, data.responses),
      this.saveCacheFile(cacheDir, CACHE_FILES.propositions, data.propositions),
      this.saveCacheFile(cacheDir, CACHE_FILES.commonGround, data.commonGround),
      this.saveCacheFile(cacheDir, CACHE_FILES.bridging, data.bridging),
    ]);
  }

  /**
   * Save a single cache file.
   */
  private async saveCacheFile(cacheDir: string, filename: string, data: unknown): Promise<void> {
    const filePath = path.join(cacheDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    if (this.ownsClient) {
      this.client.destroy();
    }

    this.destroyed = true;
  }
}

export default GenerationOrchestrator;
