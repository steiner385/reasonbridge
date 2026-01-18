import { CommonGroundTriggerService } from '../services/common-ground-trigger.service.js';

describe('CommonGroundTriggerService', () => {
  let service: CommonGroundTriggerService;
  let mockPrisma: any;
  let mockCache: any;

  beforeEach(() => {
    // Create simple mock objects
    mockPrisma = {
      discussionTopic: {
        findUnique: async (args: any) => null,
      },
      commonGroundAnalysis: {
        findFirst: async (args: any) => null,
      },
    };

    mockCache = {
      del: async (key: string) => undefined,
      get: async (key: string) => null,
      set: async (key: string, value: any) => undefined,
    };

    service = new CommonGroundTriggerService(mockPrisma, mockCache);
  });

  describe('checkAndTrigger', () => {
    it('should return false if topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique = async () => null;

      const result = await service.checkAndTrigger('non-existent-topic');

      expect(result).toBe(false);
    });

    it('should not trigger for first analysis with insufficient participation', async () => {
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 5,
        participantCount: 3,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => null;

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(false);
    });

    it('should trigger for first analysis when reaching minimum threshold', async () => {
      let cacheDeleted = false;
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 10,
        participantCount: 10,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => null;
      mockCache.del = async (key: string) => {
        cacheDeleted = true;
        return undefined;
      };

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(true);
      expect(cacheDeleted).toBe(true);
    });

    it('should trigger when response delta threshold is met', async () => {
      let cacheDeleted = false;
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 50,
        participantCount: 20,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 40,
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      });
      mockCache.del = async (key: string) => {
        cacheDeleted = true;
        return undefined;
      };

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(true);
      expect(cacheDeleted).toBe(true);
    });

    it('should not trigger when response delta is below threshold', async () => {
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 45,
        participantCount: 20,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 40,
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      });

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(false);
    });

    it('should trigger when time threshold is met (6+ hours)', async () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      let cacheDeleted = false;

      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 45,
        participantCount: 20,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 40,
        createdAt: sixHoursAgo,
      });
      mockCache.del = async (key: string) => {
        cacheDeleted = true;
        return undefined;
      };

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(true);
      expect(cacheDeleted).toBe(true);
    });

    it('should not trigger when time threshold is not met (less than 6 hours)', async () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 45,
        participantCount: 20,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 40,
        createdAt: fiveHoursAgo,
      });

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(false);
    });

    it('should trigger when exactly 10 responses have been added', async () => {
      let cacheDeleted = false;
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 50,
        participantCount: 20,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 40,
        createdAt: new Date(Date.now() - 1000 * 60), // 1 minute ago
      });
      mockCache.del = async (key: string) => {
        cacheDeleted = true;
        return undefined;
      };

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(true);
      expect(cacheDeleted).toBe(true);
    });

    it('should not trigger with 9 new responses (just under threshold)', async () => {
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 49,
        participantCount: 20,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 40,
        createdAt: new Date(Date.now() - 1000 * 60), // 1 minute ago
      });

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully and return false', async () => {
      mockPrisma.discussionTopic.findUnique = async () => {
        throw new Error('Database connection error');
      };

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(false);
    });

    it('should require minimum 10 participants and 10 responses for first analysis', async () => {
      // 9 participants, 10 responses - should not trigger
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 10,
        participantCount: 9,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => null;

      let result = await service.checkAndTrigger('topic-1');
      expect(result).toBe(false);

      // 10 participants, 9 responses - should not trigger
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 9,
        participantCount: 10,
      });

      result = await service.checkAndTrigger('topic-1');
      expect(result).toBe(false);

      // 10 participants, 10 responses - should trigger
      let cacheDeleted = false;
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 10,
        participantCount: 10,
      });
      mockCache.del = async (key: string) => {
        cacheDeleted = true;
        return undefined;
      };

      result = await service.checkAndTrigger('topic-1');
      expect(result).toBe(true);
      expect(cacheDeleted).toBe(true);
    });

    it('should trigger with large response delta (60 new responses)', async () => {
      let cacheDeleted = false;
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 100,
        participantCount: 50,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 40,
        createdAt: new Date(Date.now() - 1000 * 60),
      });
      mockCache.del = async (key: string) => {
        cacheDeleted = true;
        return undefined;
      };

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(true);
      expect(cacheDeleted).toBe(true);
    });

    it('should trigger after exactly 6 hours have elapsed', async () => {
      const exactlySixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      let cacheDeleted = false;

      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 40,
        participantCount: 20,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 40,
        createdAt: exactlySixHoursAgo,
      });
      mockCache.del = async (key: string) => {
        cacheDeleted = true;
        return undefined;
      };

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(true);
      expect(cacheDeleted).toBe(true);
    });
  });

  describe('invalidateCommonGroundCache', () => {
    it('should delete the correct cache key', async () => {
      let deletedKey = '';
      mockCache.del = async (key: string) => {
        deletedKey = key;
        return undefined;
      };

      await service.invalidateCommonGroundCache('topic-123');

      expect(deletedKey).toBe('common-ground:topic:topic-123:latest');
    });

    it('should invalidate cache for different topic IDs', async () => {
      const deletedKeys: string[] = [];
      mockCache.del = async (key: string) => {
        deletedKeys.push(key);
        return undefined;
      };

      await service.invalidateCommonGroundCache('topic-1');
      await service.invalidateCommonGroundCache('topic-2');

      expect(deletedKeys).toEqual([
        'common-ground:topic:topic-1:latest',
        'common-ground:topic:topic-2:latest',
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle topic with zero response count', async () => {
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 0,
        participantCount: 0,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => null;

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(false);
    });

    it('should handle topic with very high response count', async () => {
      let cacheDeleted = false;
      mockPrisma.discussionTopic.findUnique = async () => ({
        id: 'topic-1',
        responseCount: 1000000,
        participantCount: 50000,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 999990,
        createdAt: new Date(Date.now() - 1000 * 60),
      });
      mockCache.del = async (key: string) => {
        cacheDeleted = true;
        return undefined;
      };

      const result = await service.checkAndTrigger('topic-1');

      expect(result).toBe(true);
      expect(cacheDeleted).toBe(true);
    });

    it('should handle topic ID with special characters', async () => {
      const specialTopicId = 'topic-123_abc-def';
      let deletedKey = '';

      mockPrisma.discussionTopic.findUnique = async () => ({
        id: specialTopicId,
        responseCount: 50,
        participantCount: 20,
      });
      mockPrisma.commonGroundAnalysis.findFirst = async () => ({
        responseCountAtGeneration: 40,
        createdAt: new Date(Date.now() - 1000 * 60),
      });
      mockCache.del = async (key: string) => {
        deletedKey = key;
        return undefined;
      };

      const result = await service.checkAndTrigger(specialTopicId);

      expect(result).toBe(true);
      expect(deletedKey).toBe(`common-ground:topic:${specialTopicId}:latest`);
    });
  });
});
