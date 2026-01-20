import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TopicsController } from './topics.controller.js';

const createMockTopicsService = () => ({
  getTopics: vi.fn(),
  searchTopics: vi.fn(),
  getTopicById: vi.fn(),
  getCommonGroundAnalysis: vi.fn(),
});

const createMockExportService = () => ({
  exportAnalysis: vi.fn(),
  generateShareLink: vi.fn(),
});

const createMockResponse = () => ({
  setHeader: vi.fn(),
  send: vi.fn(),
});

describe('TopicsController', () => {
  let controller: TopicsController;
  let mockTopicsService: ReturnType<typeof createMockTopicsService>;
  let mockExportService: ReturnType<typeof createMockExportService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTopicsService = createMockTopicsService();
    mockExportService = createMockExportService();
    controller = new TopicsController(mockTopicsService as any, mockExportService as any);
  });

  describe('getTopics', () => {
    it('should return paginated topics', async () => {
      const query = { limit: 10, page: 1 };
      const expectedResponse = {
        topics: [{ id: 'topic-1', title: 'Test Topic' }],
        pagination: { total: 1, page: 1, limit: 10 },
      };
      mockTopicsService.getTopics.mockResolvedValue(expectedResponse);

      const result = await controller.getTopics(query);

      expect(result).toEqual(expectedResponse);
      expect(mockTopicsService.getTopics).toHaveBeenCalledWith(query);
    });

    it('should pass query parameters to service', async () => {
      const query = { limit: 20, page: 2, status: 'active' };
      mockTopicsService.getTopics.mockResolvedValue({ topics: [], pagination: {} });

      await controller.getTopics(query as any);

      expect(mockTopicsService.getTopics).toHaveBeenCalledWith(query);
    });
  });

  describe('searchTopics', () => {
    it('should return search results', async () => {
      const query = { query: 'climate', limit: 10 };
      const expectedResponse = {
        topics: [{ id: 'topic-1', title: 'Climate Discussion' }],
        pagination: { total: 1, page: 1, limit: 10 },
      };
      mockTopicsService.searchTopics.mockResolvedValue(expectedResponse);

      const result = await controller.searchTopics(query as any);

      expect(result).toEqual(expectedResponse);
      expect(mockTopicsService.searchTopics).toHaveBeenCalledWith(query);
    });
  });

  describe('getTopicById', () => {
    it('should return topic by ID', async () => {
      const expectedTopic = { id: 'topic-1', title: 'Test Topic', content: 'Content' };
      mockTopicsService.getTopicById.mockResolvedValue(expectedTopic);

      const result = await controller.getTopicById('topic-1');

      expect(result).toEqual(expectedTopic);
      expect(mockTopicsService.getTopicById).toHaveBeenCalledWith('topic-1');
    });
  });

  describe('getCommonGroundAnalysis', () => {
    it('should return common ground analysis', async () => {
      const expectedAnalysis = {
        id: 'analysis-1',
        topicId: 'topic-1',
        agreementZones: [],
        divergencePoints: [],
      };
      mockTopicsService.getCommonGroundAnalysis.mockResolvedValue(expectedAnalysis);

      const result = await controller.getCommonGroundAnalysis('topic-1', {});

      expect(result).toEqual(expectedAnalysis);
      expect(mockTopicsService.getCommonGroundAnalysis).toHaveBeenCalledWith('topic-1', undefined);
    });

    it('should pass version parameter when provided', async () => {
      const expectedAnalysis = { id: 'analysis-1', version: 2 };
      mockTopicsService.getCommonGroundAnalysis.mockResolvedValue(expectedAnalysis);

      const result = await controller.getCommonGroundAnalysis('topic-1', { version: 2 });

      expect(result).toEqual(expectedAnalysis);
      expect(mockTopicsService.getCommonGroundAnalysis).toHaveBeenCalledWith('topic-1', 2);
    });
  });

  describe('exportCommonGroundAnalysis', () => {
    it('should export analysis as PDF', async () => {
      const analysis = { id: 'analysis-1', topicId: 'topic-1' };
      const exportResult = {
        data: Buffer.from('pdf content'),
        mimeType: 'application/pdf',
        filename: 'common-ground-analysis.pdf',
      };
      mockTopicsService.getCommonGroundAnalysis.mockResolvedValue(analysis);
      mockExportService.exportAnalysis.mockResolvedValue(exportResult);

      const mockRes = createMockResponse();
      await controller.exportCommonGroundAnalysis('topic-1', { format: 'pdf' }, mockRes as any);

      expect(mockTopicsService.getCommonGroundAnalysis).toHaveBeenCalledWith('topic-1', undefined);
      expect(mockExportService.exportAnalysis).toHaveBeenCalledWith(analysis, 'pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="common-ground-analysis.pdf"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(exportResult.data);
    });

    it('should default to PDF format when not specified', async () => {
      const analysis = { id: 'analysis-1' };
      const exportResult = {
        data: Buffer.from('pdf'),
        mimeType: 'application/pdf',
        filename: 'analysis.pdf',
      };
      mockTopicsService.getCommonGroundAnalysis.mockResolvedValue(analysis);
      mockExportService.exportAnalysis.mockResolvedValue(exportResult);

      const mockRes = createMockResponse();
      await controller.exportCommonGroundAnalysis('topic-1', {}, mockRes as any);

      expect(mockExportService.exportAnalysis).toHaveBeenCalledWith(analysis, 'pdf');
    });

    it('should export analysis as JSON', async () => {
      const analysis = { id: 'analysis-1', topicId: 'topic-1' };
      const exportResult = {
        data: '{"id": "analysis-1"}',
        mimeType: 'application/json',
        filename: 'common-ground-analysis.json',
      };
      mockTopicsService.getCommonGroundAnalysis.mockResolvedValue(analysis);
      mockExportService.exportAnalysis.mockResolvedValue(exportResult);

      const mockRes = createMockResponse();
      await controller.exportCommonGroundAnalysis('topic-1', { format: 'json' }, mockRes as any);

      expect(mockExportService.exportAnalysis).toHaveBeenCalledWith(analysis, 'json');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.send).toHaveBeenCalledWith(exportResult.data);
    });

    it('should pass version parameter to service', async () => {
      const analysis = { id: 'analysis-1' };
      mockTopicsService.getCommonGroundAnalysis.mockResolvedValue(analysis);
      mockExportService.exportAnalysis.mockResolvedValue({
        data: Buffer.from(''),
        mimeType: 'application/pdf',
        filename: 'analysis.pdf',
      });

      const mockRes = createMockResponse();
      await controller.exportCommonGroundAnalysis(
        'topic-1',
        { version: 3, format: 'pdf' },
        mockRes as any,
      );

      expect(mockTopicsService.getCommonGroundAnalysis).toHaveBeenCalledWith('topic-1', 3);
    });
  });

  describe('getCommonGroundShareLink', () => {
    it('should generate share link', async () => {
      const analysis = { id: 'analysis-1', topicId: 'topic-1' };
      const shareUrl = 'http://localhost:3000/share/analysis-1';
      mockTopicsService.getCommonGroundAnalysis.mockResolvedValue(analysis);
      mockExportService.generateShareLink.mockReturnValue(shareUrl);

      const result = await controller.getCommonGroundShareLink('topic-1', {});

      expect(result).toEqual({
        shareUrl,
        analysisId: 'analysis-1',
      });
      expect(mockExportService.generateShareLink).toHaveBeenCalledWith(
        'analysis-1',
        'http://localhost:3000',
      );
    });

    it('should pass version parameter when provided', async () => {
      const analysis = { id: 'analysis-2' };
      mockTopicsService.getCommonGroundAnalysis.mockResolvedValue(analysis);
      mockExportService.generateShareLink.mockReturnValue('http://example.com/share/analysis-2');

      await controller.getCommonGroundShareLink('topic-1', { version: 5 });

      expect(mockTopicsService.getCommonGroundAnalysis).toHaveBeenCalledWith('topic-1', 5);
    });

    it('should use APP_BASE_URL from environment if set', async () => {
      const originalEnv = process.env['APP_BASE_URL'];
      process.env['APP_BASE_URL'] = 'https://myapp.com';

      const analysis = { id: 'analysis-1' };
      mockTopicsService.getCommonGroundAnalysis.mockResolvedValue(analysis);
      mockExportService.generateShareLink.mockReturnValue('https://myapp.com/share/analysis-1');

      await controller.getCommonGroundShareLink('topic-1', {});

      expect(mockExportService.generateShareLink).toHaveBeenCalledWith(
        'analysis-1',
        'https://myapp.com',
      );

      // Restore original environment
      if (originalEnv === undefined) {
        delete process.env['APP_BASE_URL'];
      } else {
        process.env['APP_BASE_URL'] = originalEnv;
      }
    });
  });
});
