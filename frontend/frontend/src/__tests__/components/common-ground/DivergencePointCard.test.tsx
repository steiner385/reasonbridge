import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DivergencePointCard from '../../../components/common-ground/DivergencePointCard';
import type { DivergencePoint } from '../../../types/common-ground';

describe('DivergencePointCard', () => {
  const mockOnClick = jest.fn();

  const baseDivergencePoint: DivergencePoint = {
    proposition: 'Government should regulate social media content',
    propositionId: 'prop-1',
    viewpoints: [
      {
        position: 'Strong regulation needed to prevent misinformation',
        participantCount: 15,
        percentage: 60,
        reasoning: [
          'False information spreads rapidly',
          'Public safety concerns',
        ],
      },
      {
        position: 'Minimal regulation to preserve free speech',
        participantCount: 10,
        percentage: 40,
        reasoning: [
          'First Amendment protections',
          'Slippery slope to censorship',
        ],
      },
    ],
    polarizationScore: 0.75,
    totalParticipants: 25,
    underlyingValues: ['Safety', 'Freedom', 'Trust in government'],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render proposition text', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      expect(screen.getByText(baseDivergencePoint.proposition)).toBeInTheDocument();
    });

    it('should render divergence badge', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      expect(screen.getByText('DIVERGENCE')).toBeInTheDocument();
    });

    it('should render polarization score badge', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should hide polarization score when showPolarizationScore is false', () => {
      render(
        <DivergencePointCard
          divergencePoint={baseDivergencePoint}
          showPolarizationScore={false}
        />,
      );
      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });

    it('should render progress bar with correct width', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('should render all viewpoints', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      expect(
        screen.getByText('Strong regulation needed to prevent misinformation'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Minimal regulation to preserve free speech'),
      ).toBeInTheDocument();
    });

    it('should render viewpoint percentages and participant counts', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('15 people')).toBeInTheDocument();
      expect(screen.getByText('10 people')).toBeInTheDocument();
    });

    it('should render singular "person" for count of 1', () => {
      const singlePersonPoint: DivergencePoint = {
        ...baseDivergencePoint,
        viewpoints: [
          {
            position: 'Single viewpoint',
            participantCount: 1,
            percentage: 100,
            reasoning: [],
          },
        ],
      };
      render(<DivergencePointCard divergencePoint={singlePersonPoint} />);
      expect(screen.getByText('1 person')).toBeInTheDocument();
    });

    it('should render total participant count', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      expect(screen.getByText('25 participants')).toBeInTheDocument();
    });

    it('should render viewpoint reasoning when showReasoning is true', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} showReasoning />);
      expect(screen.getByText('False information spreads rapidly')).toBeInTheDocument();
      expect(screen.getByText('First Amendment protections')).toBeInTheDocument();
    });

    it('should hide viewpoint reasoning when showReasoning is false', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} showReasoning={false} />);
      expect(screen.queryByText('False information spreads rapidly')).not.toBeInTheDocument();
    });

    it('should render underlying values when showUnderlyingValues is true', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} showUnderlyingValues />);
      expect(screen.getByText('Safety')).toBeInTheDocument();
      expect(screen.getByText('Freedom')).toBeInTheDocument();
      expect(screen.getByText('Trust in government')).toBeInTheDocument();
    });

    it('should hide underlying values when showUnderlyingValues is false', () => {
      render(
        <DivergencePointCard divergencePoint={baseDivergencePoint} showUnderlyingValues={false} />,
      );
      expect(screen.queryByText('Safety')).not.toBeInTheDocument();
    });

    it('should not render underlying values section when none provided', () => {
      const pointWithoutValues: DivergencePoint = {
        ...baseDivergencePoint,
        underlyingValues: undefined,
      };
      render(<DivergencePointCard divergencePoint={pointWithoutValues} />);
      expect(screen.queryByText('Underlying values:')).not.toBeInTheDocument();
    });
  });

  describe('Polarization Level Styling', () => {
    it('should use red styling for high polarization (0.7+)', () => {
      const { container } = render(
        <DivergencePointCard
          divergencePoint={{ ...baseDivergencePoint, polarizationScore: 0.8 }}
        />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-red-50');
      expect(card.className).toContain('border-red-500');
      expect(screen.getByText('High Polarization')).toBeInTheDocument();
    });

    it('should use yellow styling for medium polarization (0.4-0.69)', () => {
      const { container } = render(
        <DivergencePointCard
          divergencePoint={{ ...baseDivergencePoint, polarizationScore: 0.5 }}
        />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-yellow-50');
      expect(card.className).toContain('border-yellow-500');
      expect(screen.getByText('Moderate Polarization')).toBeInTheDocument();
    });

    it('should use blue styling for low polarization (<0.4)', () => {
      const { container } = render(
        <DivergencePointCard
          divergencePoint={{ ...baseDivergencePoint, polarizationScore: 0.3 }}
        />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-blue-50');
      expect(card.className).toContain('border-blue-500');
      expect(screen.getByText('Low Polarization')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size styles', () => {
      const { container } = render(
        <DivergencePointCard divergencePoint={baseDivergencePoint} size="small" />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-3');
    });

    it('should apply medium size styles (default)', () => {
      const { container } = render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-4');
    });

    it('should apply large size styles', () => {
      const { container } = render(
        <DivergencePointCard divergencePoint={baseDivergencePoint} size="large" />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-6');
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      fireEvent.click(card);
      expect(mockOnClick).toHaveBeenCalledWith(baseDivergencePoint.propositionId);
    });

    it('should call onClick on Enter key press', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: 'Enter', code: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledWith(baseDivergencePoint.propositionId);
    });

    it('should call onClick on Space key press', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: ' ', code: 'Space' });
      expect(mockOnClick).toHaveBeenCalledWith(baseDivergencePoint.propositionId);
    });

    it('should not call onClick on other keys', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: 'a', code: 'KeyA' });
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should render as article when onClick is not provided', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should add hover styles when clickable', () => {
      const { container } = render(
        <DivergencePointCard divergencePoint={baseDivergencePoint} onClick={mockOnClick} />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('cursor-pointer');
      expect(card.className).toContain('hover:shadow-md');
    });

    it('should not add hover styles when not clickable', () => {
      const { container } = render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain('cursor-pointer');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute(
        'aria-label',
        'Divergence point: Government should regulate social media content, 75% polarization',
      );
    });

    it('should have tabIndex when clickable', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should not have tabIndex when not clickable', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      const card = screen.getByRole('article');
      expect(card).not.toHaveAttribute('tabIndex');
    });

    it('should have proper progressbar attributes', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <DivergencePointCard divergencePoint={baseDivergencePoint} className="custom-class" />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });
  });

  describe('Viewpoint count display', () => {
    it('should show correct number of viewpoints', () => {
      render(<DivergencePointCard divergencePoint={baseDivergencePoint} />);
      expect(screen.getByText('Viewpoints (2):')).toBeInTheDocument();
    });

    it('should handle single viewpoint', () => {
      const singleViewpointPoint: DivergencePoint = {
        ...baseDivergencePoint,
        viewpoints: [baseDivergencePoint.viewpoints[0]],
      };
      render(<DivergencePointCard divergencePoint={singleViewpointPoint} />);
      expect(screen.getByText('Viewpoints (1):')).toBeInTheDocument();
    });

    it('should handle multiple viewpoints with color cycling', () => {
      const manyViewpointsPoint: DivergencePoint = {
        ...baseDivergencePoint,
        viewpoints: [
          ...baseDivergencePoint.viewpoints,
          {
            position: 'Third viewpoint',
            participantCount: 5,
            percentage: 20,
            reasoning: [],
          },
          {
            position: 'Fourth viewpoint',
            participantCount: 3,
            percentage: 12,
            reasoning: [],
          },
        ],
      };
      render(<DivergencePointCard divergencePoint={manyViewpointsPoint} />);
      expect(screen.getByText('Third viewpoint')).toBeInTheDocument();
      expect(screen.getByText('Fourth viewpoint')).toBeInTheDocument();
    });
  });
});
