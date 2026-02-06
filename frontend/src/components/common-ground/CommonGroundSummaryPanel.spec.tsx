import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommonGroundSummaryPanel from './CommonGroundSummaryPanel';
import type { CommonGroundAnalysis } from '../../types/common-ground';

// Mock ShareButton component
vi.mock('./ShareButton', () => ({
  default: () => <button>Share</button>,
}));

describe('CommonGroundSummaryPanel', () => {
  const mockAnalysis: CommonGroundAnalysis = {
    id: 'analysis-1',
    discussionId: 'disc-1',
    agreementZones: [
      {
        id: 'zone-1',
        title: 'Climate Action Urgency',
        description: 'Most participants agree that climate change requires immediate action',
        propositions: [
          {
            id: 'prop-1',
            text: 'Climate change is a serious threat',
            agreementPercentage: 85,
          },
          {
            id: 'prop-2',
            text: 'We need to reduce carbon emissions',
            agreementPercentage: 78,
          },
        ],
        participantCount: 25,
        consensusLevel: 'high',
        relatedResponseIds: ['resp-1', 'resp-2', 'resp-3'],
      },
    ],
    misunderstandings: [
      {
        id: 'mis-1',
        term: 'renewable energy',
        definitions: [
          {
            definition: 'Solar and wind power only',
            participants: ['user-1', 'user-2'],
          },
          {
            definition: 'All non-fossil fuel sources including nuclear',
            participants: ['user-3', 'user-4'],
          },
        ],
        clarificationSuggestion: 'Specify which energy sources are included',
      },
    ],
    disagreements: [
      {
        id: 'dis-1',
        topic: 'Economic vs Environmental Priorities',
        description:
          'Participants differ on whether economic growth or environmental protection should take priority',
        positions: [
          {
            stance: 'Economy first',
            reasoning: 'Economic stability is necessary before addressing environmental issues',
            underlyingValue: 'Economic security',
            underlyingAssumption:
              'Economic growth and environmental protection are mutually exclusive',
            participants: ['user-5', 'user-6'],
          },
          {
            stance: 'Environment first',
            reasoning: 'Environmental degradation will eventually harm the economy',
            underlyingValue: 'Environmental sustainability',
            underlyingAssumption: 'Environmental protection enables long-term economic prosperity',
            participants: ['user-7', 'user-8'],
          },
        ],
        moralFoundations: ['Care/Harm', 'Liberty/Oppression'],
      },
    ],
    lastUpdated: '2024-01-15T10:30:00Z',
    participantCount: 30,
    overallConsensusScore: 65,
  };

  describe('Overall Consensus Display', () => {
    it('should display overall consensus score', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('Overall Consensus')).toBeInTheDocument();
    });

    it('should display consensus score as progress bar', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '65%' });
      expect(progressBar).toHaveAttribute('aria-valuenow', '65');
    });

    it('should display participant count', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('Participants')).toBeInTheDocument();
    });

    it('should display last updated timestamp when showLastUpdated=true', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} showLastUpdated />);

      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    });

    it('should hide last updated timestamp when showLastUpdated=false', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} showLastUpdated={false} />);

      expect(screen.queryByText(/Last updated:/i)).not.toBeInTheDocument();
    });
  });

  describe('View Full Analysis Toggle', () => {
    it('should display "View Full Analysis" button when content exists', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('View Full Analysis')).toBeInTheDocument();
    });

    it('should show summary cards when collapsed', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      // Should show summary cards
      expect(screen.getByText('1')).toBeInTheDocument(); // Agreement Zones count
      expect(screen.getByText('Agreement Zones')).toBeInTheDocument();
      expect(screen.getByText('Misunderstandings')).toBeInTheDocument();
      expect(screen.getByText('Disagreements')).toBeInTheDocument();
    });

    it('should expand to show detailed view when clicked', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      const toggleButton = screen.getByText('View Full Analysis');
      fireEvent.click(toggleButton);

      // Should now show detailed agreement zones
      expect(screen.getByText('Climate Action Urgency')).toBeInTheDocument();
      expect(screen.getByText('Climate change is a serious threat')).toBeInTheDocument();

      // Button text should change
      expect(screen.getByText('Hide Full Analysis')).toBeInTheDocument();
    });

    it('should collapse back when clicked again', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      const toggleButton = screen.getByText('View Full Analysis');

      // Expand
      fireEvent.click(toggleButton);
      expect(screen.getByText('Climate Action Urgency')).toBeInTheDocument();

      // Collapse
      const hideButton = screen.getByText('Hide Full Analysis');
      fireEvent.click(hideButton);

      // Should hide detailed view
      expect(screen.queryByText('Climate Action Urgency')).not.toBeInTheDocument();
      expect(screen.getByText('View Full Analysis')).toBeInTheDocument();
    });
  });

  describe('Agreement Zones', () => {
    beforeEach(() => {
      const { rerender } = render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      // Expand to see details
      fireEvent.click(screen.getByText('View Full Analysis'));
      rerender(<CommonGroundSummaryPanel analysis={mockAnalysis} />);
    });

    it('should display agreement zone title and description', () => {
      expect(screen.getByText('Climate Action Urgency')).toBeInTheDocument();
      expect(
        screen.getByText('Most participants agree that climate change requires immediate action'),
      ).toBeInTheDocument();
    });

    it('should display consensus level badge', () => {
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('should display propositions with agreement percentages', () => {
      expect(screen.getByText('Climate change is a serious threat')).toBeInTheDocument();
      expect(screen.getByText('85% agree')).toBeInTheDocument();

      expect(screen.getByText('We need to reduce carbon emissions')).toBeInTheDocument();
      expect(screen.getByText('78% agree')).toBeInTheDocument();
    });

    it('should display progress bars for each proposition', () => {
      const progressBars = screen.getAllByRole('progressbar');

      // Find proposition progress bars (not the overall consensus one)
      const propProgressBars = progressBars.filter((bar) => {
        const value = bar.getAttribute('aria-valuenow');
        return value === '85' || value === '78';
      });

      expect(propProgressBars).toHaveLength(2);
    });

    it('should make agreement zone clickable when onAgreementZoneClick is provided', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <CommonGroundSummaryPanel analysis={mockAnalysis} onAgreementZoneClick={handleClick} />,
      );

      // Expand first
      fireEvent.click(screen.getByText('View Full Analysis'));

      // Find the agreement zone element
      const zoneElement = screen.getByText('Climate Action Urgency').closest('[role="button"]');

      expect(zoneElement).toBeInTheDocument();
      expect(zoneElement).toHaveClass('cursor-pointer');

      // Click it
      fireEvent.click(zoneElement!);

      expect(handleClick).toHaveBeenCalledWith('zone-1', ['resp-1', 'resp-2', 'resp-3']);
    });

    it('should show related response count when clickable', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} onAgreementZoneClick={vi.fn()} />);

      fireEvent.click(screen.getByText('View Full Analysis'));

      expect(screen.getByText(/Click to view 3 related responses/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation for clickable zones', () => {
      const handleClick = vi.fn();
      render(
        <CommonGroundSummaryPanel analysis={mockAnalysis} onAgreementZoneClick={handleClick} />,
      );

      fireEvent.click(screen.getByText('View Full Analysis'));

      const zoneElement = screen.getByText('Climate Action Urgency').closest('[role="button"]');

      // Press Enter
      fireEvent.keyDown(zoneElement!, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledWith('zone-1', ['resp-1', 'resp-2', 'resp-3']);

      // Press Space
      handleClick.mockClear();
      fireEvent.keyDown(zoneElement!, { key: ' ' });
      expect(handleClick).toHaveBeenCalledWith('zone-1', ['resp-1', 'resp-2', 'resp-3']);
    });
  });

  describe('Misunderstandings', () => {
    beforeEach(() => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);
      fireEvent.click(screen.getByText('View Full Analysis'));
    });

    it('should display misunderstanding term', () => {
      expect(screen.getByText('"renewable energy"')).toBeInTheDocument();
    });

    it('should display TERM CONFUSION badge', () => {
      expect(screen.getByText('TERM CONFUSION')).toBeInTheDocument();
    });

    it('should display different definitions', () => {
      expect(screen.getByText('Solar and wind power only')).toBeInTheDocument();
      expect(screen.getByText('All non-fossil fuel sources including nuclear')).toBeInTheDocument();
    });

    it('should display participant counts for each definition', () => {
      expect(screen.getByText('Used by 2 participant(s)')).toBeInTheDocument();
    });

    it('should display clarification suggestion', () => {
      expect(screen.getByText('Specify which energy sources are included')).toBeInTheDocument();
    });
  });

  describe('Disagreements', () => {
    beforeEach(() => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);
      fireEvent.click(screen.getByText('View Full Analysis'));
    });

    it('should display disagreement topic and description', () => {
      expect(screen.getByText('Economic vs Environmental Priorities')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Participants differ on whether economic growth or environmental protection should take priority',
        ),
      ).toBeInTheDocument();
    });

    it('should display VALUE DIFFERENCE badge', () => {
      expect(screen.getByText('VALUE DIFFERENCE')).toBeInTheDocument();
    });

    it('should display different positions', () => {
      expect(screen.getByText('Economy first')).toBeInTheDocument();
      expect(screen.getByText('Environment first')).toBeInTheDocument();
    });

    it('should display position reasoning', () => {
      expect(
        screen.getByText('Economic stability is necessary before addressing environmental issues'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Environmental degradation will eventually harm the economy'),
      ).toBeInTheDocument();
    });

    it('should display underlying values and assumptions', () => {
      expect(screen.getByText('Economic security')).toBeInTheDocument();
      expect(screen.getByText('Environmental sustainability')).toBeInTheDocument();
    });

    it('should display moral foundations', () => {
      expect(screen.getByText(/Care\/Harm, Liberty\/Oppression/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    const emptyAnalysis: CommonGroundAnalysis = {
      ...mockAnalysis,
      agreementZones: [],
      misunderstandings: [],
      disagreements: [],
    };

    it('should display empty state when no content and showEmptyState=true', () => {
      render(<CommonGroundSummaryPanel analysis={emptyAnalysis} showEmptyState />);

      expect(screen.getByText('No Analysis Available')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Common ground analysis will appear here once the discussion has enough participants/i,
        ),
      ).toBeInTheDocument();
    });

    it('should not render when no content and showEmptyState=false', () => {
      const { container } = render(
        <CommonGroundSummaryPanel analysis={emptyAnalysis} showEmptyState={false} />,
      );

      expect(
        container.querySelector('[data-testid="common-ground-summary"]'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Styling and Accessibility', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CommonGroundSummaryPanel analysis={mockAnalysis} className="custom-class" />,
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for agreement zones', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);
      fireEvent.click(screen.getByText('View Full Analysis'));

      expect(screen.getByLabelText('Agreement zone: Climate Action Urgency')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for misunderstandings', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);
      fireEvent.click(screen.getByText('View Full Analysis'));

      expect(
        screen.getByLabelText('Misunderstanding about term: renewable energy'),
      ).toBeInTheDocument();
    });

    it('should have proper ARIA labels for disagreements', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);
      fireEvent.click(screen.getByText('View Full Analysis'));

      expect(
        screen.getByLabelText('Disagreement about: Economic vs Environmental Priorities'),
      ).toBeInTheDocument();
    });
  });
});
