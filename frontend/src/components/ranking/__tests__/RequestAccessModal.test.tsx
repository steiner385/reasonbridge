/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for RequestAccessModal component
 * Feature 781: User Ranking System - Task 6.4
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestAccessModal from '../RequestAccessModal';

describe('RequestAccessModal', () => {
  const defaultProps = {
    isOpen: true,
    topicId: 'topic-123',
    topicTitle: 'Climate Change Policy Discussion',
    onSubmit: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with topic title', () => {
      render(<RequestAccessModal {...defaultProps} />);

      // Topic title is wrapped in quotes, so use a function matcher
      expect(
        screen.getByText((content) => content.includes('Climate Change Policy Discussion')),
      ).toBeInTheDocument();
    });

    it('should show modal title', () => {
      render(<RequestAccessModal {...defaultProps} />);

      expect(screen.getByText(/request access/i)).toBeInTheDocument();
    });

    it('should show reason textarea', () => {
      render(<RequestAccessModal {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByLabelText(/why should you be granted access/i)).toBeInTheDocument();
    });

    it('should show Submit and Cancel buttons', () => {
      render(<RequestAccessModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /submit request/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<RequestAccessModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Climate Change Policy Discussion')).not.toBeInTheDocument();
    });

    it('should display informational text about review process', () => {
      render(<RequestAccessModal {...defaultProps} />);

      expect(screen.getByText(/topic creator will review/i)).toBeInTheDocument();
    });
  });

  describe('Reason Field', () => {
    it('should allow typing in reason textarea', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RequestAccessModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'I have expertise in this area');

      expect(textarea).toHaveValue('I have expertise in this area');
    });

    it('should indicate reason is optional', () => {
      render(<RequestAccessModal {...defaultProps} />);

      expect(screen.getByText(/optional/i)).toBeInTheDocument();
    });
  });

  describe('Submit Behavior', () => {
    it('should call onSubmit with reason when Submit button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'I have a background in environmental science');
      await user.click(screen.getByRole('button', { name: /submit request/i }));

      expect(onSubmit).toHaveBeenCalledWith('I have a background in environmental science');
    });

    it('should call onSubmit with undefined when no reason provided', async () => {
      const user = userEvent.setup({ delay: null });
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      expect(onSubmit).toHaveBeenCalledWith(undefined);
    });

    it('should call onSubmit with undefined when only whitespace provided', async () => {
      const user = userEvent.setup({ delay: null });
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '   ');
      await user.click(screen.getByRole('button', { name: /submit request/i }));

      expect(onSubmit).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Cancel Behavior', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();
      render(<RequestAccessModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should clear reason text when reopening modal', async () => {
      const user = userEvent.setup({ delay: null });
      const { rerender } = render(<RequestAccessModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Some reason');
      expect(textarea).toHaveValue('Some reason');

      // Close modal
      rerender(<RequestAccessModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<RequestAccessModal {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup({ delay: null });
      // Create a promise that we control
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      const onSubmit = vi.fn().mockReturnValue(submitPromise);

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      // Should show loading state
      expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();

      // Resolve the promise and wait for state updates
      resolveSubmit!();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /submitting/i })).not.toBeInTheDocument();
      });
    });

    it('should disable Cancel button during submission', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      const onSubmit = vi.fn().mockReturnValue(submitPromise);

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      // Resolve the promise and wait for state updates
      resolveSubmit!();
      await waitFor(() => {
        expect(screen.getByText(/request submitted/i)).toBeInTheDocument();
      });
    });

    it('should disable textarea during submission', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      const onSubmit = vi.fn().mockReturnValue(submitPromise);

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      expect(screen.getByRole('textbox')).toBeDisabled();

      // Resolve the promise and wait for state updates
      resolveSubmit!();
      await waitFor(() => {
        expect(screen.getByText(/request submitted/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on submission failure', async () => {
      const user = userEvent.setup({ delay: null });
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/failed to submit/i)).toBeInTheDocument();
      });
    });

    it('should re-enable form after error', async () => {
      const user = userEvent.setup({ delay: null });
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit request/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeEnabled();
        expect(screen.getByRole('textbox')).toBeEnabled();
      });
    });

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup({ delay: null });
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Start typing
      await user.type(screen.getByRole('textbox'), 'New reason');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Success Handling', () => {
    it('should call onSuccess callback after successful submission', async () => {
      const user = userEvent.setup({ delay: null });
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onSuccess = vi.fn();

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} onSuccess={onSuccess} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should show success feedback before closing', async () => {
      const user = userEvent.setup({ delay: null });
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      await waitFor(() => {
        expect(screen.getByText(/request submitted/i)).toBeInTheDocument();
      });
    });

    it('should close modal after success', async () => {
      const user = userEvent.setup({ delay: null });
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      // Wait for the auto-close after success (1 second delay in component)
      await waitFor(
        () => {
          expect(onClose).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(<RequestAccessModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<RequestAccessModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have accessible name for modal', () => {
      render(<RequestAccessModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have accessible label for textarea', () => {
      render(<RequestAccessModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAccessibleName(/why should you be granted access/i);
    });

    it('should close on Escape key press', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      render(<RequestAccessModal {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close on Escape during submission', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      const onSubmit = vi.fn().mockReturnValue(submitPromise);
      const onClose = vi.fn();

      render(<RequestAccessModal {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /submit request/i }));

      // Try to close with Escape during submission
      await user.keyboard('{Escape}');

      expect(onClose).not.toHaveBeenCalled();

      // Resolve the promise and wait for state updates
      resolveSubmit!();
      await waitFor(() => {
        expect(screen.getByText(/request submitted/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('should include dark mode classes', () => {
      render(<RequestAccessModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      // Check that dark mode classes exist in the component tree
      expect(dialog.innerHTML).toMatch(/dark:/);
    });
  });
});
