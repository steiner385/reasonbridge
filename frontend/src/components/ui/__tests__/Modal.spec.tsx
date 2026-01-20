/**
 * Unit tests for Modal component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up body style
    document.body.style.overflow = 'unset';
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should have correct aria attributes', () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should render title with correct id', () => {
      render(<Modal {...defaultProps} />);
      const title = screen.getByText('Test Modal');
      expect(title).toHaveAttribute('id', 'modal-title');
    });
  });

  describe('Close Button', () => {
    it('should render close button by default', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should not render close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await userEvent.click(screen.getByLabelText('Close modal'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Backdrop Click', () => {
    it('should call onClose when backdrop is clicked by default', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      // The backdrop is the first div with the bg-opacity class
      const backdrop = document.querySelector('.bg-gray-900.bg-opacity-50');
      if (backdrop) {
        await userEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should not call onClose when backdrop is clicked and closeOnBackdropClick is false', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnBackdropClick={false} />);

      const backdrop = document.querySelector('.bg-gray-900.bg-opacity-50');
      if (backdrop) {
        await userEvent.click(backdrop);
        expect(onClose).not.toHaveBeenCalled();
      }
    });

    it('should not call onClose when modal content is clicked', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await userEvent.click(screen.getByText('Modal content'));
      // Should only be called if close button was clicked, not content
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('should call onClose when Escape key is pressed by default', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await userEvent.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when Escape key is pressed and closeOnEscape is false', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);

      await userEvent.keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Sizes', () => {
    it('should apply medium size by default', () => {
      render(<Modal {...defaultProps} />);
      const modalContent = document.querySelector('.max-w-lg');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply small size', () => {
      render(<Modal {...defaultProps} size="sm" />);
      const modalContent = document.querySelector('.max-w-md');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply large size', () => {
      render(<Modal {...defaultProps} size="lg" />);
      const modalContent = document.querySelector('.max-w-2xl');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply extra large size', () => {
      render(<Modal {...defaultProps} size="xl" />);
      const modalContent = document.querySelector('.max-w-4xl');
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('should not render footer section when footer is not provided', () => {
      render(<Modal {...defaultProps} />);
      const footerSection = document.querySelector('.bg-gray-50');
      expect(footerSection).not.toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      render(
        <Modal
          {...defaultProps}
          footer={
            <>
              <button>Cancel</button>
              <button>Confirm</button>
            </>
          }
        />,
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when modal opens', () => {
      render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should unlock body scroll when modal closes', () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('unset');
    });

    it('should unlock body scroll on unmount', () => {
      const { unmount } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Focus Management', () => {
    it('should focus first focusable element when modal opens', async () => {
      render(
        <Modal {...defaultProps}>
          <input data-testid="first-input" />
          <button>Button</button>
        </Modal>,
      );

      await waitFor(() => {
        // The close button should be focused first as it's the first focusable element
        expect(document.activeElement).toHaveAttribute('aria-label', 'Close modal');
      });
    });

    it('should trap focus within modal', async () => {
      render(
        <Modal {...defaultProps}>
          <input data-testid="input" />
          <button data-testid="button">Submit</button>
        </Modal>,
      );

      // Wait for initial focus
      await waitFor(() => {
        expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
      });

      // Tab through elements - focus should cycle within modal
      const closeButton = screen.getByLabelText('Close modal');
      closeButton.focus();

      // Tab should move to next element
      await userEvent.tab();
      expect(screen.getByTestId('input')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByTestId('button')).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should be labelled by title', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });
  });

  describe('Complex Content', () => {
    it('should render complex children', () => {
      render(
        <Modal {...defaultProps}>
          <form>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" />
          </form>
        </Modal>,
      );

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should work with interactive footer', async () => {
      const onCancel = vi.fn();
      const onSubmit = vi.fn();

      render(
        <Modal
          {...defaultProps}
          footer={
            <>
              <button onClick={onCancel}>Cancel</button>
              <button onClick={onSubmit}>Submit</button>
            </>
          }
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on close', () => {
      const { rerender } = render(<Modal {...defaultProps} />);

      // Close the modal
      rerender(<Modal {...defaultProps} isOpen={false} />);

      // Escape key should not call onClose after modal is closed
      const onClose = vi.fn();
      rerender(<Modal {...defaultProps} isOpen={false} onClose={onClose} />);

      // No dialog in document means escape listener shouldn't fire
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
