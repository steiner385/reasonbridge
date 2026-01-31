import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToneIndicator from '../ToneIndicator';
import type { ToneAnalysis } from '../../../types/feedback';

describe('ToneIndicator', () => {
  const mockCalmTone: ToneAnalysis = {
    level: 'calm',
    confidenceScore: 0.92,
    suggestion: 'Your tone is constructive and measured.',
  };

  const mockNeutralTone: ToneAnalysis = {
    level: 'neutral',
    confidenceScore: 0.88,
    reasoning: 'The content maintains an objective perspective.',
  };

  const mockAssertiveTone: ToneAnalysis = {
    level: 'assertive',
    confidenceScore: 0.85,
    suggestion: 'Strong but respectful argumentation.',
  };

  const mockHeatedTone: ToneAnalysis = {
    level: 'heated',
    confidenceScore: 0.78,
    suggestion: 'Consider cooling the language slightly.',
    reasoning: 'Passionate tone detected.',
  };

  const mockHostileTone: ToneAnalysis = {
    level: 'hostile',
    subtype: 'personal_attack',
    confidenceScore: 0.95,
    suggestion: 'Consider rephrasing to focus on ideas rather than personal characteristics.',
    reasoning: 'Personal attack detected in the content.',
  };

  describe('Gauge Variant (default)', () => {
    it('should render gauge variant by default', () => {
      render(<ToneIndicator tone={mockCalmTone} />);

      expect(screen.getByRole('region', { name: /tone analysis indicator/i })).toBeInTheDocument();
    });

    it('should display the tone level label', () => {
      render(<ToneIndicator tone={mockCalmTone} />);

      expect(screen.getByText('Calm Tone')).toBeInTheDocument();
    });

    it('should display confidence score as percentage', () => {
      render(<ToneIndicator tone={mockCalmTone} />);

      expect(screen.getByText('92% confident')).toBeInTheDocument();
    });

    it('should display suggestion when showSuggestion is true', () => {
      render(<ToneIndicator tone={mockCalmTone} showSuggestion />);

      expect(screen.getByText(/your tone is constructive and measured/i)).toBeInTheDocument();
    });

    it('should hide suggestion when showSuggestion is false', () => {
      render(<ToneIndicator tone={mockCalmTone} showSuggestion={false} />);

      expect(screen.queryByText(/your tone is constructive and measured/i)).not.toBeInTheDocument();
    });

    it('should render all tone level labels on the gauge', () => {
      render(<ToneIndicator tone={mockNeutralTone} />);

      expect(screen.getByText('Calm')).toBeInTheDocument();
      expect(screen.getByText('Neutral')).toBeInTheDocument();
      expect(screen.getByText('Assertive')).toBeInTheDocument();
      expect(screen.getByText('Heated')).toBeInTheDocument();
      expect(screen.getByText('Hostile')).toBeInTheDocument();
    });

    it('should display subtype badge when subtype is present', () => {
      render(<ToneIndicator tone={mockHostileTone} />);

      expect(screen.getByText('personal attack')).toBeInTheDocument();
    });

    it('should show view details button when onClick is provided', () => {
      const onClick = vi.fn();
      render(<ToneIndicator tone={mockCalmTone} onClick={onClick} />);

      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('should call onClick when view details is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ToneIndicator tone={mockCalmTone} onClick={onClick} />);

      await user.click(screen.getByRole('button', { name: /view details/i }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Compact Variant', () => {
    it('should render compact badge variant', () => {
      render(<ToneIndicator tone={mockCalmTone} variant="compact" />);

      expect(screen.getByRole('status', { name: /tone: calm/i })).toBeInTheDocument();
    });

    it('should display tone level in compact variant', () => {
      render(<ToneIndicator tone={mockNeutralTone} variant="compact" />);

      expect(screen.getByText('Neutral')).toBeInTheDocument();
    });

    it('should display confidence in compact variant when showConfidence is true', () => {
      render(<ToneIndicator tone={mockCalmTone} variant="compact" showConfidence />);

      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('should hide confidence in compact variant when showConfidence is false', () => {
      render(<ToneIndicator tone={mockCalmTone} variant="compact" showConfidence={false} />);

      expect(screen.queryByText('92%')).not.toBeInTheDocument();
    });

    it('should be clickable when onClick is provided', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ToneIndicator tone={mockCalmTone} variant="compact" onClick={onClick} />);

      await user.click(screen.getByRole('status'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not be clickable when onClick is not provided', () => {
      render(<ToneIndicator tone={mockCalmTone} variant="compact" />);

      const button = screen.getByRole('status');
      expect(button).toBeDisabled();
    });
  });

  describe('Inline Variant', () => {
    it('should render inline variant', () => {
      render(<ToneIndicator tone={mockCalmTone} variant="inline" />);

      expect(screen.getByRole('status', { name: /tone: calm/i })).toBeInTheDocument();
    });

    it('should display only tone level in inline variant', () => {
      render(<ToneIndicator tone={mockNeutralTone} variant="inline" />);

      expect(screen.getByText('Neutral')).toBeInTheDocument();
      // Should not display confidence or suggestion in inline
      expect(screen.queryByText('88%')).not.toBeInTheDocument();
    });
  });

  describe('Tone Levels', () => {
    it('should render calm tone with green styling', () => {
      const { container } = render(<ToneIndicator tone={mockCalmTone} variant="compact" />);

      const indicator = container.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should render neutral tone with blue styling', () => {
      const { container } = render(<ToneIndicator tone={mockNeutralTone} variant="compact" />);

      const indicator = container.querySelector('.bg-blue-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should render assertive tone with yellow styling', () => {
      const { container } = render(<ToneIndicator tone={mockAssertiveTone} variant="compact" />);

      const indicator = container.querySelector('.bg-yellow-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should render heated tone with orange styling', () => {
      const { container } = render(<ToneIndicator tone={mockHeatedTone} variant="compact" />);

      const indicator = container.querySelector('.bg-orange-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should render hostile tone with red styling', () => {
      const { container } = render(<ToneIndicator tone={mockHostileTone} variant="compact" />);

      const indicator = container.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small size', () => {
      render(<ToneIndicator tone={mockCalmTone} size="sm" />);

      const container = screen.getByRole('region');
      expect(container.className).toContain('p-2');
    });

    it('should render medium size (default)', () => {
      render(<ToneIndicator tone={mockCalmTone} size="md" />);

      const container = screen.getByRole('region');
      expect(container.className).toContain('p-3');
    });

    it('should render large size', () => {
      render(<ToneIndicator tone={mockCalmTone} size="lg" />);

      const container = screen.getByRole('region');
      expect(container.className).toContain('p-4');
    });
  });

  describe('Accessibility', () => {
    it('should have proper role="region" on gauge variant', () => {
      render(<ToneIndicator tone={mockCalmTone} />);

      expect(screen.getByRole('region', { name: /tone analysis indicator/i })).toBeInTheDocument();
    });

    it('should have proper role="status" on compact variant', () => {
      render(<ToneIndicator tone={mockCalmTone} variant="compact" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have proper aria-label on compact variant', () => {
      render(<ToneIndicator tone={mockCalmTone} variant="compact" />);

      expect(
        screen.getByRole('status', { name: /tone: calm, 92% confidence/i }),
      ).toBeInTheDocument();
    });

    it('should have proper role="slider" on marker', () => {
      render(<ToneIndicator tone={mockNeutralTone} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '25');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('aria-valuetext', 'Neutral');
    });

    it('should have proper role="status" on inline variant', () => {
      render(<ToneIndicator tone={mockCalmTone} variant="inline" />);

      expect(screen.getByRole('status', { name: /tone: calm/i })).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to gauge variant', () => {
      render(<ToneIndicator tone={mockCalmTone} className="custom-class" />);

      const container = screen.getByRole('region');
      expect(container.className).toContain('custom-class');
    });

    it('should apply custom className to compact variant', () => {
      render(<ToneIndicator tone={mockCalmTone} variant="compact" className="custom-class" />);

      const container = screen.getByRole('status');
      expect(container.className).toContain('custom-class');
    });

    it('should apply custom className to inline variant', () => {
      const { container } = render(
        <ToneIndicator tone={mockCalmTone} variant="inline" className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Tone Level Descriptions', () => {
    it('should show calm description', () => {
      render(<ToneIndicator tone={mockCalmTone} />);

      expect(screen.getByText('Constructive and measured tone')).toBeInTheDocument();
    });

    it('should show neutral description', () => {
      render(<ToneIndicator tone={mockNeutralTone} />);

      expect(screen.getByText('Balanced and objective tone')).toBeInTheDocument();
    });

    it('should show assertive description', () => {
      render(<ToneIndicator tone={mockAssertiveTone} />);

      expect(screen.getByText('Strong but respectful tone')).toBeInTheDocument();
    });

    it('should show heated description', () => {
      render(<ToneIndicator tone={mockHeatedTone} />);

      expect(screen.getByText('Passionate and intense tone')).toBeInTheDocument();
    });

    it('should show hostile description', () => {
      render(<ToneIndicator tone={mockHostileTone} />);

      expect(screen.getByText('May contain inflammatory language')).toBeInTheDocument();
    });
  });
});
