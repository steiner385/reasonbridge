import { Injectable } from '@nestjs/common';
import type { CommonGroundResponseDto } from '../topics/dto/common-ground-response.dto.js';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export type ExportFormat = 'pdf' | 'json' | 'markdown';

export interface ExportResult {
  /**
   * The exported data as a buffer or string
   */
  data: Buffer | string;

  /**
   * MIME type of the exported data
   */
  mimeType: string;

  /**
   * Suggested filename for the export
   */
  filename: string;
}

/**
 * Service for exporting common ground analysis in various formats
 */
@Injectable()
export class CommonGroundExportService {
  /**
   * Export common ground analysis in the specified format
   */
  async exportAnalysis(
    analysis: CommonGroundResponseDto,
    format: ExportFormat,
  ): Promise<ExportResult> {
    switch (format) {
      case 'pdf':
        return this.exportToPdf(analysis);
      case 'json':
        return this.exportToJson(analysis);
      case 'markdown':
        return this.exportToMarkdown(analysis);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export analysis to PDF format
   */
  private async exportToPdf(
    analysis: CommonGroundResponseDto,
  ): Promise<ExportResult> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          data: buffer,
          mimeType: 'application/pdf',
          filename: `common-ground-${analysis.id}.pdf`,
        });
      });
      doc.on('error', reject);

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Common Ground Analysis', { align: 'center' });

      doc.moveDown(0.5);

      // Metadata
      doc.fontSize(10).font('Helvetica');
      doc.text(`Analysis ID: ${analysis.id}`, { align: 'center' });
      doc.text(
        `Generated: ${new Date(analysis.generatedAt).toLocaleString()}`,
        { align: 'center' },
      );
      doc.text(`Version: ${analysis.version}`, { align: 'center' });

      doc.moveDown(1);

      // Summary Box
      const summaryY = doc.y;
      doc.rect(50, summaryY, doc.page.width - 100, 80).stroke();

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Summary', 60, summaryY + 10);

      doc.fontSize(10).font('Helvetica');
      doc.text(
        `Participants: ${analysis.participantCountAtGeneration}`,
        60,
        summaryY + 30,
      );
      doc.text(
        `Responses: ${analysis.responseCountAtGeneration}`,
        60,
        summaryY + 45,
      );
      doc.text(
        `Overall Consensus: ${analysis.overallConsensusScore}%`,
        60,
        summaryY + 60,
      );

      doc.y = summaryY + 90;
      doc.moveDown(1);

      // Agreement Zones
      if (analysis.agreementZones.length > 0) {
        this.addSection(
          doc,
          'Agreement Zones',
          `${analysis.agreementZones.length}`,
        );

        analysis.agreementZones.forEach((zone, index) => {
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text(`${index + 1}. Agreement Zone`);

          doc.fontSize(10).font('Helvetica');
          doc.text(`Description: ${zone.description}`, { indent: 20 });
          doc.text(
            `Participant Coverage: ${Math.round(zone.participantPercentage)}%`,
            { indent: 20 },
          );
          doc.text(`Confidence: ${Math.round(zone.confidence * 100)}%`, {
            indent: 20,
          });
          doc.text(
            `Propositions: ${zone.propositionIds.length} included`,
            { indent: 20 },
          );

          doc.moveDown(0.5);
        });

        doc.moveDown(1);
      }

      // Misunderstandings
      if (analysis.misunderstandings.length > 0) {
        this.addSection(
          doc,
          'Identified Misunderstandings',
          `${analysis.misunderstandings.length}`,
        );

        analysis.misunderstandings.forEach((mis, index) => {
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text(`${index + 1}. Term: "${mis.term}"`);

          doc.fontSize(10).font('Helvetica');
          doc.text(`Description: ${mis.description}`, { indent: 20 });

          if (mis.definitions.length > 0) {
            doc.text('Different Definitions:', { indent: 20 });
            mis.definitions.forEach((def) => {
              doc.text(
                `• "${def.definition}" (${def.userCount} user${def.userCount !== 1 ? 's' : ''})`,
                { indent: 30 },
              );
            });
          }

          if (mis.affectedPropositions.length > 0) {
            doc.text(
              `Affected Propositions: ${mis.affectedPropositions.length}`,
              { indent: 20 },
            );
          }

          doc.moveDown(0.5);
        });

        doc.moveDown(1);
      }

      // Genuine Disagreements
      if (analysis.genuineDisagreements.length > 0) {
        this.addSection(
          doc,
          'Genuine Disagreements',
          `${analysis.genuineDisagreements.length}`,
        );

        analysis.genuineDisagreements.forEach((dis, index) => {
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text(`${index + 1}. Disagreement`);

          doc.fontSize(10).font('Helvetica');
          doc.text(`Description: ${dis.description}`, { indent: 20 });

          if (dis.underlyingValues.length > 0) {
            doc.text('Underlying Values:', { indent: 20 });
            dis.underlyingValues.forEach((value) => {
              doc.text(`• ${value}`, { indent: 30 });
            });
          }

          if (dis.moralFoundations.length > 0) {
            doc.text(
              `Moral Foundations: ${dis.moralFoundations.join(', ')}`,
              { indent: 20 },
            );
          }

          if (dis.propositionIds.length > 0) {
            doc.text(`Related Propositions: ${dis.propositionIds.length}`, {
              indent: 20,
            });
          }

          doc.moveDown(0.5);
        });
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        // Page number
        doc.fontSize(8);
        doc.text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          doc.page.height - 40,
          {
            align: 'center',
          },
        );
      }

      doc.end();
    });
  }

  /**
   * Helper to add section headers in PDF
   */
  private addSection(
    doc: PDFKit.PDFDocument,
    title: string,
    count?: string,
  ): void {
    doc.fontSize(14).font('Helvetica-Bold');
    if (count) {
      doc.text(`${title} (${count})`);
    } else {
      doc.text(title);
    }
    doc.moveDown(0.5);
  }

  /**
   * Export analysis to JSON format
   */
  private async exportToJson(
    analysis: CommonGroundResponseDto,
  ): Promise<ExportResult> {
    const data = JSON.stringify(analysis, null, 2);
    return {
      data,
      mimeType: 'application/json',
      filename: `common-ground-${analysis.id}.json`,
    };
  }

  /**
   * Export analysis to Markdown format
   */
  private async exportToMarkdown(
    analysis: CommonGroundResponseDto,
  ): Promise<ExportResult> {
    let markdown = `# Common Ground Analysis\n\n`;

    // Metadata
    markdown += `**Analysis ID:** ${analysis.id}\n`;
    markdown += `**Version:** ${analysis.version}\n`;
    markdown += `**Generated:** ${new Date(analysis.generatedAt).toLocaleString()}\n`;
    markdown += `**Participants:** ${analysis.participantCountAtGeneration}\n`;
    markdown += `**Responses:** ${analysis.responseCountAtGeneration}\n`;
    markdown += `**Overall Consensus Score:** ${analysis.overallConsensusScore}%\n\n`;

    markdown += `---\n\n`;

    // Agreement Zones
    if (analysis.agreementZones.length > 0) {
      markdown += `## Agreement Zones (${analysis.agreementZones.length})\n\n`;

      analysis.agreementZones.forEach((zone, index) => {
        markdown += `### ${index + 1}. Agreement Zone\n\n`;
        markdown += `${zone.description}\n\n`;
        markdown += `- **Participant Coverage:** ${Math.round(zone.participantPercentage)}%\n`;
        markdown += `- **Confidence:** ${Math.round(zone.confidence * 100)}%\n`;
        markdown += `- **Propositions:** ${zone.propositionIds.length} included\n\n`;
      });
    }

    // Misunderstandings
    if (analysis.misunderstandings.length > 0) {
      markdown += `## Identified Misunderstandings (${analysis.misunderstandings.length})\n\n`;

      analysis.misunderstandings.forEach((mis, index) => {
        markdown += `### ${index + 1}. Term: "${mis.term}"\n\n`;
        markdown += `${mis.description}\n\n`;

        if (mis.definitions.length > 0) {
          markdown += `**Different Definitions:**\n`;
          mis.definitions.forEach((def) => {
            markdown += `- "${def.definition}" (${def.userCount} user${def.userCount !== 1 ? 's' : ''})\n`;
          });
          markdown += `\n`;
        }

        if (mis.affectedPropositions.length > 0) {
          markdown += `**Affected Propositions:** ${mis.affectedPropositions.length}\n\n`;
        }
      });
    }

    // Genuine Disagreements
    if (analysis.genuineDisagreements.length > 0) {
      markdown += `## Genuine Disagreements (${analysis.genuineDisagreements.length})\n\n`;

      analysis.genuineDisagreements.forEach((dis, index) => {
        markdown += `### ${index + 1}. Disagreement\n\n`;
        markdown += `${dis.description}\n\n`;

        if (dis.underlyingValues.length > 0) {
          markdown += `**Underlying Values:**\n`;
          dis.underlyingValues.forEach((value) => {
            markdown += `- ${value}\n`;
          });
          markdown += `\n`;
        }

        if (dis.moralFoundations.length > 0) {
          markdown += `**Moral Foundations:** ${dis.moralFoundations.join(', ')}\n\n`;
        }

        if (dis.propositionIds.length > 0) {
          markdown += `**Related Propositions:** ${dis.propositionIds.length}\n\n`;
        }
      });
    }

    markdown += `---\n\n`;
    markdown += `*Generated by Unite Discord Common Ground Analysis*\n`;

    return {
      data: markdown,
      mimeType: 'text/markdown',
      filename: `common-ground-${analysis.id}.md`,
    };
  }

  /**
   * Generate a shareable link for the analysis
   * @param analysisId The ID of the analysis
   * @param baseUrl The base URL of the application (e.g., 'https://app.example.com')
   * @returns The shareable URL
   */
  generateShareLink(analysisId: string, baseUrl: string): string {
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/common-ground/${analysisId}`;
  }
}
