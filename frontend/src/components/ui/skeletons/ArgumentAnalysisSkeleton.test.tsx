/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArgumentAnalysisSkeleton } from './ArgumentAnalysisSkeleton';

describe('ArgumentAnalysisSkeleton', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<ArgumentAnalysisSkeleton />);
      const skeleton = screen.getByTestId('argument-analysis-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render header with title', () => {
      render(<ArgumentAnalysisSkeleton />);
      expect(screen.getByText('Argument Analysis')).toBeInTheDocument();
    });

    it('should render fallacies section', () => {
      render(<ArgumentAnalysisSkeleton />);
      const section = screen.getByTestId('argument-analysis-skeleton-fallacies');
      expect(section).toBeInTheDocument();
      expect(screen.getByText('Fallacies Detected')).toBeInTheDocument();
    });

    it('should render unsupported claims section', () => {
      render(<ArgumentAnalysisSkeleton />);
      const section = screen.getByTestId('argument-analysis-skeleton-claims');
      expect(section).toBeInTheDocument();
      expect(screen.getByText('Unsupported Claims')).toBeInTheDocument();
    });

    it('should render scores section', () => {
      render(<ArgumentAnalysisSkeleton />);
      const section = screen.getByTestId('argument-analysis-skeleton-scores');
      expect(section).toBeInTheDocument();
      expect(screen.getByText('Scores')).toBeInTheDocument();
    });

    it('should render all three score items', () => {
      render(<ArgumentAnalysisSkeleton />);
      expect(screen.getByText('Tone')).toBeInTheDocument();
      expect(screen.getByText('Evidence')).toBeInTheDocument();
      expect(screen.getByText('Coherence')).toBeInTheDocument();
    });

    it('should render suggestions section', () => {
      render(<ArgumentAnalysisSkeleton />);
      const section = screen.getByTestId('argument-analysis-skeleton-suggestions');
      expect(section).toBeInTheDocument();
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
    });

    it('should render results container', () => {
      render(<ArgumentAnalysisSkeleton />);
      const results = screen.getByTestId('argument-analysis-skeleton-results');
      expect(results).toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('should not show progress indicator by default', () => {
      render(<ArgumentAnalysisSkeleton />);
      const progress = screen.queryByTestId('argument-analysis-skeleton-progress');
      expect(progress).not.toBeInTheDocument();
    });

    it('should show progress indicator when showProgress is true', () => {
      render(<ArgumentAnalysisSkeleton showProgress />);
      const progress = screen.getByTestId('argument-analysis-skeleton-progress');
      expect(progress).toBeInTheDocument();
    });

    it('should show progress bar', () => {
      render(<ArgumentAnalysisSkeleton showProgress />);
      const progressBar = screen.getByTestId('argument-analysis-skeleton-progress-bar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should render step indicators', () => {
      render(<ArgumentAnalysisSkeleton showProgress />);
      const steps = screen.getByTestId('argument-analysis-skeleton-steps');
      expect(steps).toBeInTheDocument();
    });

    it('should render 5 steps by default', () => {
      render(<ArgumentAnalysisSkeleton showProgress totalSteps={5} />);
      expect(screen.getByTestId('argument-analysis-skeleton-step-0')).toBeInTheDocument();
      expect(screen.getByTestId('argument-analysis-skeleton-step-1')).toBeInTheDocument();
      expect(screen.getByTestId('argument-analysis-skeleton-step-2')).toBeInTheDocument();
      expect(screen.getByTestId('argument-analysis-skeleton-step-3')).toBeInTheDocument();
      expect(screen.getByTestId('argument-analysis-skeleton-step-4')).toBeInTheDocument();
    });

    it('should show estimated time remaining', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={2} totalSteps={5} />);
      const timeEstimate = screen.getByTestId('argument-analysis-skeleton-time-estimate');
      expect(timeEstimate).toBeInTheDocument();
      expect(timeEstimate).toHaveTextContent('~3s remaining');
    });

    it('should show "Complete" when all steps are done', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={5} totalSteps={5} />);
      const timeEstimate = screen.getByTestId('argument-analysis-skeleton-time-estimate');
      expect(timeEstimate).toHaveTextContent('Complete');
    });

    it('should not show time estimate when progress is hidden', () => {
      render(<ArgumentAnalysisSkeleton showProgress={false} />);
      const timeEstimate = screen.queryByTestId('argument-analysis-skeleton-time-estimate');
      expect(timeEstimate).not.toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should have correct progress percentage for 0 steps', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={0} totalSteps={5} />);
      const progressBar = screen.getByTestId('argument-analysis-skeleton-progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should have correct progress percentage for partial completion', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={2} totalSteps={5} />);
      const progressBar = screen.getByTestId('argument-analysis-skeleton-progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');
    });

    it('should have correct progress percentage for full completion', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={5} totalSteps={5} />);
      const progressBar = screen.getByTestId('argument-analysis-skeleton-progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should cap progress at 100%', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={10} totalSteps={5} />);
      const progressBar = screen.getByTestId('argument-analysis-skeleton-progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should have proper ARIA attributes', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={2} totalSteps={5} />);
      const progressBar = screen.getByTestId('argument-analysis-skeleton-progress-bar');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Analysis progress: 40%');
    });
  });

  describe('Step Indicators', () => {
    it('should show checkmark for completed steps', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={2} totalSteps={5} />);
      // First two steps should have green background (completed)
      const step0 = screen.getByTestId('argument-analysis-skeleton-step-0');
      const step1 = screen.getByTestId('argument-analysis-skeleton-step-1');

      // Check that completed steps have line-through style
      expect(step0.querySelector('.line-through')).toBeInTheDocument();
      expect(step1.querySelector('.line-through')).toBeInTheDocument();
    });

    it('should highlight active step', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={2} totalSteps={5} />);
      const step2 = screen.getByTestId('argument-analysis-skeleton-step-2');
      expect(step2).toHaveAttribute('aria-current', 'step');
    });

    it('should not highlight inactive steps', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={2} totalSteps={5} />);
      const step3 = screen.getByTestId('argument-analysis-skeleton-step-3');
      expect(step3).not.toHaveAttribute('aria-current');
    });

    it('should show step labels', () => {
      render(<ArgumentAnalysisSkeleton showProgress totalSteps={5} />);
      expect(screen.getByText('Detecting fallacies')).toBeInTheDocument();
      expect(screen.getByText('Checking claims')).toBeInTheDocument();
      expect(screen.getByText('Evaluating tone')).toBeInTheDocument();
      expect(screen.getByText('Scoring evidence')).toBeInTheDocument();
      expect(screen.getByText('Generating suggestions')).toBeInTheDocument();
    });

    it('should respect totalSteps prop', () => {
      render(<ArgumentAnalysisSkeleton showProgress totalSteps={3} />);
      expect(screen.getByTestId('argument-analysis-skeleton-step-0')).toBeInTheDocument();
      expect(screen.getByTestId('argument-analysis-skeleton-step-1')).toBeInTheDocument();
      expect(screen.getByTestId('argument-analysis-skeleton-step-2')).toBeInTheDocument();
      expect(screen.queryByTestId('argument-analysis-skeleton-step-3')).not.toBeInTheDocument();
    });
  });

  describe('Results Area Opacity', () => {
    it('should have reduced opacity when showing progress', () => {
      render(<ArgumentAnalysisSkeleton showProgress />);
      const results = screen.getByTestId('argument-analysis-skeleton-results');
      expect(results).toHaveClass('opacity-50');
    });

    it('should have full opacity when not showing progress', () => {
      render(<ArgumentAnalysisSkeleton />);
      const results = screen.getByTestId('argument-analysis-skeleton-results');
      expect(results).not.toHaveClass('opacity-50');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" on container', () => {
      render(<ArgumentAnalysisSkeleton />);
      const skeleton = screen.getByTestId('argument-analysis-skeleton');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    it('should have aria-busy attribute', () => {
      render(<ArgumentAnalysisSkeleton />);
      const skeleton = screen.getByTestId('argument-analysis-skeleton');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-label on container', () => {
      render(<ArgumentAnalysisSkeleton />);
      const skeleton = screen.getByTestId('argument-analysis-skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading argument analysis');
    });

    it('should have accessible progress bar', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={3} totalSteps={5} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAccessibleName(/Analysis progress: 60%/);
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<ArgumentAnalysisSkeleton className="my-custom-class" />);
      const skeleton = screen.getByTestId('argument-analysis-skeleton');
      expect(skeleton).toHaveClass('my-custom-class');
    });

    it('should accept custom data-testid', () => {
      render(<ArgumentAnalysisSkeleton data-testid="custom-skeleton" />);
      const skeleton = screen.getByTestId('custom-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should propagate custom testid to child elements', () => {
      render(<ArgumentAnalysisSkeleton data-testid="custom" showProgress />);
      expect(screen.getByTestId('custom-progress')).toBeInTheDocument();
      expect(screen.getByTestId('custom-results')).toBeInTheDocument();
      expect(screen.getByTestId('custom-fallacies')).toBeInTheDocument();
    });

    it('should have rounded border container', () => {
      render(<ArgumentAnalysisSkeleton />);
      const skeleton = screen.getByTestId('argument-analysis-skeleton');
      expect(skeleton).toHaveClass('rounded-lg', 'border');
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes on container', () => {
      render(<ArgumentAnalysisSkeleton />);
      const skeleton = screen.getByTestId('argument-analysis-skeleton');
      expect(skeleton.className).toMatch(/dark:bg-gray-900/);
      expect(skeleton.className).toMatch(/dark:border-gray-700/);
    });

    it('should have dark mode classes on header', () => {
      render(<ArgumentAnalysisSkeleton />);
      const header = screen.getByText('Argument Analysis');
      expect(header.className).toMatch(/dark:text-white/);
    });

    it('should have dark mode classes on section headers', () => {
      render(<ArgumentAnalysisSkeleton />);
      const sectionHeader = screen.getByText('Fallacies Detected');
      expect(sectionHeader.className).toMatch(/dark:text-gray-300/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero totalSteps gracefully', () => {
      render(<ArgumentAnalysisSkeleton showProgress totalSteps={0} />);
      const progressBar = screen.getByTestId('argument-analysis-skeleton-progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should handle negative completedSteps', () => {
      render(<ArgumentAnalysisSkeleton showProgress completedSteps={-1} totalSteps={5} />);
      // Should default to 0 for remaining calculation
      const timeEstimate = screen.getByTestId('argument-analysis-skeleton-time-estimate');
      // With -1 completed, remaining = 5 - (-1) = 6
      expect(timeEstimate).toHaveTextContent('~6s remaining');
    });

    it('should render without crashing with all props', () => {
      render(
        <ArgumentAnalysisSkeleton
          showProgress
          completedSteps={3}
          totalSteps={5}
          className="test-class"
          data-testid="full-test"
        />,
      );
      expect(screen.getByTestId('full-test')).toBeInTheDocument();
    });
  });
});
