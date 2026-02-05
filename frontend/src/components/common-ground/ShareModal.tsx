import React, { useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { ExportFormat, CommonGroundAnalysis } from '../../types/common-ground';

export interface ShareModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;

  /**
   * The common ground analysis to share
   */
  analysis: CommonGroundAnalysis;

  /**
   * Optional: base URL for generating share links
   */
  baseUrl?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  analysis,
  baseUrl = window.location.origin,
}) => {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat>('json');

  // Generate shareable URL
  const shareUrl = `${baseUrl}/common-ground/${analysis.id}`;

  // Copy to clipboard functionality
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [shareUrl]);

  // Social media share handlers
  const handleSocialShare = useCallback(
    (platform: 'twitter' | 'facebook' | 'linkedin') => {
      const message = `Check out this common ground analysis`;
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedMessage = encodeURIComponent(message);

      let url = '';
      switch (platform) {
        case 'twitter':
          url = `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;
          break;
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
          break;
        case 'linkedin':
          url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
          break;
      }

      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');
    },
    [shareUrl],
  );

  // Email share handler
  const handleEmailShare = useCallback(() => {
    const subject = 'Common Ground Analysis';
    const body = `I thought you might find this common ground analysis interesting:\n\n${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [shareUrl]);

  // Export handler
  const handleExport = useCallback(() => {
    let data: string;
    let filename: string;
    let mimeType: string;

    switch (selectedExportFormat) {
      case 'json':
        data = JSON.stringify(analysis, null, 2);
        filename = `common-ground-${analysis.id}.json`;
        mimeType = 'application/json';
        break;

      case 'markdown':
        data = generateMarkdown(analysis);
        filename = `common-ground-${analysis.id}.md`;
        mimeType = 'text/markdown';
        break;

      case 'pdf':
        // PDF export would typically require a library like jsPDF
        // For now, we'll show an alert
        alert('PDF export coming soon!');
        return;

      default:
        return;
    }

    // Create and trigger download
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [analysis, selectedExportFormat]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Common Ground Analysis"
      size="md"
      data-testid="share-modal"
      footer={
        <Button variant="outline" onClick={onClose} data-testid="close-modal">
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Copy Link Section */}
        <div data-testid="share-link-section">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Share Link</h3>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Share URL"
            />
            <Button
              variant={copiedToClipboard ? 'secondary' : 'primary'}
              onClick={handleCopyLink}
              data-testid="copy-link-button"
              leftIcon={
                copiedToClipboard ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )
              }
            >
              {copiedToClipboard ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Social Media Section */}
        <div data-testid="social-section">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Share on Social Media
          </h3>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialShare('twitter')}
              data-testid="share-twitter"
              leftIcon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              }
            >
              Twitter
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialShare('facebook')}
              data-testid="share-facebook"
              leftIcon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              }
            >
              Facebook
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSocialShare('linkedin')}
              data-testid="share-linkedin"
              leftIcon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              }
            >
              LinkedIn
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleEmailShare}
              data-testid="share-email"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
            >
              Email
            </Button>
          </div>
        </div>

        {/* Export Section */}
        <div data-testid="export-section">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Export Analysis
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedExportFormat}
              onChange={(e) => setSelectedExportFormat(e.target.value as ExportFormat)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Export format"
              data-testid="export-format"
            >
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
              <option value="pdf">PDF</option>
            </select>
            <Button
              variant="primary"
              onClick={handleExport}
              data-testid="export-button"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            >
              Export
            </Button>
          </div>
        </div>

        {/* Analysis Summary */}
        <div
          className="pt-4 border-t border-gray-200 dark:border-gray-700"
          data-testid="analysis-summary"
        >
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Analysis Summary
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p data-testid="participant-count">
              <strong>Participants:</strong> {analysis.participantCount ?? 0}
            </p>
            <p>
              <strong>Agreement Zones:</strong> {analysis.agreementZones?.length ?? 0}
            </p>
            <p data-testid="consensus-score">
              <strong>Consensus Score:</strong> {analysis.overallConsensusScore}%
            </p>
            <p data-testid="last-updated">
              <strong>Last Updated:</strong> {new Date(analysis.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Helper function to generate markdown export
 */
function generateMarkdown(analysis: CommonGroundAnalysis): string {
  let markdown = `# Common Ground Analysis\n\n`;
  markdown += `**Analysis ID:** ${analysis.id}\n`;
  markdown += `**Participants:** ${analysis.participantCount}\n`;
  markdown += `**Overall Consensus Score:** ${analysis.overallConsensusScore}%\n`;
  markdown += `**Last Updated:** ${new Date(analysis.lastUpdated).toLocaleDateString()}\n\n`;

  // Agreement Zones
  if (analysis.agreementZones.length > 0) {
    markdown += `## Agreement Zones\n\n`;
    analysis.agreementZones.forEach((zone, index) => {
      markdown += `### ${index + 1}. ${zone.title}\n\n`;
      markdown += `${zone.description}\n\n`;
      markdown += `**Consensus Level:** ${zone.consensusLevel}\n`;
      markdown += `**Participants:** ${zone.participantCount}\n\n`;
      if (zone.propositions.length > 0) {
        markdown += `**Propositions:**\n`;
        zone.propositions.forEach((prop) => {
          markdown += `- ${prop.text} (${prop.agreementPercentage}% agreement)\n`;
        });
        markdown += `\n`;
      }
    });
  }

  // Misunderstandings
  if (analysis.misunderstandings.length > 0) {
    markdown += `## Misunderstandings\n\n`;
    analysis.misunderstandings.forEach((mis, index) => {
      markdown += `### ${index + 1}. Term: "${mis.term}"\n\n`;
      markdown += `**Different Definitions:**\n`;
      mis.definitions.forEach((def) => {
        markdown += `- "${def.definition}" (used by ${def.participants.length} participant(s))\n`;
      });
      if (mis.clarificationSuggestion) {
        markdown += `\n**Suggested Clarification:** ${mis.clarificationSuggestion}\n`;
      }
      markdown += `\n`;
    });
  }

  // Disagreements
  if (analysis.disagreements.length > 0) {
    markdown += `## Disagreements\n\n`;
    analysis.disagreements.forEach((dis, index) => {
      markdown += `### ${index + 1}. ${dis.topic}\n\n`;
      markdown += `${dis.description}\n\n`;
      markdown += `**Positions:**\n`;
      dis.positions.forEach((pos) => {
        markdown += `- **${pos.stance}** (${pos.participants.length} participant(s))\n`;
        markdown += `  - Reasoning: ${pos.reasoning}\n`;
        if (pos.underlyingValue) {
          markdown += `  - Underlying Value: ${pos.underlyingValue}\n`;
        }
      });
      markdown += `\n`;
    });
  }

  return markdown;
}

export default ShareModal;
