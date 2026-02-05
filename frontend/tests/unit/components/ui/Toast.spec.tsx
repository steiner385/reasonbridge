import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '../../../../src/components/ui/Toast';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const defaultProps = {
    id: 'test-toast-1',
    message: 'Test notification message',
    variant: 'success' as const,
    onDismiss: vi.fn(),
  };

  describe('rendering', () => {
    it('should render toast with message', () => {
      render(<Toast {...defaultProps} />);

      expect(screen.getByText('Test notification message')).toBeInTheDocument();
    });

    it('should render success variant with correct styling', () => {
      const { container } = render(<Toast {...defaultProps} variant="success" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('bg-green-50');
      expect(toast).toHaveClass('text-green-800');
    });

    it('should render error variant with correct styling', () => {
      const { container } = render(<Toast {...defaultProps} variant="error" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('bg-red-50');
      expect(toast).toHaveClass('text-red-800');
    });

    it('should render warning variant with correct styling', () => {
      const { container } = render(<Toast {...defaultProps} variant="warning" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('bg-yellow-50');
      expect(toast).toHaveClass('text-yellow-800');
    });

    it('should render info variant with correct styling', () => {
      const { container } = render(<Toast {...defaultProps} variant="info" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('bg-blue-50');
      expect(toast).toHaveClass('text-blue-800');
    });

    it('should render dismiss button', () => {
      render(<Toast {...defaultProps} />);

      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeInTheDocument();
    });

    it('should render appropriate icon for each variant', () => {
      const { container: successContainer } = render(<Toast {...defaultProps} variant="success" />);
      expect(successContainer.querySelector('svg')).toBeInTheDocument();

      const { container: errorContainer } = render(<Toast {...defaultProps} variant="error" />);
      expect(errorContainer.querySelectorAll('svg')).toHaveLength(2); // Icon + dismiss button

      const { container: warningContainer } = render(<Toast {...defaultProps} variant="warning" />);
      expect(warningContainer.querySelectorAll('svg')).toHaveLength(2);

      const { container: infoContainer } = render(<Toast {...defaultProps} variant="info" />);
      expect(infoContainer.querySelectorAll('svg')).toHaveLength(2);
    });
  });

  describe('auto-dismiss', () => {
    it('should auto-dismiss after default duration (5000ms)', async () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} />);

      expect(onDismiss).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);

      expect(onDismiss).toHaveBeenCalledWith('test-toast-1');
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should auto-dismiss after custom duration', async () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} duration={3000} />);

      vi.advanceTimersByTime(2999);
      expect(onDismiss).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledWith('test-toast-1');
    });

    it('should not auto-dismiss when duration is 0', async () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} duration={0} />);

      vi.advanceTimersByTime(10000);

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should clean up timer on unmount', () => {
      const onDismiss = vi.fn();
      const { unmount } = render(<Toast {...defaultProps} onDismiss={onDismiss} />);

      unmount();
      vi.advanceTimersByTime(5000);

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('manual dismiss', () => {
    it('should call onDismiss when clicking dismiss button', async () => {
      vi.useRealTimers(); // Use real timers for user interaction
      const onDismiss = vi.fn();
      const user = userEvent.setup();
      render(<Toast {...defaultProps} onDismiss={onDismiss} />);

      const dismissButton = screen.getByLabelText('Dismiss notification');
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledWith('test-toast-1');
      expect(onDismiss).toHaveBeenCalledTimes(1);
      vi.useFakeTimers(); // Restore fake timers for other tests
    });

    it('should pass correct id to onDismiss', async () => {
      vi.useRealTimers(); // Use real timers for user interaction
      const onDismiss = vi.fn();
      const user = userEvent.setup();
      render(<Toast {...defaultProps} id="custom-id-123" onDismiss={onDismiss} />);

      const dismissButton = screen.getByLabelText('Dismiss notification');
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledWith('custom-id-123');
      vi.useFakeTimers(); // Restore fake timers for other tests
    });
  });

  describe('accessibility', () => {
    it('should have role="alert"', () => {
      const { container } = render(<Toast {...defaultProps} />);

      expect(container.firstChild).toHaveAttribute('role', 'alert');
    });

    it('should have aria-live="polite"', () => {
      const { container } = render(<Toast {...defaultProps} />);

      expect(container.firstChild).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-atomic="true"', () => {
      const { container } = render(<Toast {...defaultProps} />);

      expect(container.firstChild).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have accessible dismiss button label', () => {
      render(<Toast {...defaultProps} />);

      expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
    });
  });

  describe('animations', () => {
    it('should have slide-up animation class', () => {
      const { container } = render(<Toast {...defaultProps} />);

      expect(container.firstChild).toHaveClass('animate-slide-up');
    });
  });

  describe('dark mode', () => {
    it('should have dark mode classes for success variant', () => {
      const { container } = render(<Toast {...defaultProps} variant="success" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast.className).toContain('dark:bg-green-900/20');
      expect(toast.className).toContain('dark:text-green-300');
    });

    it('should have dark mode classes for error variant', () => {
      const { container } = render(<Toast {...defaultProps} variant="error" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast.className).toContain('dark:bg-red-900/20');
      expect(toast.className).toContain('dark:text-red-300');
    });
  });
});
