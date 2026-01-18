import { Injectable } from '@nestjs/common';
import type {
  PropositionCluster,
  ClusterPropositionsRequest,
  ClusterPropositionsResult,
  PropositionInput,
} from '../dto/proposition-cluster.dto.js';

/**
 * Proposition Clusterer Service
 *
 * Groups related propositions together based on semantic similarity.
 * Uses pattern-based keyword matching as a foundation, with placeholders
 * for future AI-powered semantic analysis using AWS Bedrock.
 *
 * Clustering helps users:
 * - Understand which propositions are related
 * - Navigate discussions by themes
 * - Identify overlapping or redundant claims
 * - See how consensus varies across different topic clusters
 */
@Injectable()
export class PropositionClustererService {
  /**
   * Minimum similarity score to group propositions together
   */
  private readonly DEFAULT_SIMILARITY_THRESHOLD = 0.2;

  /**
   * Minimum cluster size (propositions) to be considered a cluster
   */
  private readonly MIN_CLUSTER_SIZE = 2;

  /**
   * Cluster a set of propositions based on similarity
   *
   * @param request - Clustering request with propositions and parameters
   * @returns Clustering result with identified clusters
   */
  async clusterPropositions(
    request: ClusterPropositionsRequest,
  ): Promise<ClusterPropositionsResult> {
    const similarityThreshold = request.similarityThreshold ?? this.DEFAULT_SIMILARITY_THRESHOLD;

    // Extract keywords from each proposition
    const propositionsWithKeywords = request.propositions.map((prop) => ({
      ...prop,
      keywords: this.extractKeywords(prop.statement),
    }));

    // Build similarity matrix
    const similarityMatrix = this.buildSimilarityMatrix(propositionsWithKeywords);

    // Perform clustering using hierarchical agglomerative clustering
    const clusters = this.performClustering(
      propositionsWithKeywords,
      similarityMatrix,
      similarityThreshold,
    );

    // Calculate quality metrics
    const qualityScore = this.calculateQualityScore(
      clusters,
      similarityMatrix,
      propositionsWithKeywords.length,
    );

    // Identify unclustered propositions
    const clusteredIds = new Set(clusters.flatMap((cluster) => cluster.propositionIds));
    const unclusteredPropositionIds = request.propositions
      .filter((prop) => !clusteredIds.has(prop.id))
      .map((prop) => prop.id);

    return {
      topicId: request.topicId,
      clusters,
      unclusteredPropositionIds,
      qualityScore,
      method: 'pattern-based',
      confidence: clusters.length > 0 && qualityScore > 0.5 ? 0.7 : 0.5,
      reasoning:
        clusters.length > 0
          ? `Identified ${clusters.length} clusters using keyword similarity analysis. AI-powered semantic clustering will improve accuracy in future iterations.`
          : 'No clear clusters identified using keyword matching. Propositions may be too diverse or insufficient data. AI-powered analysis will improve detection.',
    };
  }

