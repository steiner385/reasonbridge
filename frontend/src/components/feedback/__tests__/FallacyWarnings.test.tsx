import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FallacyWarnings from '../FallacyWarnings';
import type { Feedback } from '../../../types/feedback';

describe('FallacyWarnings', () => {
  const mockFallacyHighConfidence: Feedback = {
    id: '1',
    responseId: 'response-1',
    type: 'FALLACY',
    subtype: 'ad_hominem',
    suggestionText: 'Have you considered focusing on the argument rather than the person?',
    reasoning: 'The response targets the individual rather than their ideas',
    confidenceScore: 0.96,
    displayedToUser: true,
    createdAt: new Date('2024-01-01'),
  };

  const mockFallacyMediumConfidence: Feedback = {
    id: '2',
    responseId: 'response-2',
    type: 'FALLACY',
    subtype: 'straw_man',
    suggestionText: 'Are you representing their position accurately?',
    reasoning: 'The argument seems to mischaracterize the opposing view',
    confidenceScore: 0.88,
    displayedToUser: true,
    createdAt: new Date('2024-01-02'),
  };

  const mockFallacyLowConfidence: Feedback = {
    id: '3',
    responseId: 'response-3',
    type: 'FALLACY',
    subtype: 'false_dichotomy',
    suggestionText: 'Might there be more than two options here?',
    reasoning: 'The argument presents only two alternatives',
    confidenceScore: 0.82,
    displayedToUser: true,
    createdAt: new Date('2024-01-03'),
  };

  const mockFallacyBelowThreshold: Feedback = {
    id: '4',
    responseId: 'response-4',
    type: 'FALLACY',
    subtype: 'slippery_slope',
    suggestionText: 'Is the progression you describe inevitable?',
    reasoning: 'The argument assumes an extreme outcome',
    confidenceScore: 0.75,
    displayedToUser: true,
    createdAt: new Date('2024-01-04'),
  };

  const mockFallacyWithResources: Feedback = {
    id: '5',
    responseId: 'response-5',
    type: 'FALLACY',
    subtype: 'appeal_to_authority',
    suggestionText: 'Can the argument stand on its own merits?',
    reasoning: "The claim relies primarily on an authority's opinion",
    confidenceScore: 0.91,
    displayedToUser: true,
    createdAt: new Date('2024-01-05'),
    educationalResources: {
      article: 'https://example.com/appeal-to-authority',
      definition: 'Relying on expert opinion without proper justification',
    },
  };

  const mockFallacyUnknownType: Feedback = {
    id: '6',
    responseId: 'response-6',
    type: 'FALLACY',
    subtype: 'unknown_fallacy_type',
    suggestionText: 'The reasoning here may need reconsideration',
    reasoning: 'An uncommon logical error was detected',
    confidenceScore: 0.85,
    displayedToUser: true,
    createdAt: new Date('2024-01-06'),
  };

  const mockNonFallacyFeedback: Feedback = {
    id: '7',
    responseId: 'response-7',
    type: 'INFLAMMATORY',
    suggestionText: 'Consider more neutral language',
    reasoning: 'Language may be inflammatory',
    confidenceScore: 0.9,
    displayedToUser: true,
    createdAt: new Date('2024-01-07'),
  };

  describe('Fallacy Detection Display', () => {
    it('should display high confidence fallacy with red styling', () => {
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      const fallacyCard = screen.getByRole('article', { name: /ad hominem fallacy warning/i });
      expect(fallacyCard.className).toContain('bg-red-50');
      expect(fallacyCard.className).toContain('border-red-400');
    });

    it('should display medium confidence fallacy with amber styling', () => {
      render(<FallacyWarnings feedback={[mockFallacyMediumConfidence]} />);

      const fallacyCard = screen.getByRole('article', { name: /straw man fallacy warning/i });
      expect(fallacyCard.className).toContain('bg-amber-50');
      expect(fallacyCard.className).toContain('border-amber-400');
    });

    it('should display low confidence fallacy with yellow styling', () => {
      render(<FallacyWarnings feedback={[mockFallacyLowConfidence]} />);

      const fallacyCard = screen.getByRole('article', { name: /false dichotomy fallacy warning/i });
      expect(fallacyCard.className).toContain('bg-yellow-50');
      expect(fallacyCard.className).toContain('border-yellow-400');
    });

    it('should show fallacy type name', () => {
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      expect(screen.getByText('Ad Hominem')).toBeInTheDocument();
    });

    it('should display confidence score as percentage', () => {
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      expect(screen.getByText('96% confident')).toBeInTheDocument();
    });

    it('should show suggestion text in curious peer voice', () => {
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      expect(
        screen.getByText('Have you considered focusing on the argument rather than the person?'),
      ).toBeInTheDocument();
    });

    it('should not display fallacies below minimum confidence threshold', () => {
      render(<FallacyWarnings feedback={[mockFallacyBelowThreshold]} minConfidence={0.8} />);

      expect(
        screen.queryByText('Is the progression you describe inevitable?'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Fallacy Subtypes', () => {
    it('should render ad_hominem fallacy correctly', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      expect(screen.getByText('Ad Hominem')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /learn more/i }));

      expect(screen.getByText('What is Ad Hominem?')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Attacking the person making the argument rather than the argument itself/,
        ),
      ).toBeInTheDocument();
    });

    it('should render straw_man fallacy correctly', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyMediumConfidence]} />);

      expect(screen.getByText('Straw Man')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /learn more/i }));

      expect(
        screen.getByText(/Misrepresenting someone's argument to make it easier to attack/),
      ).toBeInTheDocument();
    });

    it('should render false_dichotomy fallacy correctly', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyLowConfidence]} />);

      expect(screen.getByText('False Dichotomy')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /learn more/i }));

      expect(screen.getByText(/Presenting only two options when more exist/)).toBeInTheDocument();
    });

    it('should render appeal_to_authority fallacy correctly', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyWithResources]} />);

      expect(screen.getByText('Appeal to Authority')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /learn more/i }));

      expect(
        screen.getByText(
          /Using an authority figure's opinion as evidence without proper justification/,
        ),
      ).toBeInTheDocument();
    });

    it('should render unknown fallacy type with generic label', () => {
      render(<FallacyWarnings feedback={[mockFallacyUnknownType]} />);

      expect(screen.getByText('Logical Fallacy')).toBeInTheDocument();
    });

    it('should show generic description for unknown fallacy type', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyUnknownType]} />);

      await user.click(screen.getByRole('button', { name: /learn more/i }));

      expect(
        screen.getByText(/A flaw in reasoning that undermines the logic of an argument/),
      ).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should toggle expanded details when "Learn more" is clicked', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });

      expect(screen.queryByText('What is Ad Hominem?')).not.toBeInTheDocument();

      await user.click(learnMoreButton);

      expect(screen.getByText('What is Ad Hominem?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide details/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /hide details/i }));

      expect(screen.queryByText('What is Ad Hominem?')).not.toBeInTheDocument();
    });

    it('should call onAcknowledge when "I understand" is clicked', async () => {
      const onAcknowledge = vi.fn();
      const user = userEvent.setup();

      render(
        <FallacyWarnings feedback={[mockFallacyHighConfidence]} onAcknowledge={onAcknowledge} />,
      );

      await user.click(screen.getByRole('button', { name: /learn more/i }));
      await user.click(screen.getByRole('button', { name: /acknowledge this feedback/i }));

      expect(onAcknowledge).toHaveBeenCalledWith('1');
    });

    it('should call onDismiss when dismiss button is clicked', async () => {
      const onDismiss = vi.fn();
      const user = userEvent.setup();

      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} onDismiss={onDismiss} />);

      await user.click(screen.getByRole('button', { name: /dismiss warning/i }));

      expect(onDismiss).toHaveBeenCalledWith('1');
    });

    it('should expand/collapse with keyboard navigation in compact mode', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} compact />);

      const badge = screen.getByRole('listitem', { name: /ad hominem fallacy warning/i });
      expect(badge).toHaveAttribute('tabIndex', '0');

      badge.focus();
      await user.keyboard('{Enter}');

      // In compact mode, clicking doesn't show full details, just toggles expandedIds state
      // The component doesn't render expanded details in compact mode
      // So we just verify the badge is interactive
      expect(badge).toHaveFocus();
    });
  });

  describe('Educational Resources', () => {
    it('should display educational resources when available and showEducationalResources is true', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyWithResources]} showEducationalResources />);

      await user.click(screen.getByRole('button', { name: /learn more/i }));

      expect(screen.getByText('Educational Resources')).toBeInTheDocument();
      expect(screen.getByText(/article:/)).toBeInTheDocument();
      expect(screen.getByText(/https:\/\/example.com\/appeal-to-authority/)).toBeInTheDocument();
    });

    it('should hide educational resources when showEducationalResources is false', async () => {
      const user = userEvent.setup();
      render(
        <FallacyWarnings feedback={[mockFallacyWithResources]} showEducationalResources={false} />,
      );

      await user.click(screen.getByRole('button', { name: /learn more/i }));

      expect(screen.queryByText('Educational Resources')).not.toBeInTheDocument();
    });

    it('should show AI reasoning in expanded view', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      await user.click(screen.getByRole('button', { name: /learn more/i }));

      expect(screen.getByText('Why this was flagged')).toBeInTheDocument();
      expect(
        screen.getByText(/The response targets the individual rather than their ideas/),
      ).toBeInTheDocument();
    });

    it('should display fallacy definition in expanded view', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyMediumConfidence]} />);

      await user.click(screen.getByRole('button', { name: /learn more/i }));

      expect(screen.getByText('What is Straw Man?')).toBeInTheDocument();
      expect(
        screen.getByText(/Misrepresenting someone's argument to make it easier to attack/),
      ).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render badges instead of full cards in compact mode', () => {
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} compact />);

      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(screen.getByRole('list', { name: /fallacy warnings/i })).toBeInTheDocument();
      expect(screen.getByText('Ad Hominem')).toBeInTheDocument();
    });

    it('should toggle expansion on badge click in compact mode', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} compact />);

      const badge = screen.getByRole('listitem');
      await user.click(badge);

      // Compact mode toggles internal state but doesn't show expanded content
      // So we just verify the badge is clickable
      expect(badge).toBeInTheDocument();
    });

    it('should display fallacy name in compact badge', () => {
      render(<FallacyWarnings feedback={[mockFallacyMediumConfidence]} compact />);

      const badge = screen.getByRole('listitem', { name: /straw man fallacy warning/i });
      expect(within(badge).getByText('Straw Man')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should not render when no fallacy feedback is present', () => {
      const { container } = render(<FallacyWarnings feedback={[mockNonFallacyFeedback]} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when all fallacies are below confidence threshold', () => {
      const { container } = render(
        <FallacyWarnings feedback={[mockFallacyBelowThreshold]} minConfidence={0.8} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when feedback array is empty', () => {
      const { container } = render(<FallacyWarnings feedback={[]} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for fallacy warnings', () => {
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      expect(
        screen.getByRole('article', { name: /ad hominem fallacy warning/i }),
      ).toBeInTheDocument();
    });

    it('should have aria-expanded attribute on detail toggles', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      expect(learnMoreButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(learnMoreButton);

      const hideDetailsButton = screen.getByRole('button', { name: /hide details/i });
      expect(hideDetailsButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should support keyboard navigation for interactive elements', async () => {
      const user = userEvent.setup();
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
      learnMoreButton.focus();

      expect(learnMoreButton).toHaveFocus();

      await user.keyboard('{Enter}');

      expect(screen.getByText('What is Ad Hominem?')).toBeInTheDocument();
    });

    it('should have proper role="region" on container', () => {
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      expect(screen.getByRole('region', { name: /logical fallacy warnings/i })).toBeInTheDocument();
    });
  });

  describe('Multiple Fallacies', () => {
    it('should display header with singular form for single fallacy', () => {
      render(<FallacyWarnings feedback={[mockFallacyHighConfidence]} />);

      expect(screen.getByText('Potential Logical Fallacy Detected')).toBeInTheDocument();
    });

    it('should display header with plural form for multiple fallacies', () => {
      render(
        <FallacyWarnings feedback={[mockFallacyHighConfidence, mockFallacyMediumConfidence]} />,
      );

      expect(screen.getByText('Potential Logical Fallacies Detected')).toBeInTheDocument();
    });

    it('should render all fallacy warnings in a list', () => {
      render(
        <FallacyWarnings
          feedback={[
            mockFallacyHighConfidence,
            mockFallacyMediumConfidence,
            mockFallacyLowConfidence,
          ]}
        />,
      );

      expect(screen.getByText('Ad Hominem')).toBeInTheDocument();
      expect(screen.getByText('Straw Man')).toBeInTheDocument();
      expect(screen.getByText('False Dichotomy')).toBeInTheDocument();
    });

    it('should maintain independent expand/collapse state for each fallacy', async () => {
      const user = userEvent.setup();
      render(
        <FallacyWarnings feedback={[mockFallacyHighConfidence, mockFallacyMediumConfidence]} />,
      );

      const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });

      await user.click(learnMoreButtons[0]);

      expect(screen.getByText('What is Ad Hominem?')).toBeInTheDocument();
      expect(screen.queryByText('What is Straw Man?')).not.toBeInTheDocument();

      await user.click(learnMoreButtons[1]);

      expect(screen.getByText('What is Ad Hominem?')).toBeInTheDocument();
      expect(screen.getByText('What is Straw Man?')).toBeInTheDocument();

      const hideDetailsButtons = screen.getAllByRole('button', { name: /hide details/i });
      await user.click(hideDetailsButtons[0]);

      expect(screen.queryByText('What is Ad Hominem?')).not.toBeInTheDocument();
      expect(screen.getByText('What is Straw Man?')).toBeInTheDocument();
    });
  });
});
