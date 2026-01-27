import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Prisma Decimal class for tests - use importOriginal to preserve
// other exports like PrismaClient while only mocking Prisma.Decimal
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();

  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
    toString(): string {
      return this.value.toString();
    }
  }

  return {
    ...actual,
    Prisma: {
      ...actual.Prisma,
      Decimal: MockDecimal,
    },
  };
});

import { AlignmentAggregationService } from './alignment-aggregation.service.js';

// Helper MockDecimal class for test assertions (same implementation)
class MockDecimal {
  private value: number;
  constructor(value: string | number) {
    this.value = typeof value === 'string' ? parseFloat(value) : value;
  }
  toNumber(): number {
    return this.value;
  }
  toString(): string {
    return this.value.toString();
  }
}

const createMockPrismaService = () => ({
  alignment: {
    findMany: vi.fn(),
  },
  proposition: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
});

describe('AlignmentAggregationService', () => {
  let service: AlignmentAggregationService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new AlignmentAggregationService(mockPrisma as any);
  });

  describe('updatePropositionAggregates', () => {
    it('should calculate counts for all support alignments', async () => {
      mockPrisma.alignment.findMany.mockResolvedValue([
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
      ]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.updatePropositionAggregates('proposition-1');

      expect(mockPrisma.proposition.update).toHaveBeenCalledWith({
        where: { id: 'proposition-1' },
        data: expect.objectContaining({
          supportCount: 3,
          opposeCount: 0,
          nuancedCount: 0,
        }),
      });
    });

    it('should calculate counts for all oppose alignments', async () => {
      mockPrisma.alignment.findMany.mockResolvedValue([{ stance: 'OPPOSE' }, { stance: 'OPPOSE' }]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.updatePropositionAggregates('proposition-1');

      expect(mockPrisma.proposition.update).toHaveBeenCalledWith({
        where: { id: 'proposition-1' },
        data: expect.objectContaining({
          supportCount: 0,
          opposeCount: 2,
          nuancedCount: 0,
        }),
      });
    });

    it('should calculate counts for mixed alignments', async () => {
      mockPrisma.alignment.findMany.mockResolvedValue([
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
        { stance: 'OPPOSE' },
        { stance: 'NUANCED' },
        { stance: 'NUANCED' },
      ]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.updatePropositionAggregates('proposition-1');

      expect(mockPrisma.proposition.update).toHaveBeenCalledWith({
        where: { id: 'proposition-1' },
        data: expect.objectContaining({
          supportCount: 2,
          opposeCount: 1,
          nuancedCount: 2,
        }),
      });
    });

    it('should set null consensus score for no alignments', async () => {
      mockPrisma.alignment.findMany.mockResolvedValue([]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.updatePropositionAggregates('proposition-1');

      expect(mockPrisma.proposition.update).toHaveBeenCalledWith({
        where: { id: 'proposition-1' },
        data: expect.objectContaining({
          supportCount: 0,
          opposeCount: 0,
          nuancedCount: 0,
          consensusScore: null,
        }),
      });
    });

    it('should calculate consensus score = 1.00 for all support', async () => {
      mockPrisma.alignment.findMany.mockResolvedValue([
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
      ]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.updatePropositionAggregates('proposition-1');

      const updateCall = mockPrisma.proposition.update.mock.calls[0][0];
      expect(updateCall.data.consensusScore).toEqual(new MockDecimal(1));
    });

    it('should calculate consensus score = 0.00 for all oppose', async () => {
      mockPrisma.alignment.findMany.mockResolvedValue([{ stance: 'OPPOSE' }, { stance: 'OPPOSE' }]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.updatePropositionAggregates('proposition-1');

      const updateCall = mockPrisma.proposition.update.mock.calls[0][0];
      expect(updateCall.data.consensusScore).toEqual(new MockDecimal(0));
    });

    it('should calculate consensus score = 0.50 for balanced votes', async () => {
      mockPrisma.alignment.findMany.mockResolvedValue([
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
        { stance: 'OPPOSE' },
        { stance: 'OPPOSE' },
      ]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.updatePropositionAggregates('proposition-1');

      const updateCall = mockPrisma.proposition.update.mock.calls[0][0];
      expect(updateCall.data.consensusScore).toEqual(new MockDecimal(0.5));
    });

    it('should calculate correct consensus score for mixed with nuanced (6-2-2)', async () => {
      mockPrisma.alignment.findMany.mockResolvedValue([
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
        { stance: 'SUPPORT' },
        { stance: 'OPPOSE' },
        { stance: 'OPPOSE' },
        { stance: 'NUANCED' },
        { stance: 'NUANCED' },
      ]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.updatePropositionAggregates('proposition-1');

      const updateCall = mockPrisma.proposition.update.mock.calls[0][0];
      // (6-2)/10 = 0.4, normalized = (0.4 + 1) / 2 = 0.70
      expect(updateCall.data.consensusScore).toEqual(new MockDecimal(0.7));
    });

    it('should query alignments with correct propositionId', async () => {
      mockPrisma.alignment.findMany.mockResolvedValue([]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.updatePropositionAggregates('proposition-123');

      expect(mockPrisma.alignment.findMany).toHaveBeenCalledWith({
        where: { propositionId: 'proposition-123' },
        select: { stance: true },
      });
    });
  });

  describe('getPropositionAggregates', () => {
    it('should return proposition aggregates', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({
        supportCount: 10,
        opposeCount: 5,
        nuancedCount: 3,
        consensusScore: new MockDecimal(0.64),
      });

      const result = await service.getPropositionAggregates('proposition-1');

      expect(result).toEqual({
        supportCount: 10,
        opposeCount: 5,
        nuancedCount: 3,
        consensusScore: new MockDecimal(0.64),
      });
    });

    it('should throw error if proposition not found', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue(null);

      await expect(service.getPropositionAggregates('nonexistent')).rejects.toThrow(
        'Proposition with ID nonexistent not found',
      );
    });

    it('should return null consensus score when not set', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({
        supportCount: 0,
        opposeCount: 0,
        nuancedCount: 0,
        consensusScore: null,
      });

      const result = await service.getPropositionAggregates('proposition-1');

      expect(result.consensusScore).toBeNull();
    });

    it('should query with correct select fields', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({
        supportCount: 0,
        opposeCount: 0,
        nuancedCount: 0,
        consensusScore: null,
      });

      await service.getPropositionAggregates('proposition-1');

      expect(mockPrisma.proposition.findUnique).toHaveBeenCalledWith({
        where: { id: 'proposition-1' },
        select: {
          supportCount: true,
          opposeCount: true,
          nuancedCount: true,
          consensusScore: true,
        },
      });
    });
  });

  describe('recalculateAllAggregates', () => {
    it('should recalculate aggregates for all propositions', async () => {
      mockPrisma.proposition.findMany.mockResolvedValue([
        { id: 'prop-1' },
        { id: 'prop-2' },
        { id: 'prop-3' },
      ]);
      mockPrisma.alignment.findMany.mockResolvedValue([]);
      mockPrisma.proposition.update.mockResolvedValue({});

      const result = await service.recalculateAllAggregates();

      expect(result).toBe(3);
      expect(mockPrisma.proposition.update).toHaveBeenCalledTimes(3);
    });

    it('should return 0 for no propositions', async () => {
      mockPrisma.proposition.findMany.mockResolvedValue([]);

      const result = await service.recalculateAllAggregates();

      expect(result).toBe(0);
    });

    it('should call updatePropositionAggregates for each proposition', async () => {
      mockPrisma.proposition.findMany.mockResolvedValue([{ id: 'prop-1' }, { id: 'prop-2' }]);
      mockPrisma.alignment.findMany.mockResolvedValue([]);
      mockPrisma.proposition.update.mockResolvedValue({});

      await service.recalculateAllAggregates();

      expect(mockPrisma.alignment.findMany).toHaveBeenCalledWith({
        where: { propositionId: 'prop-1' },
        select: { stance: true },
      });
      expect(mockPrisma.alignment.findMany).toHaveBeenCalledWith({
        where: { propositionId: 'prop-2' },
        select: { stance: true },
      });
    });
  });
});
