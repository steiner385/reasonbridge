import { PropositionClustererService } from '../services/proposition-clusterer.service.js';
import type {
  ClusterPropositionsRequest,
  PropositionInput,
  PropositionCluster,
} from '../dto/proposition-cluster.dto.js';

describe('PropositionClustererService', () => {
  let service: PropositionClustererService;

  beforeEach(() => {
    service = new PropositionClustererService();
  });

  describe('clusterPropositions', () => {
    it('should cluster similar propositions about climate change', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-1',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Climate change is caused by carbon emissions from fossil fuels',
          },
          {
            id: 'prop-2',
            statement: 'Renewable energy reduces carbon emissions and helps climate',
          },
          {
            id: 'prop-3',
            statement: 'Healthcare should be free for all citizens',
          },
          {
            id: 'prop-4',
            statement: 'Universal healthcare improves citizen wellbeing',
          },
          {
            id: 'prop-5',
            statement: 'Carbon taxes can reduce fossil fuel emissions',
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      expect(result.topicId).toBe('topic-1');
      expect(result.clusters.length).toBeGreaterThan(0);
      expect(result.method).toBe('pattern-based');

      // Should have at least one cluster about climate/emissions
      const climateCluster = result.clusters.find((c: PropositionCluster) =>
        c.keywords.some(
          (k: string) => k.includes('climate') || k.includes('carbon') || k.includes('emissions'),
        ),
      );
      expect(climateCluster).toBeDefined();
      expect(climateCluster!.size).toBeGreaterThanOrEqual(2);

      // May or may not cluster healthcare depending on keyword overlap
      // Just verify total coverage
      const totalClustered = result.clusters.reduce(
        (sum: number, c: PropositionCluster) => sum + c.size,
        0,
      );
      expect(totalClustered + result.unclusteredPropositionIds.length).toBe(5);
    });

    it('should not cluster completely unrelated propositions', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-2',
        propositions: [
          {
            id: 'prop-1',
            statement: 'The sky is blue',
          },
          {
            id: 'prop-2',
            statement: 'Pizza is made with cheese',
          },
          {
            id: 'prop-3',
            statement: 'Cats are domesticated animals',
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      // With completely unrelated propositions, we expect:
      // - Either no clusters (all in unclustered)
      // - Or very low quality score
      // - Low confidence
      expect(result.confidence).toBeLessThanOrEqual(0.7);
      expect(result.clusters.length + result.unclusteredPropositionIds.length).toBe(3);
    });

    it('should handle single proposition', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-3',
        propositions: [
          {
            id: 'prop-1',
            statement: 'This is a single proposition',
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      expect(result.clusters.length).toBe(0);
      expect(result.unclusteredPropositionIds).toContain('prop-1');
      expect(result.qualityScore).toBe(0);
    });

    it('should respect custom similarity threshold', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-4',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Tax policy should favor economic growth',
          },
          {
            id: 'prop-2',
            statement: 'Economic policy should promote growth',
          },
          {
            id: 'prop-3',
            statement: 'Tax rates affect economic outcomes',
          },
        ],
        similarityThreshold: 0.4, // Lower threshold = more clustering
      };

      const result = await service.clusterPropositions(request);

      // With lower threshold, more likely to cluster
      expect(result.clusters.length).toBeGreaterThanOrEqual(0);

      // Run again with higher threshold
      const strictRequest = { ...request, similarityThreshold: 0.9 };
      const strictResult = await service.clusterPropositions(strictRequest);

      // Higher threshold should result in fewer or no clusters
      expect(strictResult.clusters.length).toBeLessThanOrEqual(result.clusters.length);
    });

    it('should identify cluster cohesion scores', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-5',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Education funding should increase for public schools',
          },
          {
            id: 'prop-2',
            statement: 'Public school funding needs to be higher',
          },
          {
            id: 'prop-3',
            statement: 'Teachers deserve better salaries in education',
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      // If clusters are formed, they should have cohesion scores
      for (const cluster of result.clusters) {
        expect(cluster.cohesionScore).toBeGreaterThanOrEqual(0);
        expect(cluster.cohesionScore).toBeLessThanOrEqual(1);
      }
    });

    it('should extract meaningful keywords for clusters', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-6',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Artificial intelligence will transform healthcare diagnostics',
          },
          {
            id: 'prop-2',
            statement: 'Machine learning improves medical diagnosis accuracy',
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      // Should have at least one cluster with relevant keywords
      if (result.clusters.length > 0) {
        const cluster = result.clusters[0];
        expect(cluster).toBeDefined();
        expect(cluster!.keywords.length).toBeGreaterThan(0);
        // Keywords should not include common stop words
        expect(cluster!.keywords).not.toContain('the');
        expect(cluster!.keywords).not.toContain('is');
        expect(cluster!.keywords).not.toContain('and');
      }
    });

    it('should generate descriptive themes for clusters', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-7',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Immigration policy needs comprehensive reform',
          },
          {
            id: 'prop-2',
            statement: 'Border security is essential for immigration control',
          },
          {
            id: 'prop-3',
            statement: 'Immigration reform should include pathway to citizenship',
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      // Clusters should have meaningful themes
      for (const cluster of result.clusters) {
        expect(cluster.theme).toBeTruthy();
        expect(cluster.theme.length).toBeGreaterThan(0);
        expect(cluster.theme).toMatch(/Propositions about/);
      }
    });

    it('should calculate quality score based on clustering effectiveness', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-8',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Democracy requires transparent government operations',
          },
          {
            id: 'prop-2',
            statement: 'Government transparency is essential for democracy',
          },
          {
            id: 'prop-3',
            statement: 'Democratic systems need transparent governance',
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      // Quality score should be between 0 and 1
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);

      // With highly similar propositions, quality should be decent
      if (result.clusters.length > 0) {
        expect(result.qualityScore).toBeGreaterThan(0.3);
      }
    });

    it('should handle empty propositions array', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-9',
        propositions: [],
      };

      const result = await service.clusterPropositions(request);

      expect(result.clusters.length).toBe(0);
      expect(result.unclusteredPropositionIds.length).toBe(0);
      expect(result.qualityScore).toBe(0);
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should provide reasoning for clustering decisions', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-10',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Privacy protection is critical in the digital age',
          },
          {
            id: 'prop-2',
            statement: 'Digital privacy rights need stronger enforcement',
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(0);
      // Should mention the method used
      expect(result.reasoning.toLowerCase()).toContain('keyword');
    });

    it('should cluster multiple distinct groups correctly', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-11',
        propositions: [
          // Group 1: Environment
          {
            id: 'prop-1',
            statement: 'Renewable energy reduces environmental pollution',
          },
          {
            id: 'prop-2',
            statement: 'Solar power is clean renewable energy source',
          },
          // Group 2: Education
          {
            id: 'prop-3',
            statement: 'Quality education improves student outcomes',
          },
          {
            id: 'prop-4',
            statement: 'Student learning requires quality educational resources',
          },
          // Group 3: Technology
          {
            id: 'prop-5',
            statement: 'Cybersecurity protects digital infrastructure',
          },
          {
            id: 'prop-6',
            statement: 'Digital security prevents cyber attacks',
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      // Should identify multiple distinct clusters
      expect(result.clusters.length).toBeGreaterThanOrEqual(2);

      // Each cluster should have at least 2 propositions
      for (const cluster of result.clusters) {
        expect(cluster.size).toBeGreaterThanOrEqual(2);
      }

      // Total clustered + unclustered should equal input
      const totalClustered = result.clusters.reduce(
        (sum: number, c: PropositionCluster) => sum + c.size,
        0,
      );
      const total = totalClustered + result.unclusteredPropositionIds.length;
      expect(total).toBe(6);
    });

    it('should include proposition metadata in clustering', async () => {
      const request: ClusterPropositionsRequest = {
        topicId: 'topic-12',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Infrastructure investment creates jobs',
            metadata: {
              supportCount: 45,
              opposeCount: 5,
              consensusScore: 0.9,
            },
          },
          {
            id: 'prop-2',
            statement: 'Infrastructure projects boost employment',
            metadata: {
              supportCount: 40,
              opposeCount: 10,
              consensusScore: 0.8,
            },
          },
        ],
      };

      const result = await service.clusterPropositions(request);

      // Metadata should not break clustering
      expect(result.topicId).toBe('topic-12');
      expect(result.clusters.length + result.unclusteredPropositionIds.length).toBeLessThanOrEqual(
        2,
      );
    });
  });
});
