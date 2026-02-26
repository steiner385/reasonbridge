/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for FramingSuggestionsDisplay component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FramingSuggestionsDisplay,
  type FramingSuggestionsDisplayProps,
} from '../FramingSuggestionsDisplay';
import type { FramingSuggestionsResponse, FramingSuggestion } from '../../../lib/framing-api';

const createMockSuggestion = (overrides: Partial<FramingSuggestion> = {}): FramingSuggestion => ({
  issueType: 'LOADED_LANGUAGE',
  originalText: 'Obviously, everyone knows',
  suggestedText: 'Research suggests',
  explanation: 'Removes assumptive language for more neutral framing',
  confidenceScore: 0.85,
  ...overrides,
});

const createMockResponse = (
  overrides: Partial<FramingSuggestionsResponse> = {},
): FramingSuggestionsResponse => ({
  originalTitle: 'Why everyone should support X',
  suggestedTitle: null,
  suggestions: [],
  neutralityScore: 0.8,
  clarityScore: 0.9,
  inclusivityScore: 0.85,
  confidenceScore: 0.8,
  reasoning: 'The topic is well-framed overall.',
  attribution: 'AI Assistant',
  analysisTimeMs: 150,
  ...overrides,
});

const defaultProps: FramingSuggestionsDisplayProps = {
  suggestions: createMockResponse(),
};

