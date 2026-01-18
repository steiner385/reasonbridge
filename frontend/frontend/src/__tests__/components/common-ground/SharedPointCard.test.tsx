import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SharedPointCard from '../../../components/common-ground/SharedPointCard';
import type { Proposition } from '../../../types/common-ground';

describe('SharedPointCard', () => {
  const mockOnClick = jest.fn();

  const baseProposition: Proposition = {
    id: 'prop-1',
    text: 'Climate change is primarily caused by human activity',
    agreementPercentage: 85,
    supportingParticipants: ['user1', 'user2', 'user3', 'user4', 'user5'],
    opposingParticipants: ['user6'],
    neutralParticipants: [],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render proposition text', () => {
      render(<SharedPointCard proposition={baseProposition} />);
      expect(screen.getByText(baseProposition.text)).toBeInTheDocument();
    });

    it('should render agreement percentage badge', () => {
      render(<SharedPointCard proposition={baseProposition} />);
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should hide agreement badge when showAgreementBadge is false', () => {
      render(<SharedPointCard proposition={baseProposition} showAgreementBadge={false} />);
      expect(screen.queryByText('85%')).not.toBeInTheDocument();
    });

    it('should render progress bar with correct width', () => {
      render(<SharedPointCard proposition={baseProposition} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '85%' });
    });

    it('should render participant counts when showParticipants is true', () => {
      render(<SharedPointCard proposition={baseProposition} showParticipants />);
      expect(screen.getByText('5 support')).toBeInTheDocument();
      expect(screen.getByText('1 oppose')).toBeInTheDocument();
      expect(screen.getByText('6 total')).toBeInTheDocument();
    });

    it('should hide participant counts when showParticipants is false', () => {
      render(<SharedPointCard proposition={baseProposition} showParticipants={false} />);
      expect(screen.queryByText('5 support')).not.toBeInTheDocument();
      expect(screen.queryByText('1 oppose')).not.toBeInTheDocument();
    });

    it('should show neutral participants when present', () => {
      const propWithNeutral: Proposition = {
        ...baseProposition,
        neutralParticipants: ['user7', 'user8'],
      };
      render(<SharedPointCard proposition={propWithNeutral} showParticipants />);
      expect(screen.getByText('2 neutral')).toBeInTheDocument();
    });

    it('should hide neutral count when no neutral participants', () => {
      render(<SharedPointCard proposition={baseProposition} showParticipants />);
      expect(screen.queryByText(/neutral/i)).not.toBeInTheDocument();
    });
  });

  describe('Agreement Level Styling', () => {
    it('should use green styling for high agreement (80%+)', () => {
      const { container } = render(
        <SharedPointCard proposition={{ ...baseProposition, agreementPercentage: 85 }} />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-green-50');
      expect(card.className).toContain('border-green-500');
    });

    it('should use blue styling for good agreement (60-79%)', () => {
      const { container } = render(
        <SharedPointCard proposition={{ ...baseProposition, agreementPercentage: 70 }} />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-blue-50');
      expect(card.className).toContain('border-blue-500');
    });

    it('should use yellow styling for moderate agreement (40-59%)', () => {
      const { container } = render(
        <SharedPointCard proposition={{ ...baseProposition, agreementPercentage: 50 }} />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-yellow-50');
      expect(card.className).toContain('border-yellow-500');
    });

    it('should use gray styling for low agreement (<40%)', () => {
      const { container } = render(
        <SharedPointCard proposition={{ ...baseProposition, agreementPercentage: 30 }} />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-gray-50');
      expect(card.className).toContain('border-gray-500');
    });
  });

  describe('Size Variants', () => {
    it('should apply small size styles', () => {
      const { container } = render(<SharedPointCard proposition={baseProposition} size="small" />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-3');
    });

    it('should apply medium size styles (default)', () => {
      const { container } = render(<SharedPointCard proposition={baseProposition} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-4');
    });

    it('should apply large size styles', () => {
      const { container } = render(<SharedPointCard proposition={baseProposition} size="large" />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-6');
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', () => {
      render(<SharedPointCard proposition={baseProposition} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      fireEvent.click(card);
      expect(mockOnClick).toHaveBeenCalledWith(baseProposition.id);
    });

    it('should call onClick on Enter key press', () => {
      render(<SharedPointCard proposition={baseProposition} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: 'Enter', code: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledWith(baseProposition.id);
    });

    it('should call onClick on Space key press', () => {
      render(<SharedPointCard proposition={baseProposition} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: ' ', code: 'Space' });
      expect(mockOnClick).toHaveBeenCalledWith(baseProposition.id);
    });

    it('should not call onClick on other keys', () => {
      render(<SharedPointCard proposition={baseProposition} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: 'a', code: 'KeyA' });
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should render as article when onClick is not provided', () => {
      render(<SharedPointCard proposition={baseProposition} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should add hover styles when clickable', () => {
      const { container } = render(
        <SharedPointCard proposition={baseProposition} onClick={mockOnClick} />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('cursor-pointer');
      expect(card.className).toContain('hover:shadow-md');
    });

    it('should not add hover styles when not clickable', () => {
      const { container } = render(<SharedPointCard proposition={baseProposition} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain('cursor-pointer');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<SharedPointCard proposition={baseProposition} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute(
        'aria-label',
        'Shared point: Climate change is primarily caused by human activity, 85% agreement',
      );
    });

    it('should have tabIndex when clickable', () => {
      render(<SharedPointCard proposition={baseProposition} onClick={mockOnClick} />);
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should not have tabIndex when not clickable', () => {
      render(<SharedPointCard proposition={baseProposition} />);
      const card = screen.getByRole('article');
      expect(card).not.toHaveAttribute('tabIndex');
    });

    it('should have proper progressbar attributes', () => {
      render(<SharedPointCard proposition={baseProposition} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '85');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SharedPointCard proposition={baseProposition} className="custom-class" />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });
  });

  describe('Supporting count visibility', () => {
    it('should show total count by default', () => {
      render(<SharedPointCard proposition={baseProposition} />);
      expect(screen.getByText('6 total')).toBeInTheDocument();
    });

    it('should hide total count when showSupportingCount is false', () => {
      render(<SharedPointCard proposition={baseProposition} showSupportingCount={false} />);
      expect(screen.queryByText(/total/i)).not.toBeInTheDocument();
    });
  });
});
