/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for ArgumentFeedbackPanel component
 *
 * @module components/simulator/ArgumentFeedbackPanel.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ArgumentAnalysis, Fallacy, SimulationMetrics } from '../../types/simulator';
import { ArgumentFeedbackPanel } from './ArgumentFeedbackPanel';

// Mock data for tests
const createMockFallacy = (overrides: Partial<Fallacy> = {}): Fallacy => ({
  type: 'Ad Hominem',
  description: 'Attacking the person instead of their argument',
  excerpt: 'You would say that because...',
  severity: 'moderate',
  ...overrides,
});

const createMockAnalysis = (overrides: Partial<ArgumentAnalysis> = {}): ArgumentAnalysis => ({
  fallacies: [],
  unsupportedClaims: [],
  toneScore: 75,
  evidenceScore: 60,
  coherenceScore: 80,
  suggestions: [],
  ...overrides,
});

const createMockMetrics = (overrides: Partial<SimulationMetrics> = {}): SimulationMetrics => ({
  exchangeCount: 5,
  totalFallacies: 2,
  averageToneScore: 70,
  averageEvidenceScore: 65,
  averageCoherenceScore: 75,
  totalUnsupportedClaims: 3,
  ...overrides,
});

describe('ArgumentFeedbackPanel', () => {
  describe('Loading state', () => {
    it('renders skeleton when isLoading is true', () => {
      render(<ArgumentFeedbackPanel analysis={null} isLoading={true} />);

      expect(screen.getByTestId('argument-analysis-skeleton')).toBeInTheDocument();
    });

    it('does not render empty state when loading', () => {
      render(<ArgumentFeedbackPanel analysis={null} isLoading={true} />);

      expect(screen.queryByTestId('argument-feedback-empty')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('renders empty state when analysis is null and not loading', () => {
      render(<ArgumentFeedbackPanel analysis={null} isLoading={false} />);

      expect(screen.getByTestId('argument-feedback-empty')).toBeInTheDocument();
      expect(screen.getByText('No analysis yet')).toBeInTheDocument();
      expect(
        screen.getByText('Submit a message to receive real-time feedback on your argument'),
      ).toBeInTheDocument();
    });

    it('renders panel header in empty state', () => {
      render(<ArgumentFeedbackPanel analysis={null} />);

      expect(screen.getByText('Argument Analysis')).toBeInTheDocument();
    });
  });

  describe('Fallacies section', () => {
    it('shows "No fallacies detected" when fallacies array is empty', () => {
      const analysis = createMockAnalysis({ fallacies: [] });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByTestId('no-fallacies')).toBeInTheDocument();
      expect(screen.getByText('No fallacies detected')).toBeInTheDocument();
    });

    it('renders fallacy items when fallacies exist', () => {
      const analysis = createMockAnalysis({
        fallacies: [
          createMockFallacy({ type: 'Ad Hominem', severity: 'moderate' }),
          createMockFallacy({ type: 'Straw Man', severity: 'major' }),
        ],
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByTestId('fallacies-list')).toBeInTheDocument();
      expect(screen.getByTestId('fallacy-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('fallacy-item-1')).toBeInTheDocument();
      expect(screen.getByText('Ad Hominem')).toBeInTheDocument();
      expect(screen.getByText('Straw Man')).toBeInTheDocument();
    });

    it('displays fallacy count badge', () => {
      const analysis = createMockAnalysis({
        fallacies: [createMockFallacy(), createMockFallacy({ type: 'Appeal to Authority' })],
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      // Should show count badge with "2"
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows severity badge on fallacy items', () => {
      const analysis = createMockAnalysis({
        fallacies: [createMockFallacy({ severity: 'major' })],
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByText('major')).toBeInTheDocument();
    });

    it('displays fallacy excerpt', () => {
      const analysis = createMockAnalysis({
        fallacies: [createMockFallacy({ excerpt: 'This is a test excerpt' })],
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      // Using curly quotes due to HTML entity escaping
      expect(screen.getByText(/This is a test excerpt/)).toBeInTheDocument();
    });
  });

  describe('Unsupported claims section', () => {
    it('shows "All claims supported" when no unsupported claims', () => {
      const analysis = createMockAnalysis({ unsupportedClaims: [] });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByTestId('no-unsupported-claims')).toBeInTheDocument();
      expect(screen.getByText('All claims supported')).toBeInTheDocument();
    });

    it('renders unsupported claims list', () => {
      const analysis = createMockAnalysis({
        unsupportedClaims: ['Productivity increases', 'Costs are lower'],
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByTestId('unsupported-claims-list')).toBeInTheDocument();
      expect(screen.getByTestId('unsupported-claim-0')).toBeInTheDocument();
      expect(screen.getByTestId('unsupported-claim-1')).toBeInTheDocument();
      expect(screen.getByText('Productivity increases')).toBeInTheDocument();
      expect(screen.getByText('Costs are lower')).toBeInTheDocument();
    });

    it('displays unsupported claims count badge', () => {
      const analysis = createMockAnalysis({
        unsupportedClaims: ['Claim 1', 'Claim 2', 'Claim 3'],
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      // Should show count badge with "3"
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Scores section', () => {
    it('renders all three score bars', () => {
      const analysis = createMockAnalysis({
        toneScore: 75,
        evidenceScore: 60,
        coherenceScore: 85,
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByTestId('score-tone')).toBeInTheDocument();
      expect(screen.getByTestId('score-evidence')).toBeInTheDocument();
      expect(screen.getByTestId('score-coherence')).toBeInTheDocument();
    });

    it('displays score values', () => {
      const analysis = createMockAnalysis({
        toneScore: 75,
        evidenceScore: 60,
        coherenceScore: 85,
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('renders progress bars with correct width styles', () => {
      const analysis = createMockAnalysis({
        toneScore: 50,
        evidenceScore: 100,
        coherenceScore: 0,
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      const toneBar = screen.getByTestId('score-tone');
      const evidenceBar = screen.getByTestId('score-evidence');
      const coherenceBar = screen.getByTestId('score-coherence');

      expect(toneBar.querySelector('[role="progressbar"]')).toHaveStyle({ width: '50%' });
      expect(evidenceBar.querySelector('[role="progressbar"]')).toHaveStyle({ width: '100%' });
      expect(coherenceBar.querySelector('[role="progressbar"]')).toHaveStyle({ width: '0%' });
    });

    it('has correct ARIA attributes on progress bars', () => {
      const analysis = createMockAnalysis({ toneScore: 75 });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      const toneProgressBar = screen
        .getByTestId('score-tone')
        .querySelector('[role="progressbar"]');
      expect(toneProgressBar).toHaveAttribute('aria-valuenow', '75');
      expect(toneProgressBar).toHaveAttribute('aria-valuemin', '0');
      expect(toneProgressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Suggestions section', () => {
    it('shows "No suggestions" when suggestions array is empty', () => {
      const analysis = createMockAnalysis({ suggestions: [] });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByTestId('no-suggestions')).toBeInTheDocument();
      expect(screen.getByText('No suggestions at this time')).toBeInTheDocument();
    });

    it('renders numbered suggestions list', () => {
      const analysis = createMockAnalysis({
        suggestions: ['Add more evidence', 'Consider counterarguments', 'Improve tone'],
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByTestId('suggestions-list')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-0')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-1')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-2')).toBeInTheDocument();

      expect(screen.getByText('Add more evidence')).toBeInTheDocument();
      expect(screen.getByText('Consider counterarguments')).toBeInTheDocument();
      expect(screen.getByText('Improve tone')).toBeInTheDocument();
    });

    it('displays suggestion numbers', () => {
      const analysis = createMockAnalysis({
        suggestions: ['First suggestion', 'Second suggestion'],
      });
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      // Numbers should be in the numbered circles
      const suggestion1 = screen.getByTestId('suggestion-0');
      const suggestion2 = screen.getByTestId('suggestion-1');

      expect(suggestion1).toHaveTextContent('1');
      expect(suggestion2).toHaveTextContent('2');
    });
  });

  describe('Session metrics', () => {
    it('renders metrics summary when provided and exchangeCount > 0', () => {
      const analysis = createMockAnalysis();
      const metrics = createMockMetrics({ exchangeCount: 5 });
      render(<ArgumentFeedbackPanel analysis={analysis} metrics={metrics} />);

      expect(screen.getByTestId('session-metrics')).toBeInTheDocument();
      expect(screen.getByText('Session Summary')).toBeInTheDocument();
    });

    it('does not render metrics when exchangeCount is 0', () => {
      const analysis = createMockAnalysis();
      const metrics = createMockMetrics({ exchangeCount: 0 });
      render(<ArgumentFeedbackPanel analysis={analysis} metrics={metrics} />);

      expect(screen.queryByTestId('session-metrics')).not.toBeInTheDocument();
    });

    it('does not render metrics when not provided', () => {
      const analysis = createMockAnalysis();
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.queryByTestId('session-metrics')).not.toBeInTheDocument();
    });

    it('displays correct metric values', () => {
      const analysis = createMockAnalysis();
      const metrics = createMockMetrics({
        exchangeCount: 5,
        totalFallacies: 3,
        totalUnsupportedClaims: 2,
        averageToneScore: 60,
        averageEvidenceScore: 70,
        averageCoherenceScore: 80,
      });
      render(<ArgumentFeedbackPanel analysis={analysis} metrics={metrics} />);

      // Exchanges: 5
      expect(screen.getByText('5')).toBeInTheDocument();

      // Fallacies (in metrics, not analysis fallacies count)
      // This appears in the metrics section with red color
      const metricsSection = screen.getByTestId('session-metrics');
      expect(metricsSection).toHaveTextContent('3');

      // Unsupported claims: 2
      expect(metricsSection).toHaveTextContent('2');

      // Average score: (60 + 70 + 80) / 3 = 70
      expect(metricsSection).toHaveTextContent('70');
    });
  });

  describe('Accessibility', () => {
    it('has correct panel aria-label', () => {
      const analysis = createMockAnalysis();
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByTestId('argument-feedback-panel')).toHaveAttribute(
        'aria-label',
        'Argument feedback analysis',
      );
    });

    it('has accessible section headings', () => {
      const analysis = createMockAnalysis();
      render(<ArgumentFeedbackPanel analysis={analysis} />);

      expect(screen.getByText('Fallacies Detected')).toBeInTheDocument();
      expect(screen.getByText('Unsupported Claims')).toBeInTheDocument();
      expect(screen.getByText('Scores')).toBeInTheDocument();
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
    });

    it('uses semantic sections with aria-labelledby', () => {
      const analysis = createMockAnalysis();
      const { container } = render(<ArgumentFeedbackPanel analysis={analysis} />);

      const sections = container.querySelectorAll('section[aria-labelledby]');
      expect(sections.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Custom className', () => {
    it('applies custom className to container', () => {
      const analysis = createMockAnalysis();
      render(<ArgumentFeedbackPanel analysis={analysis} className="custom-class" />);

      expect(screen.getByTestId('argument-feedback-panel')).toHaveClass('custom-class');
    });

    it('applies custom className in loading state', () => {
      render(<ArgumentFeedbackPanel analysis={null} isLoading={true} className="custom-class" />);

      expect(screen.getByTestId('argument-analysis-skeleton')).toHaveClass('custom-class');
    });

    it('applies custom className in empty state', () => {
      render(<ArgumentFeedbackPanel analysis={null} className="custom-class" />);

      expect(screen.getByTestId('argument-feedback-panel')).toHaveClass('custom-class');
    });
  });

  describe('Full analysis scenario', () => {
    it('renders all sections with populated data', () => {
      const analysis = createMockAnalysis({
        fallacies: [
          createMockFallacy({ type: 'Straw Man', severity: 'major' }),
          createMockFallacy({ type: 'False Dichotomy', severity: 'minor' }),
        ],
        unsupportedClaims: ['Remote work is always better', 'Offices are obsolete'],
        toneScore: 65,
        evidenceScore: 45,
        coherenceScore: 80,
        suggestions: [
          'Cite specific studies',
          'Address counterarguments',
          'Soften absolute statements',
        ],
      });
      const metrics = createMockMetrics({
        exchangeCount: 3,
        totalFallacies: 4,
        totalUnsupportedClaims: 5,
      });

      render(<ArgumentFeedbackPanel analysis={analysis} metrics={metrics} />);

      // Header
      expect(screen.getByText('Argument Analysis')).toBeInTheDocument();

      // Fallacies
      expect(screen.getByText('Straw Man')).toBeInTheDocument();
      expect(screen.getByText('False Dichotomy')).toBeInTheDocument();

      // Claims
      expect(screen.getByText('Remote work is always better')).toBeInTheDocument();
      expect(screen.getByText('Offices are obsolete')).toBeInTheDocument();

      // Scores
      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();

      // Suggestions
      expect(screen.getByText('Cite specific studies')).toBeInTheDocument();
      expect(screen.getByText('Address counterarguments')).toBeInTheDocument();
      expect(screen.getByText('Soften absolute statements')).toBeInTheDocument();

      // Metrics
      expect(screen.getByTestId('session-metrics')).toBeInTheDocument();
    });
  });
});
