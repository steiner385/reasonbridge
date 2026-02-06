/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents a cluster of related propositions
 */
export interface PropositionCluster {
  /**
   * Unique identifier for this cluster
   */
  id: string;

  /**
   * Representative summary of the cluster's main theme
   */
  theme: string;

  /**
   * Propositions that belong to this cluster
   */
  propositionIds: string[];

  /**
   * Number of propositions in this cluster
   */
  size: number;

  /**
   * Similarity score for propositions in this cluster (0.00-1.00)
   */
  cohesionScore: number;

  /**
   * Keywords that characterize this cluster
   */
  keywords: string[];
}

/**
 * Request for proposition clustering analysis
 */
export interface ClusterPropositionsRequest {
  /**
   * ID of the topic to analyze
   */
  topicId: string;

  /**
   * Propositions to cluster
   */
  propositions: PropositionInput[];

  /**
   * Minimum similarity threshold for clustering (0.00-1.00)
   * Default: 0.6
   */
  similarityThreshold?: number;

  /**
   * Maximum number of clusters to generate
   * Default: unlimited
   */
  maxClusters?: number;
}

/**
 * Input proposition for clustering
 */
export interface PropositionInput {
  /**
   * Proposition ID
   */
  id: string;

  /**
   * Proposition statement text
   */
  statement: string;

  /**
   * Optional metadata for enhanced clustering
   */
  metadata?: {
    supportCount?: number;
    opposeCount?: number;
    nuancedCount?: number;
    consensusScore?: number;
  };
}

/**
 * Result of proposition clustering analysis
 */
export interface ClusterPropositionsResult {
  /**
   * ID of the analyzed topic
   */
  topicId: string;

  /**
   * Generated clusters
   */
  clusters: PropositionCluster[];

  /**
   * Propositions that didn't fit into any cluster (outliers)
   */
  unclusteredPropositionIds: string[];

  /**
   * Overall clustering quality score (0.00-1.00)
   * Higher means better-defined clusters
   */
  qualityScore: number;

  /**
   * Method used for clustering
   */
  method: 'pattern-based' | 'semantic-ai' | 'hybrid';

  /**
   * Confidence in the clustering result (0.00-1.00)
   */
  confidence: number;

  /**
   * Reasoning behind the clustering approach
   */
  reasoning: string;
}
