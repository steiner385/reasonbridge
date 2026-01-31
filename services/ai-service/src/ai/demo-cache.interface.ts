/**
 * Demo AI Response Cache Interface
 *
 * Defines the interface for caching pre-computed AI responses
 * in the demo environment.
 */

/**
 * Cached clarity analysis result
 */
export interface CachedClarityAnalysis {
  responseId: string;
  analysis: string;
  clarityScore: number;
  suggestions: string[];
  cachedAt: Date;
}

/**
 * Cached tone analysis result
 */
export interface CachedToneAnalysis {
  responseId: string;
  label: string;
  score: number;
  feedback: string;
  cachedAt: Date;
}

/**
 * Cached fallacy detection result
 */
export interface CachedFallacyDetection {
  responseId: string;
  fallacies: Array<{
    name: string;
    description: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  hasFallacies: boolean;
  cachedAt: Date;
}

/**
 * Cached common ground analysis result
 */
export interface CachedCommonGroundAnalysis {
  topicId: string;
  agreementZones: string[];
  misunderstandings: string[];
  genuineDisagreements: string[];
  consensusScore: number;
  cachedAt: Date;
}

/**
 * Demo cache storage interface
 *
 * Implementations can use in-memory storage, Redis, or database
 */
export interface DemoCacheStorage {
  /**
   * Get cached clarity analysis for a response
   */
  getClarityAnalysis(responseId: string): Promise<CachedClarityAnalysis | null>;

  /**
   * Store clarity analysis for a response
   */
  setClarityAnalysis(responseId: string, analysis: CachedClarityAnalysis): Promise<void>;

  /**
   * Get cached tone analysis for a response
   */
  getToneAnalysis(responseId: string): Promise<CachedToneAnalysis | null>;

  /**
   * Store tone analysis for a response
   */
  setToneAnalysis(responseId: string, analysis: CachedToneAnalysis): Promise<void>;

  /**
   * Get cached fallacy detection for a response
   */
  getFallacyDetection(responseId: string): Promise<CachedFallacyDetection | null>;

  /**
   * Store fallacy detection for a response
   */
  setFallacyDetection(responseId: string, detection: CachedFallacyDetection): Promise<void>;

  /**
   * Get cached common ground analysis for a topic
   */
  getCommonGroundAnalysis(topicId: string): Promise<CachedCommonGroundAnalysis | null>;

  /**
   * Store common ground analysis for a topic
   */
  setCommonGroundAnalysis(topicId: string, analysis: CachedCommonGroundAnalysis): Promise<void>;

  /**
   * Clear all cached data
   */
  clear(): Promise<void>;
}

/**
 * In-memory implementation of demo cache storage
 */
export class InMemoryDemoCacheStorage implements DemoCacheStorage {
  private clarityCache = new Map<string, CachedClarityAnalysis>();
  private toneCache = new Map<string, CachedToneAnalysis>();
  private fallacyCache = new Map<string, CachedFallacyDetection>();
  private commonGroundCache = new Map<string, CachedCommonGroundAnalysis>();

  async getClarityAnalysis(responseId: string): Promise<CachedClarityAnalysis | null> {
    return this.clarityCache.get(responseId) || null;
  }

  async setClarityAnalysis(responseId: string, analysis: CachedClarityAnalysis): Promise<void> {
    this.clarityCache.set(responseId, analysis);
  }

  async getToneAnalysis(responseId: string): Promise<CachedToneAnalysis | null> {
    return this.toneCache.get(responseId) || null;
  }

  async setToneAnalysis(responseId: string, analysis: CachedToneAnalysis): Promise<void> {
    this.toneCache.set(responseId, analysis);
  }

  async getFallacyDetection(responseId: string): Promise<CachedFallacyDetection | null> {
    return this.fallacyCache.get(responseId) || null;
  }

  async setFallacyDetection(responseId: string, detection: CachedFallacyDetection): Promise<void> {
    this.fallacyCache.set(responseId, detection);
  }

  async getCommonGroundAnalysis(topicId: string): Promise<CachedCommonGroundAnalysis | null> {
    return this.commonGroundCache.get(topicId) || null;
  }

  async setCommonGroundAnalysis(
    topicId: string,
    analysis: CachedCommonGroundAnalysis,
  ): Promise<void> {
    this.commonGroundCache.set(topicId, analysis);
  }

  async clear(): Promise<void> {
    this.clarityCache.clear();
    this.toneCache.clear();
    this.fallacyCache.clear();
    this.commonGroundCache.clear();
  }
}
