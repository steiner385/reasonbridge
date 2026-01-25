import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AlignmentInput from '../AlignmentInput';

describe('AlignmentInput', () => {
  describe('Button Display', () => {
    it('should display agree, disagree, and nuanced buttons', () => {
      render(<AlignmentInput />);

      expect(screen.getByRole('button', { name: /agree\/support/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disagree\/oppose/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /nuanced position/i })).toBeInTheDocument();
    });

    it('should show labels by default', () => {
      render(<AlignmentInput />);

      expect(screen.getByText('Agree')).toBeInTheDocument();
      expect(screen.getByText('Disagree')).toBeInTheDocument();
      expect(screen.getByText('Nuanced')).toBeInTheDocument();
    });

    it('should hide labels when showLabels is false', () => {
      render(<AlignmentInput showLabels={false} />);

      expect(screen.queryByText('Agree')).not.toBeInTheDocument();
      expect(screen.queryByText('Disagree')).not.toBeInTheDocument();
      expect(screen.queryByText('Nuanced')).not.toBeInTheDocument();

      // But buttons should still exist
      expect(screen.getByRole('button', { name: /agree\/support/i })).toBeInTheDocument();
    });
  });

  describe('Stance Selection', () => {
    it('should highlight selected support stance button', async () => {
      const user = userEvent.setup();
      render(<AlignmentInput />);

      const agreeButton = screen.getByRole('button', { name: /agree\/support/i });
      await user.click(agreeButton);

      expect(agreeButton.className).toContain('bg-green-100');
      expect(agreeButton.className).toContain('border-green-500');
    });

    it('should highlight selected oppose stance button', async () => {
      const user = userEvent.setup();
      render(<AlignmentInput />);

      const disagreeButton = screen.getByRole('button', { name: /disagree\/oppose/i });
      await user.click(disagreeButton);

      expect(disagreeButton.className).toContain('bg-red-100');
      expect(disagreeButton.className).toContain('border-red-500');
    });

    it('should highlight selected nuanced stance button', async () => {
      const user = userEvent.setup();
      render(<AlignmentInput />);

      const nuancedButton = screen.getByRole('button', { name: /nuanced position/i });
      await user.click(nuancedButton);

      expect(nuancedButton.className).toContain('bg-blue-100');
      expect(nuancedButton.className).toContain('border-blue-500');
    });
  });

  describe('Callbacks', () => {
    it('should call onAlign when agree button is clicked', async () => {
      const onAlign = vi.fn();
      const user = userEvent.setup();

      render(<AlignmentInput onAlign={onAlign} />);

      await user.click(screen.getByRole('button', { name: /agree\/support/i }));

      expect(onAlign).toHaveBeenCalledWith('support');
    });

    it('should call onAlign when disagree button is clicked', async () => {
      const onAlign = vi.fn();
      const user = userEvent.setup();

      render(<AlignmentInput onAlign={onAlign} />);

      await user.click(screen.getByRole('button', { name: /disagree\/oppose/i }));

      expect(onAlign).toHaveBeenCalledWith('oppose');
    });

    it('should call onRemove when deselecting current stance', async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();

      render(<AlignmentInput currentStance="support" onRemove={onRemove} />);

      await user.click(screen.getByRole('button', { name: /agree\/support/i }));

      expect(onRemove).toHaveBeenCalled();
    });
  });

  describe('Nuanced Input', () => {
    it('should show explanation textarea when nuanced button is clicked', async () => {
      const user = userEvent.setup();
      render(<AlignmentInput />);

      await user.click(screen.getByRole('button', { name: /nuanced position/i }));

      expect(screen.getByLabelText(/explain your nuanced position/i)).toBeInTheDocument();
    });

    it('should require explanation text for nuanced alignment', async () => {
      const user = userEvent.setup();
      render(<AlignmentInput />);

      await user.click(screen.getByRole('button', { name: /nuanced position/i }));

      const submitButton = screen.getByRole('button', { name: /submit alignment/i });
      expect(submitButton).toBeDisabled();

      const textarea = screen.getByLabelText(/explain your nuanced position/i);
      await user.type(textarea, 'I partially agree because...');

      expect(submitButton).not.toBeDisabled();
    });

    it('should call onAlign with explanation when nuanced alignment is submitted', async () => {
      const onAlign = vi.fn();
      const user = userEvent.setup();

      render(<AlignmentInput onAlign={onAlign} />);

      await user.click(screen.getByRole('button', { name: /nuanced position/i }));

      const textarea = screen.getByLabelText(/explain your nuanced position/i);
      await user.type(textarea, 'I partially agree because of X but disagree on Y');

      await user.click(screen.getByRole('button', { name: /submit alignment/i }));

      expect(onAlign).toHaveBeenCalledWith(
        'nuanced',
        'I partially agree because of X but disagree on Y',
      );
    });

    it('should cancel nuanced input and clear selection', async () => {
      const user = userEvent.setup();
      render(<AlignmentInput />);

      await user.click(screen.getByRole('button', { name: /nuanced position/i }));

      const textarea = screen.getByLabelText(/explain your nuanced position/i);
      await user.type(textarea, 'Some explanation');

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByLabelText(/explain your nuanced position/i)).not.toBeInTheDocument();

      const nuancedButton = screen.getByRole('button', { name: /nuanced position/i });
      expect(nuancedButton.className).not.toContain('bg-blue-100');
    });

    it('should initialize with nuanced explanation when provided', () => {
      render(<AlignmentInput currentStance="nuanced" currentExplanation="My nuanced view" />);

      const textarea = screen.getByLabelText(/explain your nuanced position/i);
      expect(textarea).toHaveValue('My nuanced view');
    });
  });

  describe('Disabled State', () => {
    it('should disable buttons when disabled prop is true', () => {
      render(<AlignmentInput disabled />);

      expect(screen.getByRole('button', { name: /agree\/support/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /disagree\/oppose/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /nuanced position/i })).toBeDisabled();
    });

    it('should disable nuanced textarea and buttons when disabled', async () => {
      const user = userEvent.setup();
      render(<AlignmentInput currentStance="nuanced" disabled />);

      const textarea = screen.getByLabelText(/explain your nuanced position/i);
      expect(textarea).toBeDisabled();

      const submitButton = screen.getByRole('button', { name: /submit alignment/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Orientation', () => {
    it('should support vertical orientation', () => {
      const { container } = render(<AlignmentInput orientation="vertical" />);

      const buttonContainer = container.querySelector('.flex');
      expect(buttonContainer?.className).toContain('flex-col');
    });

    it('should support horizontal orientation', () => {
      const { container } = render(<AlignmentInput orientation="horizontal" />);

      const buttonContainer = container.querySelector('.flex');
      expect(buttonContainer?.className).toContain('flex-row');
    });
  });

  describe('Size Variants', () => {
    it('should support small size variant', () => {
      render(<AlignmentInput size="sm" />);

      const agreeButton = screen.getByRole('button', { name: /agree\/support/i });
      expect(agreeButton.className).toContain('text-xs');
    });

    it('should support medium size variant', () => {
      render(<AlignmentInput size="md" />);

      const agreeButton = screen.getByRole('button', { name: /agree\/support/i });
      expect(agreeButton.className).toContain('text-sm');
    });

    it('should support large size variant', () => {
      render(<AlignmentInput size="lg" />);

      const agreeButton = screen.getByRole('button', { name: /agree\/support/i });
      expect(agreeButton.className).toContain('text-base');
    });
  });

  describe('Edge Cases', () => {
    it('should not call callbacks when disabled', async () => {
      const onAlign = vi.fn();
      const onRemove = vi.fn();
      const user = userEvent.setup();

      render(<AlignmentInput onAlign={onAlign} onRemove={onRemove} disabled />);

      await user.click(screen.getByRole('button', { name: /agree\/support/i }));

      expect(onAlign).not.toHaveBeenCalled();
      expect(onRemove).not.toHaveBeenCalled();
    });

    it('should not submit nuanced alignment with empty explanation', async () => {
      const onAlign = vi.fn();
      const user = userEvent.setup();

      render(<AlignmentInput onAlign={onAlign} />);

      await user.click(screen.getByRole('button', { name: /nuanced position/i }));

      const submitButton = screen.getByRole('button', { name: /submit alignment/i });
      expect(submitButton).toBeDisabled();

      // Should not be able to click
      await user.click(submitButton);

      expect(onAlign).not.toHaveBeenCalled();
    });
  });
});
