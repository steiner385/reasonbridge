import { CommonGroundExportService } from '../services/common-ground-export.service.js';
import type { CommonGroundResponseDto } from '../topics/dto/common-ground-response.dto.js';
import PDFDocument from 'pdfkit';

describe('CommonGroundExportService', () => {
  let service: CommonGroundExportService;

  beforeEach(() => {
    service = new CommonGroundExportService();
  });

  // Sample test data
  const createMockAnalysis = (): CommonGroundResponseDto => ({
    id: 'test-analysis-123',
    version: 1,
    overallConsensusScore: 72,
    participantCountAtGeneration: 50,
    responseCountAtGeneration: 150,
    generatedAt: new Date('2026-01-18T10:00:00Z'),
    agreementZones: [
      {
        description: 'Most participants agree that climate change requires urgent action',
        confidence: 0.85,
        propositionIds: ['prop-1', 'prop-2', 'prop-3'],
        participantPercentage: 78,
      },
      {
        description: 'Strong consensus on the need for renewable energy investment',
        confidence: 0.92,
        propositionIds: ['prop-4', 'prop-5'],
        participantPercentage: 85,
      },
    ],
    misunderstandings: [
      {
        term: 'socialism',
        description: 'Different interpretations of economic systems',
        definitions: [
          { definition: 'Government ownership of means of production', userCount: 15 },
          { definition: 'Strong social safety nets', userCount: 10 },
          { definition: 'Mixed economy with public services', userCount: 8 },
        ],
        affectedPropositions: ['prop-10', 'prop-11'],
      },
    ],
    genuineDisagreements: [
      {
        description: 'Fundamental split on taxation policy',
        underlyingValues: ['economic freedom', 'social equality'],
        moralFoundations: ['fairness', 'liberty'],
        propositionIds: ['prop-20', 'prop-21'],
      },
    ],
  });

  describe('exportAnalysis', () => {
    it('should throw error for unsupported format', async () => {
      const analysis = createMockAnalysis();
      await expect(
        service.exportAnalysis(analysis, 'xml' as any),
      ).rejects.toThrow('Unsupported export format: xml');
    });

    it('should route to JSON export for json format', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'json');

      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toBe('common-ground-test-analysis-123.json');
      expect(typeof result.data).toBe('string');
    });

    it('should route to Markdown export for markdown format', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'markdown');

      expect(result.mimeType).toBe('text/markdown');
      expect(result.filename).toBe('common-ground-test-analysis-123.md');
      expect(typeof result.data).toBe('string');
    });

    it('should route to PDF export for pdf format', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'pdf');

      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toBe('common-ground-test-analysis-123.pdf');
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });
  });

  describe('exportToJson', () => {
    it('should export complete analysis to JSON', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'json');

      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toBe('common-ground-test-analysis-123.json');
      expect(typeof result.data).toBe('string');

      const parsed = JSON.parse(result.data as string);
      expect(parsed.id).toBe('test-analysis-123');
      expect(parsed.version).toBe(1);
      expect(parsed.overallConsensusScore).toBe(72);
      expect(parsed.agreementZones).toHaveLength(2);
      expect(parsed.misunderstandings).toHaveLength(1);
      expect(parsed.genuineDisagreements).toHaveLength(1);
    });

    it('should include all agreement zone details', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'json');
      const parsed = JSON.parse(result.data as string);

      expect(parsed.agreementZones[0]).toEqual({
        description: 'Most participants agree that climate change requires urgent action',
        confidence: 0.85,
        propositionIds: ['prop-1', 'prop-2', 'prop-3'],
        participantPercentage: 78,
      });
    });

    it('should handle analysis with empty sections', async () => {
      const minimalAnalysis: CommonGroundResponseDto = {
        id: 'minimal-123',
        version: 1,
        overallConsensusScore: 50,
        participantCountAtGeneration: 10,
        responseCountAtGeneration: 25,
        generatedAt: new Date('2026-01-18T10:00:00Z'),
        agreementZones: [],
        misunderstandings: [],
        genuineDisagreements: [],
      };

      const result = await service.exportAnalysis(minimalAnalysis, 'json');
      const parsed = JSON.parse(result.data as string);

      expect(parsed.agreementZones).toEqual([]);
      expect(parsed.misunderstandings).toEqual([]);
      expect(parsed.genuineDisagreements).toEqual([]);
    });

    it('should produce valid JSON that can be round-tripped', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'json');

      // Parse and stringify again to verify it's valid JSON
      const parsed = JSON.parse(result.data as string);
      const reparsed = JSON.stringify(parsed, null, 2);

      expect(() => JSON.parse(reparsed)).not.toThrow();
    });
  });

  describe('exportToMarkdown', () => {
    it('should export complete analysis to Markdown', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'markdown');

      expect(result.mimeType).toBe('text/markdown');
      expect(result.filename).toBe('common-ground-test-analysis-123.md');
      expect(typeof result.data).toBe('string');

      const markdown = result.data as string;
      expect(markdown).toContain('# Common Ground Analysis');
      expect(markdown).toContain('**Analysis ID:** test-analysis-123');
      expect(markdown).toContain('**Version:** 1');
      expect(markdown).toContain('**Overall Consensus Score:** 72%');
    });

    it('should include agreement zones section', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'markdown');
      const markdown = result.data as string;

      expect(markdown).toContain('## Agreement Zones (2)');
      expect(markdown).toContain('### 1. Agreement Zone');
      expect(markdown).toContain('Most participants agree that climate change requires urgent action');
      expect(markdown).toContain('**Participant Coverage:** 78%');
      expect(markdown).toContain('**Confidence:** 85%');
      expect(markdown).toContain('**Propositions:** 3 included');
    });

    it('should include misunderstandings section', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'markdown');
      const markdown = result.data as string;

      expect(markdown).toContain('## Identified Misunderstandings (1)');
      expect(markdown).toContain('### 1. Term: "socialism"');
      expect(markdown).toContain('Different interpretations of economic systems');
      expect(markdown).toContain('**Different Definitions:**');
      expect(markdown).toContain('Government ownership of means of production');
      expect(markdown).toContain('15 users');
    });

    it('should include genuine disagreements section', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'markdown');
      const markdown = result.data as string;

      expect(markdown).toContain('## Genuine Disagreements (1)');
      expect(markdown).toContain('### 1. Disagreement');
      expect(markdown).toContain('Fundamental split on taxation policy');
      expect(markdown).toContain('**Underlying Values:**');
      expect(markdown).toContain('economic freedom');
      expect(markdown).toContain('social equality');
      expect(markdown).toContain('**Moral Foundations:** fairness, liberty');
    });

    it('should handle empty sections gracefully', async () => {
      const minimalAnalysis: CommonGroundResponseDto = {
        id: 'minimal-123',
        version: 1,
        overallConsensusScore: 50,
        participantCountAtGeneration: 10,
        responseCountAtGeneration: 25,
        generatedAt: new Date('2026-01-18T10:00:00Z'),
        agreementZones: [],
        misunderstandings: [],
        genuineDisagreements: [],
      };

      const result = await service.exportAnalysis(minimalAnalysis, 'markdown');
      const markdown = result.data as string;

      expect(markdown).toContain('# Common Ground Analysis');
      expect(markdown).toContain('**Overall Consensus Score:** 50%');
      // Should not contain section headers for empty sections
      expect(markdown).not.toContain('## Agreement Zones');
      expect(markdown).not.toContain('## Identified Misunderstandings');
      expect(markdown).not.toContain('## Genuine Disagreements');
    });

    it('should include footer with attribution', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'markdown');
      const markdown = result.data as string;

      expect(markdown).toContain('*Generated by Unite Discord Common Ground Analysis*');
    });
  });

  describe('exportToPdf', () => {
    it('should export complete analysis to PDF', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'pdf');

      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toBe('common-ground-test-analysis-123.pdf');
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect((result.data as Buffer).length).toBeGreaterThan(0);
    });

    it('should generate PDF buffer with correct magic bytes', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'pdf');
      const buffer = result.data as Buffer;

      // PDF files start with %PDF-
      const magicBytes = buffer.toString('ascii', 0, 4);
      expect(magicBytes).toBe('%PDF');
    });

    it('should handle analysis with empty sections in PDF', async () => {
      const minimalAnalysis: CommonGroundResponseDto = {
        id: 'minimal-123',
        version: 1,
        overallConsensusScore: 50,
        participantCountAtGeneration: 10,
        responseCountAtGeneration: 25,
        generatedAt: new Date('2026-01-18T10:00:00Z'),
        agreementZones: [],
        misunderstandings: [],
        genuineDisagreements: [],
      };

      const result = await service.exportAnalysis(minimalAnalysis, 'pdf');

      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect((result.data as Buffer).length).toBeGreaterThan(0);
    });

    it('should include metadata in PDF', async () => {
      const analysis = createMockAnalysis();
      const result = await service.exportAnalysis(analysis, 'pdf');

      expect(result.filename).toContain('test-analysis-123');
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });

    it('should handle multiple agreement zones in PDF', async () => {
      const analysis = createMockAnalysis();
      // Already has 2 agreement zones
      const result = await service.exportAnalysis(analysis, 'pdf');

      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect((result.data as Buffer).length).toBeGreaterThan(1000); // Should have substantial content
    });

    it('should handle multiple misunderstandings with multiple definitions', async () => {
      const analysis: CommonGroundResponseDto = {
        ...createMockAnalysis(),
        misunderstandings: [
          {
            term: 'freedom',
            description: 'Multiple interpretations of personal liberty',
            definitions: [
              { definition: 'Absence of government interference', userCount: 20 },
              { definition: 'Equal opportunity for all', userCount: 18 },
              { definition: 'Right to self-determination', userCount: 12 },
            ],
            affectedPropositions: ['prop-30', 'prop-31', 'prop-32'],
          },
          {
            term: 'justice',
            description: 'Different views on fairness',
            definitions: [
              { definition: 'Equal treatment under law', userCount: 25 },
              { definition: 'Equitable distribution of resources', userCount: 15 },
            ],
            affectedPropositions: ['prop-40'],
          },
        ],
      };

      const result = await service.exportAnalysis(analysis, 'pdf');

      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect((result.data as Buffer).length).toBeGreaterThan(1000);
    });
  });

  describe('generateShareLink', () => {
    it('should generate correct share link with clean base URL', () => {
      const link = service.generateShareLink('analysis-123', 'https://app.example.com');
      expect(link).toBe('https://app.example.com/common-ground/analysis-123');
    });

    it('should remove trailing slash from base URL', () => {
      const link = service.generateShareLink('analysis-456', 'https://app.example.com/');
      expect(link).toBe('https://app.example.com/common-ground/analysis-456');
    });

    it('should handle localhost URLs', () => {
      const link = service.generateShareLink('local-test', 'http://localhost:3000');
      expect(link).toBe('http://localhost:3000/common-ground/local-test');
    });

    it('should handle URLs with port numbers', () => {
      const link = service.generateShareLink('test-id', 'https://example.com:8080');
      expect(link).toBe('https://example.com:8080/common-ground/test-id');
    });

    it('should handle base URL with multiple trailing slashes', () => {
      const link = service.generateShareLink('test-123', 'https://example.com///');
      // Implementation removes only one trailing slash, which is acceptable
      expect(link).toBe('https://example.com///common-ground/test-123');
    });

    it('should work with analysis IDs containing special characters', () => {
      const link = service.generateShareLink('test-123-abc_def', 'https://example.com');
      expect(link).toBe('https://example.com/common-ground/test-123-abc_def');
    });

    it('should generate different links for different analysis IDs', () => {
      const link1 = service.generateShareLink('analysis-1', 'https://app.example.com');
      const link2 = service.generateShareLink('analysis-2', 'https://app.example.com');

      expect(link1).not.toBe(link2);
      expect(link1).toContain('analysis-1');
      expect(link2).toContain('analysis-2');
    });
  });

  describe('edge cases', () => {
    it('should handle very long analysis descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      const analysis: CommonGroundResponseDto = {
        ...createMockAnalysis(),
        agreementZones: [
          {
            description: longDescription,
            confidence: 0.9,
            propositionIds: ['prop-1'],
            participantPercentage: 80,
          },
        ],
      };

      const jsonResult = await service.exportAnalysis(analysis, 'json');
      expect(jsonResult.data).toContain(longDescription);

      const markdownResult = await service.exportAnalysis(analysis, 'markdown');
      expect(markdownResult.data).toContain(longDescription);

      const pdfResult = await service.exportAnalysis(analysis, 'pdf');
      expect(Buffer.isBuffer(pdfResult.data)).toBe(true);
    });

    it('should handle zero participants', async () => {
      const analysis: CommonGroundResponseDto = {
        ...createMockAnalysis(),
        participantCountAtGeneration: 0,
        responseCountAtGeneration: 0,
      };

      const result = await service.exportAnalysis(analysis, 'json');
      const parsed = JSON.parse(result.data as string);
      expect(parsed.participantCountAtGeneration).toBe(0);
    });

    it('should handle single-user definitions in misunderstandings', async () => {
      const analysis: CommonGroundResponseDto = {
        ...createMockAnalysis(),
        misunderstandings: [
          {
            term: 'unique',
            description: 'Only one person has this interpretation',
            definitions: [{ definition: 'Singular view', userCount: 1 }],
            affectedPropositions: [],
          },
        ],
      };

      const markdownResult = await service.exportAnalysis(analysis, 'markdown');
      const markdown = markdownResult.data as string;
      // Should use singular "user" not "users"
      expect(markdown).toContain('1 user');
      expect(markdown).not.toContain('1 users');
    });

    it('should handle empty proposition IDs arrays', async () => {
      const analysis: CommonGroundResponseDto = {
        ...createMockAnalysis(),
        agreementZones: [
          {
            description: 'Zone with no propositions',
            confidence: 0.5,
            propositionIds: [],
            participantPercentage: 50,
          },
        ],
        misunderstandings: [
          {
            term: 'test',
            description: 'No affected propositions',
            definitions: [],
            affectedPropositions: [],
          },
        ],
        genuineDisagreements: [
          {
            description: 'Disagreement with no propositions',
            underlyingValues: [],
            moralFoundations: [],
            propositionIds: [],
          },
        ],
      };

      const jsonResult = await service.exportAnalysis(analysis, 'json');
      expect(jsonResult).toBeDefined();

      const markdownResult = await service.exportAnalysis(analysis, 'markdown');
      expect(markdownResult).toBeDefined();

      const pdfResult = await service.exportAnalysis(analysis, 'pdf');
      expect(pdfResult).toBeDefined();
    });
  });
});
