/**
 * Unit tests for CommonGroundDetailModal component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommonGroundDetailModal from '../CommonGroundDetailModal';
import type { AgreementZone, Misunderstanding, Disagreement } from '../../../types/common-ground';

// Test fixtures
const mockAgreementZone: AgreementZone = {
  id: 'zone-1',
  title: 'Climate Action Agreement',
  description: 'Participants agree on the need for climate action',
  consensusLevel: 'high',
  participantCount: 15,
  propositions: [
    {
      id: 'prop-1',
      text: 'We should reduce carbon emissions',
      agreementPercentage: 85,
      supportingParticipants: ['user-1', 'user-2', 'user-3'],
      opposingParticipants: ['user-4'],
      neutralParticipants: ['user-5'],
    },
    {
      id: 'prop-2',
      text: 'Renewable energy should be prioritized',
      agreementPercentage: 72,
      supportingParticipants: ['user-1', 'user-2'],
      opposingParticipants: ['user-3'],
      neutralParticipants: ['user-4', 'user-5'],
    },
  ],
};

const mockMisunderstanding: Misunderstanding = {
  id: 'misund-1',
  term: 'sustainability',
  definitions: [
    {
      definition: 'Environmental protection and conservation',
      participants: ['user-1', 'user-2'],
    },
    {
      definition: 'Long-term economic viability',
      participants: ['user-3', 'user-4', 'user-5'],
    },
  ],
  clarificationSuggestion:
    'Consider distinguishing between environmental sustainability and economic sustainability in the discussion.',
};

const mockDisagreement: Disagreement = {
  id: 'disagree-1',
  topic: 'Nuclear Energy',
  description: 'Participants disagree on whether nuclear energy should be part of the solution',
  positions: [
    {
      stance: 'Pro-Nuclear',
      reasoning: 'Nuclear provides reliable baseload power with zero carbon emissions',
      participants: ['user-1', 'user-2'],
      underlyingValue: 'Pragmatism and efficiency',
      underlyingAssumption: 'Modern nuclear is safe',
    },
    {
      stance: 'Anti-Nuclear',
      reasoning: 'Nuclear waste remains dangerous for thousands of years',
      participants: ['user-3', 'user-4', 'user-5'],
      underlyingValue: 'Long-term safety',
      underlyingAssumption: 'Renewables can scale fast enough',
    },
  ],
  moralFoundations: ['care-harm', 'fairness-cheating', 'liberty-oppression'],
};

describe('CommonGroundDetailModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    detail: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should return null when detail is null', () => {
      const { container } = render(<CommonGroundDetailModal {...defaultProps} detail={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when isOpen is false', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          isOpen={false}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true and detail is provided', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          onClose={onClose}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      await userEvent.click(screen.getByTestId('close-modal'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Agreement Zone Detail', () => {
    it('should render agreement zone with correct title', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      expect(screen.getByText('Climate Action Agreement')).toBeInTheDocument();
    });

    it('should display consensus level badge', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      const badge = screen.getByTestId('consensus-level');
      expect(badge).toHaveTextContent('HIGH CONSENSUS');
    });

    it('should display participant count', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      const count = screen.getByTestId('participant-count');
      expect(count).toHaveTextContent('15 participants');
    });

    it('should display description', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      expect(
        screen.getByText('Participants agree on the need for climate action'),
      ).toBeInTheDocument();
    });

    it('should display all propositions', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      const propositions = screen.getAllByTestId('proposition-item');
      expect(propositions).toHaveLength(2);
    });

    it('should display proposition text and agreement percentage', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      expect(screen.getByText('We should reduce carbon emissions')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should display participant breakdown for propositions', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      // Each proposition shows supporting/opposing/neutral counts
      const supportingLabels = screen.getAllByText('supporting');
      expect(supportingLabels).toHaveLength(2); // One per proposition

      const opposingLabels = screen.getAllByText('opposing');
      expect(opposingLabels).toHaveLength(2);

      const neutralLabels = screen.getAllByText('neutral');
      expect(neutralLabels).toHaveLength(2);
    });

    it('should render progress bar with correct percentage', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '85');
      expect(progressBars[0]).toHaveAttribute('aria-valuemin', '0');
      expect(progressBars[0]).toHaveAttribute('aria-valuemax', '100');
    });

    it('should apply correct styles for each consensus level', () => {
      // Test medium consensus
      const mediumZone = { ...mockAgreementZone, consensusLevel: 'medium' as const };
      const { rerender } = render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mediumZone }}
        />,
      );

      expect(screen.getByTestId('consensus-level')).toHaveTextContent('MEDIUM CONSENSUS');

      // Test low consensus
      const lowZone = { ...mockAgreementZone, consensusLevel: 'low' as const };
      rerender(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: lowZone }}
        />,
      );

      expect(screen.getByTestId('consensus-level')).toHaveTextContent('LOW CONSENSUS');
    });

    it('should handle empty propositions array', () => {
      const zoneWithNoProps = { ...mockAgreementZone, propositions: [] };
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: zoneWithNoProps }}
        />,
      );

      expect(screen.queryByTestId('proposition-item')).not.toBeInTheDocument();
      expect(screen.queryByText(/Shared Propositions/)).not.toBeInTheDocument();
    });
  });

  describe('Misunderstanding Detail', () => {
    it('should render misunderstanding with term in title', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'misunderstanding', data: mockMisunderstanding }}
        />,
      );

      expect(screen.getByText('Term: "sustainability"')).toBeInTheDocument();
    });

    it('should display term confusion badge', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'misunderstanding', data: mockMisunderstanding }}
        />,
      );

      expect(screen.getByText('TERM CONFUSION')).toBeInTheDocument();
    });

    it('should display explanation text with term highlighted', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'misunderstanding', data: mockMisunderstanding }}
        />,
      );

      expect(screen.getByText('"sustainability"')).toBeInTheDocument();
    });

    it('should display all definitions', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'misunderstanding', data: mockMisunderstanding }}
        />,
      );

      const definitions = screen.getAllByTestId('definition-item');
      expect(definitions).toHaveLength(2);
    });

    it('should display definition text and participant count', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'misunderstanding', data: mockMisunderstanding }}
        />,
      );

      expect(screen.getByText('"Environmental protection and conservation"')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display clarification suggestion when provided', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'misunderstanding', data: mockMisunderstanding }}
        />,
      );

      const suggestion = screen.getByTestId('clarification-suggestion');
      expect(suggestion).toBeInTheDocument();
      expect(
        within(suggestion).getByText(
          'Consider distinguishing between environmental sustainability and economic sustainability in the discussion.',
        ),
      ).toBeInTheDocument();
    });

    it('should not display clarification suggestion when not provided', () => {
      const misundWithoutSuggestion = {
        ...mockMisunderstanding,
        clarificationSuggestion: undefined,
      };
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'misunderstanding', data: misundWithoutSuggestion }}
        />,
      );

      expect(screen.queryByTestId('clarification-suggestion')).not.toBeInTheDocument();
    });
  });

  describe('Disagreement Detail', () => {
    it('should render disagreement with topic as title', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      expect(screen.getByText('Nuclear Energy')).toBeInTheDocument();
    });

    it('should display value difference badge', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      expect(screen.getByText('VALUE DIFFERENCE')).toBeInTheDocument();
    });

    it('should display description', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      expect(
        screen.getByText(
          'Participants disagree on whether nuclear energy should be part of the solution',
        ),
      ).toBeInTheDocument();
    });

    it('should display all positions', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      const positions = screen.getAllByTestId('position-item');
      expect(positions).toHaveLength(2);
    });

    it('should display position stance and participant count', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      expect(screen.getByText('Pro-Nuclear')).toBeInTheDocument();
      expect(screen.getByText('Anti-Nuclear')).toBeInTheDocument();
      expect(screen.getByText('2 participant(s)')).toBeInTheDocument();
      expect(screen.getByText('3 participant(s)')).toBeInTheDocument();
    });

    it('should display reasoning for each position', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      expect(
        screen.getByText('Nuclear provides reliable baseload power with zero carbon emissions'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Nuclear waste remains dangerous for thousands of years'),
      ).toBeInTheDocument();
    });

    it('should display underlying values and assumptions', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      expect(screen.getByText('Pragmatism and efficiency')).toBeInTheDocument();
      expect(screen.getByText('Modern nuclear is safe')).toBeInTheDocument();
      expect(screen.getByText('Long-term safety')).toBeInTheDocument();
      expect(screen.getByText('Renewables can scale fast enough')).toBeInTheDocument();
    });

    it('should display moral foundations when provided', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      const moralFoundations = screen.getByTestId('moral-foundations');
      expect(moralFoundations).toBeInTheDocument();
      expect(within(moralFoundations).getByText('care-harm')).toBeInTheDocument();
      expect(within(moralFoundations).getByText('fairness-cheating')).toBeInTheDocument();
      expect(within(moralFoundations).getByText('liberty-oppression')).toBeInTheDocument();
    });

    it('should not display moral foundations when not provided', () => {
      const disagreementWithoutFoundations = { ...mockDisagreement, moralFoundations: undefined };
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: disagreementWithoutFoundations }}
        />,
      );

      expect(screen.queryByTestId('moral-foundations')).not.toBeInTheDocument();
    });

    it('should not display moral foundations when array is empty', () => {
      const disagreementWithEmptyFoundations = { ...mockDisagreement, moralFoundations: [] };
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: disagreementWithEmptyFoundations }}
        />,
      );

      expect(screen.queryByTestId('moral-foundations')).not.toBeInTheDocument();
    });

    it('should handle positions without underlying values/assumptions', () => {
      const simpleDisagreement: Disagreement = {
        ...mockDisagreement,
        positions: [
          {
            stance: 'Simple Position',
            reasoning: 'Just a basic reason',
            participants: ['user-1'],
          },
        ],
      };

      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: simpleDisagreement }}
        />,
      );

      expect(screen.getByText('Simple Position')).toBeInTheDocument();
      expect(screen.queryByText('Core Value')).not.toBeInTheDocument();
      expect(screen.queryByText('Assumption')).not.toBeInTheDocument();
    });
  });

  describe('Modal Title', () => {
    it('should use agreement zone title for agreement zones', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      expect(screen.getByText('Climate Action Agreement')).toBeInTheDocument();
    });

    it('should format term for misunderstandings', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'misunderstanding', data: mockMisunderstanding }}
        />,
      );

      expect(screen.getByText('Term: "sustainability"')).toBeInTheDocument();
    });

    it('should use topic for disagreements', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      expect(screen.getByText('Nuclear Energy')).toBeInTheDocument();
    });
  });

  describe('Data TestIds', () => {
    it('should have agreement-zone-detail testid for agreement zones', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'agreementZone', data: mockAgreementZone }}
        />,
      );

      expect(screen.getByTestId('agreement-zone-detail')).toBeInTheDocument();
    });

    it('should have misunderstanding-detail testid for misunderstandings', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'misunderstanding', data: mockMisunderstanding }}
        />,
      );

      expect(screen.getByTestId('misunderstanding-detail')).toBeInTheDocument();
    });

    it('should have disagreement-detail testid for disagreements', () => {
      render(
        <CommonGroundDetailModal
          {...defaultProps}
          detail={{ type: 'disagreement', data: mockDisagreement }}
        />,
      );

      expect(screen.getByTestId('disagreement-detail')).toBeInTheDocument();
    });
  });
});
