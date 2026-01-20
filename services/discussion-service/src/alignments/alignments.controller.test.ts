import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlignmentsController } from './alignments.controller.js';

const createMockAlignmentsService = () => ({
  getUserAlignment: vi.fn(),
  setAlignment: vi.fn(),
  removeAlignment: vi.fn(),
});

describe('AlignmentsController', () => {
  let controller: AlignmentsController;
  let mockAlignmentsService: ReturnType<typeof createMockAlignmentsService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAlignmentsService = createMockAlignmentsService();
    controller = new AlignmentsController(mockAlignmentsService as any);
  });

  describe('getUserAlignment', () => {
    it('should return user alignment when it exists', async () => {
      const alignment = {
        id: 'alignment-1',
        propositionId: 'proposition-1',
        userId: 'user-1',
        position: 'AGREE',
        createdAt: new Date(),
      };
      mockAlignmentsService.getUserAlignment.mockResolvedValue(alignment);

      const result = await controller.getUserAlignment('proposition-1', 'user-1');

      expect(result).toEqual(alignment);
      expect(mockAlignmentsService.getUserAlignment).toHaveBeenCalledWith(
        'proposition-1',
        'user-1',
      );
    });

    it('should return null when user has no alignment', async () => {
      mockAlignmentsService.getUserAlignment.mockResolvedValue(null);

      const result = await controller.getUserAlignment('proposition-1', 'user-1');

      expect(result).toBeNull();
    });

    it('should pass correct propositionId and userId', async () => {
      mockAlignmentsService.getUserAlignment.mockResolvedValue(null);

      await controller.getUserAlignment('prop-123', 'user-456');

      expect(mockAlignmentsService.getUserAlignment).toHaveBeenCalledWith('prop-123', 'user-456');
    });
  });

  describe('setAlignment', () => {
    it('should create new alignment', async () => {
      const setAlignmentDto = { position: 'AGREE' };
      const newAlignment = {
        id: 'alignment-1',
        propositionId: 'proposition-1',
        userId: 'user-1',
        position: 'AGREE',
        createdAt: new Date(),
      };
      mockAlignmentsService.setAlignment.mockResolvedValue(newAlignment);

      const result = await controller.setAlignment(
        'proposition-1',
        'user-1',
        setAlignmentDto as any,
      );

      expect(result).toEqual(newAlignment);
      expect(mockAlignmentsService.setAlignment).toHaveBeenCalledWith(
        'proposition-1',
        'user-1',
        setAlignmentDto,
      );
    });

    it('should update existing alignment', async () => {
      const setAlignmentDto = { position: 'DISAGREE' };
      const updatedAlignment = {
        id: 'alignment-1',
        propositionId: 'proposition-1',
        userId: 'user-1',
        position: 'DISAGREE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAlignmentsService.setAlignment.mockResolvedValue(updatedAlignment);

      const result = await controller.setAlignment(
        'proposition-1',
        'user-1',
        setAlignmentDto as any,
      );

      expect(result).toEqual(updatedAlignment);
      expect(result.position).toBe('DISAGREE');
    });

    it('should handle NEUTRAL position', async () => {
      const setAlignmentDto = { position: 'NEUTRAL' };
      const neutralAlignment = {
        id: 'alignment-1',
        position: 'NEUTRAL',
      };
      mockAlignmentsService.setAlignment.mockResolvedValue(neutralAlignment);

      const result = await controller.setAlignment(
        'proposition-1',
        'user-1',
        setAlignmentDto as any,
      );

      expect(result.position).toBe('NEUTRAL');
    });
  });

  describe('removeAlignment', () => {
    it('should remove alignment', async () => {
      mockAlignmentsService.removeAlignment.mockResolvedValue(undefined);

      await controller.removeAlignment('proposition-1', 'user-1');

      expect(mockAlignmentsService.removeAlignment).toHaveBeenCalledWith('proposition-1', 'user-1');
    });

    it('should not throw when alignment does not exist', async () => {
      mockAlignmentsService.removeAlignment.mockResolvedValue(undefined);

      await expect(controller.removeAlignment('proposition-1', 'user-1')).resolves.not.toThrow();
    });
  });
});
