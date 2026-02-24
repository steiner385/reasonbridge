/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for OperationQueue component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import OperationQueue from '../OperationQueue';
import type { AIOperation } from '../../../types/simulator';

// Helper to create mock operations
function createOperation(overrides: Partial<AIOperation> = {}): AIOperation {
  return {
    id: `op-${Math.random().toString(36).substring(2, 9)}`,
    type: 'argument_analysis',
    status: 'active',
    label: 'Test operation',
    startedAt: Date.now(),
    estimatedMs: 3000,
    ...overrides,
  };
}

describe('OperationQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render nothing when operations array is empty', () => {
      const { container } = render(<OperationQueue operations={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render operations when array has items', () => {
      const operations = [createOperation({ label: 'Analyzing argument...' })];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByText('Analyzing argument...')).toBeInTheDocument();
    });

    it('should display correct count in header for single operation', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByText('1 operation in progress')).toBeInTheDocument();
    });

    it('should display correct count in header for multiple operations', () => {
      const operations = [
        createOperation({ status: 'active' }),
        createOperation({ status: 'pending' }),
      ];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByText('2 operations in progress')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} className="custom-class" />);
      const region = screen.getByRole('region');
      expect(region).toHaveClass('custom-class');
    });
  });

  describe('Status Indicators', () => {
    it('should show spinner icon for active operations', () => {
      const operations = [createOperation({ status: 'active' })];
      render(<OperationQueue operations={operations} />);
      // The header contains an animated spinner SVG with animate-spin class
      const header = screen.getByRole('button', { expanded: true });
      const spinner = header.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show pending status in summary', () => {
      const operations = [createOperation({ status: 'pending' })];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByText(/1 pending/)).toBeInTheDocument();
    });

    it('should show completed status in summary', () => {
      const operations = [createOperation({ status: 'completed' })];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByText(/1 completed/)).toBeInTheDocument();
      expect(screen.getByText('All operations completed')).toBeInTheDocument();
    });

    it('should show failed status in header when operations fail', () => {
      const operations = [createOperation({ status: 'failed' })];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByText('1 operation failed')).toBeInTheDocument();
    });

    it('should show error message for failed operations', () => {
      const operations = [
        createOperation({
          status: 'failed',
          error: 'Network timeout',
        }),
      ];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });

    it('should show combined status summary', () => {
      const operations = [
        createOperation({ status: 'active' }),
        createOperation({ status: 'pending' }),
        createOperation({ status: 'completed' }),
        createOperation({ status: 'failed' }),
      ];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByText(/1 active/)).toBeInTheDocument();
      expect(screen.getByText(/1 pending/)).toBeInTheDocument();
      expect(screen.getByText(/1 completed/)).toBeInTheDocument();
      expect(screen.getByText(/1 failed/)).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should be expanded by default (uncontrolled)', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should collapse when header is clicked', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('should expand when header is clicked again', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} />);

      const button = screen.getByRole('button');
      fireEvent.click(button); // collapse
      fireEvent.click(button); // expand

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should respect controlled expanded prop', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} expanded={false} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('should call onToggleExpand in controlled mode', () => {
      const onToggleExpand = vi.fn();
      const operations = [createOperation()];
      render(
        <OperationQueue operations={operations} expanded={true} onToggleExpand={onToggleExpand} />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });
  });

  describe('Progress Tracking', () => {
    it('should show progress bar for active operations with estimatedMs', () => {
      const operations = [
        createOperation({
          status: 'active',
          estimatedMs: 5000,
        }),
      ];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should not show progress bar for pending operations', () => {
      const operations = [createOperation({ status: 'pending' })];
      render(<OperationQueue operations={operations} />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('should not show progress bar for completed operations', () => {
      const operations = [createOperation({ status: 'completed' })];
      render(<OperationQueue operations={operations} />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('should update elapsed time for active operations', () => {
      const startedAt = Date.now();
      const operations = [
        createOperation({
          status: 'active',
          startedAt,
          estimatedMs: 5000,
        }),
      ];
      render(<OperationQueue operations={operations} />);

      // Initially should show 0s
      expect(screen.getByText('0s / 5s')).toBeInTheDocument();

      // Advance time by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('2s / 5s')).toBeInTheDocument();
    });

    it('should format time correctly for longer durations', () => {
      const startedAt = Date.now() - 65000; // 65 seconds ago
      const operations = [
        createOperation({
          status: 'active',
          startedAt,
          estimatedMs: 120000, // 2 minutes
        }),
      ];
      render(<OperationQueue operations={operations} />);

      expect(screen.getByText('1m 5s / 2m 0s')).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button for failed operations when onRetry is provided', () => {
      const operations = [createOperation({ status: 'failed', label: 'Failed op' })];
      render(<OperationQueue operations={operations} onRetry={vi.fn()} />);
      expect(screen.getByRole('button', { name: /retry failed op/i })).toBeInTheDocument();
    });

    it('should not show retry button when onRetry is not provided', () => {
      const operations = [createOperation({ status: 'failed', label: 'Failed op' })];
      render(<OperationQueue operations={operations} />);
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should not show retry button for non-failed operations', () => {
      const operations = [
        createOperation({ status: 'active' }),
        createOperation({ status: 'completed' }),
        createOperation({ status: 'pending' }),
      ];
      render(<OperationQueue operations={operations} onRetry={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should call onRetry with operation id when retry button is clicked', () => {
      const onRetry = vi.fn();
      const operations = [createOperation({ id: 'op-123', status: 'failed', label: 'Failed op' })];
      render(<OperationQueue operations={operations} onRetry={onRetry} />);

      fireEvent.click(screen.getByRole('button', { name: /retry failed op/i }));

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith('op-123');
    });
  });

  describe('Dismiss Functionality', () => {
    it('should show dismiss button for completed operations when onDismiss is provided', () => {
      const operations = [createOperation({ status: 'completed', label: 'Completed op' })];
      render(<OperationQueue operations={operations} onDismiss={vi.fn()} />);
      expect(screen.getByRole('button', { name: /dismiss completed op/i })).toBeInTheDocument();
    });

    it('should show dismiss button for failed operations when onDismiss is provided', () => {
      const operations = [createOperation({ status: 'failed', label: 'Failed op' })];
      render(<OperationQueue operations={operations} onDismiss={vi.fn()} />);
      expect(screen.getByRole('button', { name: /dismiss failed op/i })).toBeInTheDocument();
    });

    it('should not show dismiss button when onDismiss is not provided', () => {
      const operations = [createOperation({ status: 'completed' })];
      render(<OperationQueue operations={operations} />);
      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('should not show dismiss button for active or pending operations', () => {
      const operations = [
        createOperation({ status: 'active' }),
        createOperation({ status: 'pending' }),
      ];
      render(<OperationQueue operations={operations} onDismiss={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('should call onDismiss with operation id when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      const operations = [createOperation({ id: 'op-456', status: 'completed', label: 'Done op' })];
      render(<OperationQueue operations={operations} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByRole('button', { name: /dismiss done op/i }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledWith('op-456');
    });
  });

  describe('Accessibility', () => {
    it('should have region role with aria-label', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByRole('region', { name: /ai operations queue/i })).toBeInTheDocument();
    });

    it('should have aria-live for dynamic updates', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} />);
      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-expanded on toggle button', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded');
    });

    it('should have aria-controls linking to operation list', () => {
      const operations = [createOperation()];
      const { container } = render(<OperationQueue operations={operations} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-controls', 'operation-queue-list');
      const listContainer = container.querySelector('#operation-queue-list');
      expect(listContainer).toBeInTheDocument();
    });

    it('should have list role for operations', () => {
      const operations = [createOperation()];
      render(<OperationQueue operations={operations} />);
      expect(screen.getByRole('list', { name: /operation list/i })).toBeInTheDocument();
    });

    it('should have listitem role for each operation', () => {
      const operations = [createOperation({ label: 'Op 1' }), createOperation({ label: 'Op 2' })];
      render(<OperationQueue operations={operations} />);
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    it('should have proper aria-label on operation items', () => {
      const operations = [createOperation({ label: 'Test op', status: 'active' })];
      render(<OperationQueue operations={operations} />);
      const item = screen.getByRole('listitem');
      expect(item).toHaveAttribute('aria-label', 'Test op - active');
    });

    it('should have proper aria-label on retry button', () => {
      const operations = [createOperation({ status: 'failed', label: 'Failed op' })];
      render(<OperationQueue operations={operations} onRetry={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Retry Failed op' })).toBeInTheDocument();
    });

    it('should have proper aria-label on dismiss button', () => {
      const operations = [createOperation({ status: 'completed', label: 'Completed op' })];
      render(<OperationQueue operations={operations} onDismiss={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Dismiss Completed op' })).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should apply blue styling for active operations', () => {
      const operations = [createOperation({ status: 'active' })];
      render(<OperationQueue operations={operations} />);
      const region = screen.getByRole('region');
      expect(region).toHaveClass('bg-blue-100');
    });

    it('should apply red styling when there are failed operations', () => {
      const operations = [createOperation({ status: 'failed' })];
      render(<OperationQueue operations={operations} />);
      const region = screen.getByRole('region');
      expect(region).toHaveClass('bg-red-100');
    });

    it('should apply green styling when all operations are completed', () => {
      const operations = [createOperation({ status: 'completed' })];
      render(<OperationQueue operations={operations} />);
      const region = screen.getByRole('region');
      expect(region).toHaveClass('bg-green-100');
    });

    it('should prioritize error styling over active styling', () => {
      const operations = [
        createOperation({ status: 'active' }),
        createOperation({ status: 'failed' }),
      ];
      render(<OperationQueue operations={operations} />);
      const region = screen.getByRole('region');
      expect(region).toHaveClass('bg-red-100');
      expect(region).not.toHaveClass('bg-blue-100');
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(OperationQueue.displayName).toBe('OperationQueue');
    });
  });
});
