import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlignmentsService } from './alignments.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const createMockPrismaService = () => ({
  proposition: {
    findUnique: vi.fn(),
  },
  alignment: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

const createMockAggregationService = () => ({
  updatePropositionAggregates: vi.fn().mockResolvedValue(undefined),
});

const createMockAlignment = (overrides = {}) => ({
  id: 'alignment-1',
  userId: 'user-1',
  propositionId: 'proposition-1',
  stance: 'SUPPORT',
  nuanceExplanation: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('AlignmentsService', () => {
  let service: AlignmentsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockAggregation: ReturnType<typeof createMockAggregationService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockAggregation = createMockAggregationService();
    service = new AlignmentsService(mockPrisma as any, mockAggregation as any);
  });

  describe('setAlignment', () => {
    const setAlignmentDto = { stance: 'SUPPORT' as const };

    it('should throw NotFoundException if proposition does not exist', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue(null);

      await expect(service.setAlignment('nonexistent', 'user-1', setAlignmentDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if NUANCED without nuanceExplanation', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({ id: 'proposition-1' });

      await expect(
        service.setAlignment('proposition-1', 'user-1', { stance: 'NUANCED' }),
      ).rejects.toThrow('nuanceExplanation is required when stance is NUANCED');
    });

    it('should create new alignment if no existing alignment', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({ id: 'proposition-1' });
      mockPrisma.alignment.findUnique.mockResolvedValue(null);
      mockPrisma.alignment.create.mockResolvedValue(createMockAlignment());

      const result = await service.setAlignment('proposition-1', 'user-1', setAlignmentDto);

      expect(mockPrisma.alignment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          propositionId: 'proposition-1',
          stance: 'SUPPORT',
          nuanceExplanation: null,
        },
      });
      expect(result.stance).toBe('SUPPORT');
    });

    it('should update existing alignment', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({ id: 'proposition-1' });
      mockPrisma.alignment.findUnique.mockResolvedValue(createMockAlignment());
      mockPrisma.alignment.update.mockResolvedValue(createMockAlignment({ stance: 'OPPOSE' }));

      const result = await service.setAlignment('proposition-1', 'user-1', {
        stance: 'OPPOSE',
      });

      expect(mockPrisma.alignment.update).toHaveBeenCalledWith({
        where: { id: 'alignment-1' },
        data: {
          stance: 'OPPOSE',
          nuanceExplanation: null,
        },
      });
      expect(result.stance).toBe('OPPOSE');
    });

    it('should call aggregation service after creating alignment', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({ id: 'proposition-1' });
      mockPrisma.alignment.findUnique.mockResolvedValue(null);
      mockPrisma.alignment.create.mockResolvedValue(createMockAlignment());

      await service.setAlignment('proposition-1', 'user-1', setAlignmentDto);

      expect(mockAggregation.updatePropositionAggregates).toHaveBeenCalledWith('proposition-1');
    });

    it('should call aggregation service after updating alignment', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({ id: 'proposition-1' });
      mockPrisma.alignment.findUnique.mockResolvedValue(createMockAlignment());
      mockPrisma.alignment.update.mockResolvedValue(createMockAlignment());

      await service.setAlignment('proposition-1', 'user-1', setAlignmentDto);

      expect(mockAggregation.updatePropositionAggregates).toHaveBeenCalledWith('proposition-1');
    });

    it('should create NUANCED alignment with explanation', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({ id: 'proposition-1' });
      mockPrisma.alignment.findUnique.mockResolvedValue(null);
      mockPrisma.alignment.create.mockResolvedValue(
        createMockAlignment({
          stance: 'NUANCED',
          nuanceExplanation: 'I partially agree because...',
        }),
      );

      const result = await service.setAlignment('proposition-1', 'user-1', {
        stance: 'NUANCED',
        nuanceExplanation: 'I partially agree because...',
      });

      expect(mockPrisma.alignment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          propositionId: 'proposition-1',
          stance: 'NUANCED',
          nuanceExplanation: 'I partially agree because...',
        },
      });
      expect(result.nuanceExplanation).toBe('I partially agree because...');
    });

    it('should return alignment DTO with correct fields', async () => {
      mockPrisma.proposition.findUnique.mockResolvedValue({ id: 'proposition-1' });
      mockPrisma.alignment.findUnique.mockResolvedValue(null);
      mockPrisma.alignment.create.mockResolvedValue(createMockAlignment());

      const result = await service.setAlignment('proposition-1', 'user-1', setAlignmentDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('stance');
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('removeAlignment', () => {
    it('should throw NotFoundException if alignment does not exist', async () => {
      mockPrisma.alignment.findUnique.mockResolvedValue(null);

      await expect(service.removeAlignment('proposition-1', 'user-1')).rejects.toThrow(
        'Alignment not found',
      );
    });

    it('should delete alignment successfully', async () => {
      mockPrisma.alignment.findUnique.mockResolvedValue(createMockAlignment());
      mockPrisma.alignment.delete.mockResolvedValue(undefined);

      await service.removeAlignment('proposition-1', 'user-1');

      expect(mockPrisma.alignment.delete).toHaveBeenCalledWith({
        where: { id: 'alignment-1' },
      });
    });

    it('should call aggregation service after removing alignment', async () => {
      mockPrisma.alignment.findUnique.mockResolvedValue(createMockAlignment());
      mockPrisma.alignment.delete.mockResolvedValue(undefined);

      await service.removeAlignment('proposition-1', 'user-1');

      expect(mockAggregation.updatePropositionAggregates).toHaveBeenCalledWith('proposition-1');
    });

    it('should query with correct composite key', async () => {
      mockPrisma.alignment.findUnique.mockResolvedValue(createMockAlignment());
      mockPrisma.alignment.delete.mockResolvedValue(undefined);

      await service.removeAlignment('proposition-1', 'user-1');

      expect(mockPrisma.alignment.findUnique).toHaveBeenCalledWith({
        where: {
          userId_propositionId: {
            userId: 'user-1',
            propositionId: 'proposition-1',
          },
        },
      });
    });
  });

  describe('getUserAlignment', () => {
    it('should return null if alignment does not exist', async () => {
      mockPrisma.alignment.findUnique.mockResolvedValue(null);

      const result = await service.getUserAlignment('proposition-1', 'user-1');

      expect(result).toBeNull();
    });

    it('should return alignment DTO if alignment exists', async () => {
      mockPrisma.alignment.findUnique.mockResolvedValue(createMockAlignment());

      const result = await service.getUserAlignment('proposition-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('alignment-1');
      expect(result?.stance).toBe('SUPPORT');
    });

    it('should include nuanceExplanation when present', async () => {
      mockPrisma.alignment.findUnique.mockResolvedValue(
        createMockAlignment({
          stance: 'NUANCED',
          nuanceExplanation: 'My nuanced view...',
        }),
      );

      const result = await service.getUserAlignment('proposition-1', 'user-1');

      expect(result?.nuanceExplanation).toBe('My nuanced view...');
    });

    it('should not include nuanceExplanation when not present', async () => {
      mockPrisma.alignment.findUnique.mockResolvedValue(createMockAlignment());

      const result = await service.getUserAlignment('proposition-1', 'user-1');

      expect(result?.nuanceExplanation).toBeUndefined();
    });

    it('should query with correct composite key', async () => {
      mockPrisma.alignment.findUnique.mockResolvedValue(null);

      await service.getUserAlignment('proposition-1', 'user-1');

      expect(mockPrisma.alignment.findUnique).toHaveBeenCalledWith({
        where: {
          userId_propositionId: {
            userId: 'user-1',
            propositionId: 'proposition-1',
          },
        },
      });
    });
  });
});
