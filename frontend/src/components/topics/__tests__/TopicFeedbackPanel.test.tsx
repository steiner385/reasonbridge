/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for TopicFeedbackPanel component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopicFeedbackPanel, type TopicFeedbackPanelProps } from '../TopicFeedbackPanel';
import type { TopicFeedbackInsights } from '../../../hooks/useTopicFeedback';
import type { PreviewFeedbackItem } from '../../../lib/feedback-api';

const createMockInsights = (
  overrides: Partial<TopicFeedbackInsights> = {},
): TopicFeedbackInsights => ({
  titleClarity: 'good',
  descriptionQuality: 'good',
  propositionBalance: 'balanced',
  overallQuality: 'good',
  suggestions: [],
  ...overrides,
});

const createMockFeedback = (overrides: Partial<PreviewFeedbackItem> = {}): PreviewFeedbackItem => ({
  type: 'BIAS',
  subtype: 'confirmation_bias',
  suggestionText: 'Consider adding opposing viewpoints',
  reasoning: 'The content appears to favor one perspective',
  confidenceScore: 0.85,
  shouldDisplay: true,
  ...overrides,
});

const defaultProps: TopicFeedbackPanelProps = {
  feedback: [],
  insights: createMockInsights(),
};

describe('TopicFeedbackPanel', () => {
  describe('Rendering', () => {
    it('should render with title', () => {
      render(<TopicFeedbackPanel {...defaultProps} />);
      expect(screen.getByText('Topic Review')).toBeInTheDocument();
    });

    it('should render AI-powered badge', () => {
      render(<TopicFeedbackPanel {...defaultProps} />);
      expect(screen.getByText(/AI-Powered/)).toBeInTheDocument();
    });

    it('should not render when no insights and showEmpty is false', () => {
      const { container } = render(
        <TopicFeedbackPanel
          feedback={[]}
          insights={createMockInsights({
            titleClarity: 'unknown',
            descriptionQuality: 'unknown',
            propositionBalance: 'unknown',
          })}
          showEmpty={false}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render empty state when showEmpty is true', () => {
      render(
        <TopicFeedbackPanel
          feedback={[]}
          insights={createMockInsights({
            titleClarity: 'unknown',
            descriptionQuality: 'unknown',
            propositionBalance: 'unknown',
          })}
          showEmpty={true}
        />,
      );
      expect(screen.getByText(/Start filling in your topic details/)).toBeInTheDocument();
    });
  });

  describe('Ready Indicator', () => {
    it('should show ready indicator when readyToCreate is true', () => {
      render(<TopicFeedbackPanel {...defaultProps} readyToCreate={true} />);
      expect(screen.getByText('Ready to create')).toBeInTheDocument();
    });

    it('should show needs attention indicator when readyToCreate is false', () => {
      render(<TopicFeedbackPanel {...defaultProps} readyToCreate={false} />);
      expect(screen.getByText('Needs attention')).toBeInTheDocument();
    });

    it('should show analyzing indicator when loading', () => {
      render(<TopicFeedbackPanel {...defaultProps} isLoading={true} />);
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });
  });

  describe('Structure Analysis', () => {
    it('should display title clarity badge', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          insights={createMockInsights({ titleClarity: 'good' })}
        />,
      );
      expect(screen.getByText('Title: good')).toBeInTheDocument();
    });

    it('should display description quality badge', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          insights={createMockInsights({ descriptionQuality: 'needs-improvement' })}
        />,
      );
      expect(screen.getByText('Description: needs-improvement')).toBeInTheDocument();
    });

    it('should display proposition balance badge', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          insights={createMockInsights({ propositionBalance: 'balanced' })}
        />,
      );
      expect(screen.getByText('Propositions: balanced')).toBeInTheDocument();
    });

    it('should not display unknown badges', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          insights={createMockInsights({
            titleClarity: 'unknown',
            descriptionQuality: 'good',
            propositionBalance: 'balanced',
          })}
        />,
      );
      expect(screen.queryByText(/Title:/)).not.toBeInTheDocument();
      expect(screen.getByText('Description: good')).toBeInTheDocument();
    });
  });

  describe('Suggestions', () => {
    it('should display suggestions when present', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          insights={createMockInsights({
            suggestions: ['Add an antithesis', 'Expand description'],
          })}
        />,
      );
      expect(screen.getByText('Add an antithesis')).toBeInTheDocument();
      expect(screen.getByText('Expand description')).toBeInTheDocument();
    });

    it('should display suggestions section header', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          insights={createMockInsights({
            suggestions: ['Test suggestion'],
          })}
        />,
      );
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
    });
  });

  describe('AI Feedback Items', () => {
    it('should display feedback items', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          feedback={[createMockFeedback({ suggestionText: 'Consider neutral language' })]}
        />,
      );
      expect(screen.getByText('Consider neutral language')).toBeInTheDocument();
    });

    it('should display AI Analysis section header', () => {
      render(<TopicFeedbackPanel {...defaultProps} feedback={[createMockFeedback()]} />);
      expect(screen.getByText('AI Analysis')).toBeInTheDocument();
    });

    it('should display multiple feedback items', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          feedback={[
            createMockFeedback({ type: 'BIAS', suggestionText: 'First suggestion' }),
            createMockFeedback({ type: 'FALLACY', suggestionText: 'Second suggestion' }),
          ]}
        />,
      );
      expect(screen.getByText('First suggestion')).toBeInTheDocument();
      expect(screen.getByText('Second suggestion')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading banner when isLoading', () => {
      render(<TopicFeedbackPanel {...defaultProps} isLoading={true} />);
      expect(screen.getByText('Analyzing Your Topic')).toBeInTheDocument();
    });

    it('should display loading message', () => {
      render(<TopicFeedbackPanel {...defaultProps} isLoading={true} />);
      expect(screen.getByText(/Checking for clarity, balance/)).toBeInTheDocument();
    });

    it('should have aria-busy attribute when loading', () => {
      render(<TopicFeedbackPanel {...defaultProps} isLoading={true} />);
      expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<TopicFeedbackPanel {...defaultProps} error="Failed to analyze topic" />);
      expect(screen.getByText('Failed to analyze topic')).toBeInTheDocument();
    });
  });

  describe('Summary', () => {
    it('should display summary message', () => {
      render(<TopicFeedbackPanel {...defaultProps} summary="Minor improvements suggested" />);
      expect(screen.getByText('Minor improvements suggested')).toBeInTheDocument();
    });

    it('should not display summary when error exists', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          summary="This should not show"
          error="Error message"
        />,
      );
      expect(screen.queryByText('This should not show')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Sensitivity Selector', () => {
    it('should render sensitivity selector when callback provided', () => {
      const onSensitivityChange = vi.fn();
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          sensitivity="MEDIUM"
          onSensitivityChange={onSensitivityChange}
        />,
      );
      expect(screen.getByLabelText(/sensitivity/i)).toBeInTheDocument();
    });

    it('should not render sensitivity selector when no callback', () => {
      render(<TopicFeedbackPanel {...defaultProps} sensitivity="MEDIUM" />);
      expect(screen.queryByLabelText(/sensitivity/i)).not.toBeInTheDocument();
    });

    it('should call onSensitivityChange when changed', async () => {
      const user = userEvent.setup();
      const onSensitivityChange = vi.fn();
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          sensitivity="MEDIUM"
          onSensitivityChange={onSensitivityChange}
        />,
      );

      const selector = screen.getByLabelText(/sensitivity/i);
      await user.selectOptions(selector, 'HIGH');
      expect(onSensitivityChange).toHaveBeenCalledWith('HIGH');
    });

    it('should disable sensitivity selector when loading', () => {
      const onSensitivityChange = vi.fn();
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          isLoading={true}
          onSensitivityChange={onSensitivityChange}
        />,
      );
      expect(screen.getByLabelText(/sensitivity/i)).toBeDisabled();
    });
  });

  describe('All Good State', () => {
    it('should show all good message when ready and no issues', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          readyToCreate={true}
          feedback={[]}
          insights={createMockInsights({ suggestions: [] })}
        />,
      );
      expect(screen.getByText('Your topic looks great!')).toBeInTheDocument();
    });

    it('should not show all good message when not ready', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          readyToCreate={false}
          feedback={[]}
          insights={createMockInsights({ suggestions: [] })}
        />,
      );
      expect(screen.queryByText('Your topic looks great!')).not.toBeInTheDocument();
    });

    it('should not show all good message when loading', () => {
      render(
        <TopicFeedbackPanel
          {...defaultProps}
          isLoading={true}
          readyToCreate={true}
          feedback={[]}
          insights={createMockInsights({ suggestions: [] })}
        />,
      );
      expect(screen.queryByText('Your topic looks great!')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have region role', () => {
      render(<TopicFeedbackPanel {...defaultProps} />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      render(<TopicFeedbackPanel {...defaultProps} />);
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Topic feedback');
    });

    it('should have aria-live for dynamic updates', () => {
      render(<TopicFeedbackPanel {...defaultProps} />);
      expect(screen.getByRole('region')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<TopicFeedbackPanel {...defaultProps} className="custom-class" />);
      expect(screen.getByRole('region')).toHaveClass('custom-class');
    });
  });
});