describe('FramingSuggestionsDisplay', () => {
  describe('Rendering', () => {
    it('should render with quality scores', () => {
      render(<FramingSuggestionsDisplay {...defaultProps} />);

      expect(screen.getByText('Framing Quality')).toBeInTheDocument();
      expect(screen.getByText('Neutrality')).toBeInTheDocument();
      expect(screen.getByText('Clarity')).toBeInTheDocument();
      expect(screen.getByText('Inclusivity')).toBeInTheDocument();
    });

    it('should display score percentages', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            neutralityScore: 0.8,
            clarityScore: 0.9,
            inclusivityScore: 0.85,
          })}
        />,
      );

      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should hide scores when showScores is false', () => {
      render(<FramingSuggestionsDisplay {...defaultProps} showScores={false} />);

      expect(screen.queryByText('Framing Quality')).not.toBeInTheDocument();
      expect(screen.queryByText('Neutrality')).not.toBeInTheDocument();
    });

    it('should render null when suggestions is null', () => {
      const { container } = render(<FramingSuggestionsDisplay suggestions={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should apply custom className', () => {
      render(<FramingSuggestionsDisplay {...defaultProps} className="custom-class" />);
      expect(screen.getByRole('region')).toHaveClass('custom-class');
    });
  });

  describe('Loading State', () => {
    it('should display loading state', () => {
      render(<FramingSuggestionsDisplay suggestions={null} isLoading={true} />);
      expect(screen.getByText('Analyzing Topic Framing')).toBeInTheDocument();
    });

    it('should display compact loading state', () => {
      render(<FramingSuggestionsDisplay suggestions={null} isLoading={true} compact={true} />);
      expect(screen.getByText('Analyzing framing...')).toBeInTheDocument();
    });

    it('should have status role when loading', () => {
      render(<FramingSuggestionsDisplay suggestions={null} isLoading={true} />);
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<FramingSuggestionsDisplay suggestions={null} error="Analysis failed" />);
      expect(screen.getByText('Analysis failed')).toBeInTheDocument();
    });

    it('should have alert role for errors', () => {
      render(<FramingSuggestionsDisplay suggestions={null} error="Error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Suggested Title', () => {
    it('should display suggested title section', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            originalTitle: 'Bad title',
            suggestedTitle: 'Better title',
          })}
        />,
      );

      expect(screen.getByText('Suggested Title Improvement')).toBeInTheDocument();
      expect(screen.getByText('Bad title')).toBeInTheDocument();
      expect(screen.getByText('Better title')).toBeInTheDocument();
    });

    it('should not display title section when no suggested title', () => {
      render(
        <FramingSuggestionsDisplay suggestions={createMockResponse({ suggestedTitle: null })} />,
      );

      expect(screen.queryByText('Suggested Title Improvement')).not.toBeInTheDocument();
    });

    it('should show apply button when showActions and onAcceptTitle provided', () => {
      const onAcceptTitle = vi.fn();
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestedTitle: 'Better title',
          })}
          showActions={true}
          onAcceptTitle={onAcceptTitle}
        />,
      );

      expect(screen.getByText('Apply Suggestion')).toBeInTheDocument();
    });

    it('should call onAcceptTitle when apply button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onAcceptTitle = vi.fn();
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestedTitle: 'Better title',
          })}
          showActions={true}
          onAcceptTitle={onAcceptTitle}
        />,
      );

      await user.click(screen.getByText('Apply Suggestion'));
      expect(onAcceptTitle).toHaveBeenCalledWith('Better title');
    });

    it('should show applied state after accepting title', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestedTitle: 'Better title',
          })}
          showActions={true}
          onAcceptTitle={vi.fn()}
        />,
      );

      await user.click(screen.getByText('Apply Suggestion'));
      expect(screen.getByText('Title suggestion applied')).toBeInTheDocument();
    });
  });

  describe('Individual Suggestions', () => {
    it('should display suggestions list', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [
              createMockSuggestion({ originalText: 'First issue' }),
              createMockSuggestion({ originalText: 'Second issue' }),
            ],
          })}
        />,
      );

      expect(screen.getByText('Suggestions (2)')).toBeInTheDocument();
      expect(screen.getByText(/First issue/)).toBeInTheDocument();
      expect(screen.getByText(/Second issue/)).toBeInTheDocument();
    });

    it('should display issue type badge', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion({ issueType: 'LOADED_LANGUAGE' })],
          })}
        />,
      );

      expect(screen.getByText('Loaded Language')).toBeInTheDocument();
    });

    it('should display confidence score', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion({ confidenceScore: 0.85 })],
          })}
        />,
      );

      expect(screen.getByText('85% confidence')).toBeInTheDocument();
    });

    it('should display original and suggested text', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [
              createMockSuggestion({
                originalText: 'bad phrase',
                suggestedText: 'good phrase',
              }),
            ],
          })}
        />,
      );

      expect(screen.getByText(/bad phrase/)).toBeInTheDocument();
      expect(screen.getByText(/good phrase/)).toBeInTheDocument();
    });

    it('should display explanation', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [
              createMockSuggestion({
                explanation: 'This improves neutrality',
              }),
            ],
          })}
        />,
      );

      expect(screen.getByText('This improves neutrality')).toBeInTheDocument();
    });
  });

  describe('Suggestion Actions', () => {
    it('should show accept/dismiss buttons when showActions is true', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion()],
          })}
          showActions={true}
          onAcceptSuggestion={vi.fn()}
          onDismissSuggestion={vi.fn()}
        />,
      );

      expect(screen.getByLabelText('Accept suggestion')).toBeInTheDocument();
      expect(screen.getByLabelText('Dismiss suggestion')).toBeInTheDocument();
    });

    it('should not show action buttons when showActions is false', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion()],
          })}
          showActions={false}
        />,
      );

      expect(screen.queryByLabelText('Accept suggestion')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Dismiss suggestion')).not.toBeInTheDocument();
    });

    it('should call onAcceptSuggestion when accept button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onAcceptSuggestion = vi.fn();
      const suggestion = createMockSuggestion();

      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({ suggestions: [suggestion] })}
          showActions={true}
          onAcceptSuggestion={onAcceptSuggestion}
        />,
      );

      await user.click(screen.getByLabelText('Accept suggestion'));
      expect(onAcceptSuggestion).toHaveBeenCalledWith(suggestion);
    });

    it('should call onDismissSuggestion when dismiss button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onDismissSuggestion = vi.fn();
      const suggestion = createMockSuggestion();

      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({ suggestions: [suggestion] })}
          showActions={true}
          onDismissSuggestion={onDismissSuggestion}
        />,
      );

      await user.click(screen.getByLabelText('Dismiss suggestion'));
      expect(onDismissSuggestion).toHaveBeenCalledWith(suggestion);
    });

    it('should show applied state after accepting suggestion', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion()],
          })}
          showActions={true}
          onAcceptSuggestion={vi.fn()}
        />,
      );

      await user.click(screen.getByLabelText('Accept suggestion'));
      expect(screen.getByText('Suggestion applied')).toBeInTheDocument();
    });

    it('should remove suggestion after dismissing', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion({ originalText: 'dismissable text' })],
          })}
          showActions={true}
          onDismissSuggestion={vi.fn()}
        />,
      );

      await user.click(screen.getByLabelText('Dismiss suggestion'));
      expect(screen.queryByText(/dismissable text/)).not.toBeInTheDocument();
    });
  });

  describe('All Good State', () => {
    it('should show all good state when scores are high and no suggestions', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [],
            suggestedTitle: null,
            neutralityScore: 0.9,
            clarityScore: 0.85,
            inclusivityScore: 0.9,
          })}
        />,
      );

      expect(screen.getByText('Great framing!')).toBeInTheDocument();
    });

    it('should not show all good state when there are suggestions', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion()],
            neutralityScore: 0.9,
            clarityScore: 0.9,
            inclusivityScore: 0.9,
          })}
        />,
      );

      expect(screen.queryByText('Great framing!')).not.toBeInTheDocument();
    });

    it('should not show all good state when scores are low', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [],
            suggestedTitle: null,
            neutralityScore: 0.5,
            clarityScore: 0.5,
            inclusivityScore: 0.5,
          })}
        />,
      );

      expect(screen.queryByText('Great framing!')).not.toBeInTheDocument();
    });
  });

  describe('Reasoning Footer', () => {
    it('should display reasoning when suggestions present', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion()],
            reasoning: 'Analysis reasoning here',
            attribution: 'AI Assistant',
          })}
        />,
      );

      expect(screen.getByText('Analysis reasoning here')).toBeInTheDocument();
      expect(screen.getByText('— AI Assistant')).toBeInTheDocument();
    });

    it('should not display reasoning when no suggestions', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [],
            suggestedTitle: null,
            reasoning: 'Should not show',
          })}
        />,
      );

      expect(screen.queryByText('Should not show')).not.toBeInTheDocument();
    });
  });

  describe('Issue Types', () => {
    it.each([
      ['LOADED_LANGUAGE', 'Loaded Language'],
      ['ONE_SIDED', 'One-Sided'],
      ['UNCLEAR', 'Unclear'],
      ['POLARIZING', 'Polarizing'],
      ['IMPROVEMENT', 'Suggestion'],
    ] as const)('should display %s as %s', (issueType, expectedLabel) => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion({ issueType })],
          })}
        />,
      );

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have region role', () => {
      render(<FramingSuggestionsDisplay {...defaultProps} />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      render(<FramingSuggestionsDisplay {...defaultProps} />);
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Framing suggestions');
    });

    it('should have accessible button labels', () => {
      render(
        <FramingSuggestionsDisplay
          suggestions={createMockResponse({
            suggestions: [createMockSuggestion()],
          })}
          showActions={true}
          onAcceptSuggestion={vi.fn()}
          onDismissSuggestion={vi.fn()}
        />,
      );

      expect(screen.getByLabelText('Accept suggestion')).toBeInTheDocument();
      expect(screen.getByLabelText('Dismiss suggestion')).toBeInTheDocument();
    });
  });
});