  /**
   * Extract meaningful keywords from proposition text
   * Filters out common stop words and returns significant terms
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'is',
      'at',
      'which',
      'on',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'with',
      'to',
      'for',
      'of',
      'as',
      'by',
      'that',
      'this',
      'it',
      'from',
      'be',
      'are',
      'was',
      'were',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'can',
    ]);

    // Normalize and tokenize
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    // Remove duplicates
    return [...new Set(words)];
  }

  /**
   * Build a similarity matrix between all propositions
   * Returns a 2D array where matrix[i][j] is the similarity score
   * between proposition i and proposition j
   */
  private buildSimilarityMatrix(
    propositions: Array<PropositionInput & { keywords: string[] }>,
  ): number[][] {
    const n = propositions.length;
    const matrix: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const row = matrix[i];
        if (!row) continue;

        if (i === j) {
          row[j] = 1.0; // Perfect similarity with self
        } else {
          const similarity = this.calculateSimilarity(
            propositions[i]!.keywords,
            propositions[j]!.keywords,
          );
          row[j] = similarity;
          const reverseRow = matrix[j];
          if (reverseRow) {
            reverseRow[i] = similarity; // Symmetric matrix
          }
        }
      }
    }

    return matrix;
  }

  /**
   * Calculate similarity between two sets of keywords using Jaccard index
   * Jaccard(A, B) = |A ∩ B| / |A ∪ B|
   */
  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) {
      return 0;
    }

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    // Calculate intersection
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    // Calculate union
    const union = new Set([...set1, ...set2]);

    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Perform hierarchical agglomerative clustering
   * Starts with each proposition as its own cluster, then merges
   * most similar clusters until threshold is reached
   */
  private performClustering(
    propositions: Array<PropositionInput & { keywords: string[] }>,
    similarityMatrix: number[][],
    threshold: number,
  ): PropositionCluster[] {
    // Initialize: each proposition is its own cluster
    const clusters: Array<{
      propositionIndices: number[];
      keywords: Set<string>;
    }> = propositions.map((prop, idx) => ({
      propositionIndices: [idx],
      keywords: new Set(prop.keywords),
    }));

    // Merge clusters until no more merges exceed threshold
    let changed = true;
    while (changed) {
      changed = false;
      let maxSimilarity = threshold;
      let mergeI = -1;
      let mergeJ = -1;

      // Find most similar pair of clusters
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const clusterI = clusters[i];
          const clusterJ = clusters[j];
          if (!clusterI || !clusterJ) continue;

          const similarity = this.calculateClusterSimilarity(
            clusterI.propositionIndices,
            clusterJ.propositionIndices,
            similarityMatrix,
          );

          if (similarity >= maxSimilarity) {
            maxSimilarity = similarity;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // Merge the most similar clusters
      if (mergeI !== -1 && mergeJ !== -1) {
        clusters[mergeI]!.propositionIndices.push(...clusters[mergeJ]!.propositionIndices);
        clusters[mergeI]!.keywords = new Set([
          ...clusters[mergeI]!.keywords,
          ...clusters[mergeJ]!.keywords,
        ]);
        clusters.splice(mergeJ, 1);
        changed = true;
      }
    }

    // Filter out single-proposition "clusters" and convert to output format
    return clusters
      .filter((cluster) => cluster.propositionIndices.length >= this.MIN_CLUSTER_SIZE)
      .map((cluster, idx) => {
        const clusterProps = cluster.propositionIndices
          .map((i) => propositions[i])
          .filter((p): p is PropositionInput & { keywords: string[] } => p !== undefined);

        // Calculate cohesion score (average pairwise similarity)
        const cohesionScore = this.calculateClusterCohesion(
          cluster.propositionIndices,
          similarityMatrix,
        );

        // Generate theme from most common keywords
        const keywords = this.getTopKeywords([...cluster.keywords], 5);
        const theme = this.generateTheme(clusterProps, keywords);

        return {
          id: `cluster-${idx + 1}`,
          theme,
          propositionIds: clusterProps.map((p) => p.id),
          size: clusterProps.length,
          cohesionScore: Math.round(cohesionScore * 100) / 100,
          keywords,
        };
      });
  }

  /**
   * Calculate similarity between two clusters using average linkage
   * (average of all pairwise similarities between propositions in the clusters)
   */
  private calculateClusterSimilarity(
    cluster1Indices: number[],
    cluster2Indices: number[],
    similarityMatrix: number[][],
  ): number {
    let totalSimilarity = 0;
    let count = 0;

    for (const i of cluster1Indices) {
      for (const j of cluster2Indices) {
        totalSimilarity += similarityMatrix[i]?.[j] ?? 0;
        count++;
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Calculate cohesion score for a cluster
   * (average pairwise similarity within the cluster)
   */
  private calculateClusterCohesion(
    propositionIndices: number[],
    similarityMatrix: number[][],
  ): number {
    if (propositionIndices.length < 2) {
      return 1.0;
    }

    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < propositionIndices.length; i++) {
      for (let j = i + 1; j < propositionIndices.length; j++) {
        const iIndex = propositionIndices[i];
        const jIndex = propositionIndices[j];
        if (iIndex !== undefined && jIndex !== undefined) {
          totalSimilarity += similarityMatrix[iIndex]?.[jIndex] ?? 0;
          count++;
        }
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Get top N keywords by frequency
   */
  private getTopKeywords(keywords: string[], topN: number): string[] {
    // For now, just return the first N
    // In a real implementation, we'd count frequency across all propositions
    return keywords.slice(0, topN);
  }

  /**
   * Generate a descriptive theme for the cluster
   */
  private generateTheme(propositions: PropositionInput[], keywords: string[]): string {
    if (keywords.length === 0) {
      return 'Related propositions';
    }

    // Create a theme from top keywords
    const keywordPhrase = keywords.slice(0, 3).join(', ');
    return `Propositions about ${keywordPhrase}`;
  }

  /**
   * Calculate overall clustering quality score
   * Based on silhouette coefficient concept:
   * - High intra-cluster similarity (cohesion)
   * - Low inter-cluster similarity (separation)
   */
  private calculateQualityScore(
    clusters: PropositionCluster[],
    similarityMatrix: number[][],
    totalPropositions: number,
  ): number {
    if (clusters.length === 0) {
      return 0;
    }

    // Simple quality metric: average cohesion score weighted by coverage
    const avgCohesion = clusters.reduce((sum, c) => sum + c.cohesionScore, 0) / clusters.length;

    const clusteredCount = clusters.reduce((sum, c) => sum + c.size, 0);
    const coverage = clusteredCount / totalPropositions;

    // Quality is a combination of cohesion and coverage
    return Math.round((avgCohesion * 0.7 + coverage * 0.3) * 100) / 100;
  }
}
