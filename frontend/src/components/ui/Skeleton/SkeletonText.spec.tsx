import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkeletonText from './SkeletonText';

describe('SkeletonText', () => {
  describe('Rendering', () => {
    it('should render with default props (1 line)', () => {
      render(<SkeletonText data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      expect(container).toBeInTheDocument();
      // Should have 1 line skeleton
      const lines = container.querySelectorAll('[aria-hidden="true"]');
      expect(lines).toHaveLength(1);
    });

    it('should render multiple lines when specified', () => {
      render(<SkeletonText lines={3} data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      const lines = container.querySelectorAll('[aria-hidden="true"]');
      expect(lines).toHaveLength(3);
    });

    it('should render 5 lines when lines=5', () => {
      render(<SkeletonText lines={5} data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      const lines = container.querySelectorAll('[aria-hidden="true"]');
      expect(lines).toHaveLength(5);
    });
  });

  describe('Last Line Width', () => {
    it('should apply lastLineWidth to the last line only', () => {
      render(<SkeletonText lines={3} lastLineWidth={60} data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      const lines = container.querySelectorAll('[aria-hidden="true"]');

      // First two lines should be 100%
      expect(lines[0]).toHaveStyle({ width: '100%' });
      expect(lines[1]).toHaveStyle({ width: '100%' });
      // Last line should be 60%
      expect(lines[2]).toHaveStyle({ width: '60%' });
    });

    it('should use default lastLineWidth of 75%', () => {
      render(<SkeletonText lines={2} data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      const lines = container.querySelectorAll('[aria-hidden="true"]');

      expect(lines[0]).toHaveStyle({ width: '100%' });
      expect(lines[1]).toHaveStyle({ width: '75%' });
    });

    it('should not apply lastLineWidth when only 1 line', () => {
      render(<SkeletonText lines={1} lastLineWidth={60} data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      const lines = container.querySelectorAll('[aria-hidden="true"]');

      // Single line should be 100% width
      expect(lines[0]).toHaveStyle({ width: '100%' });
    });
  });

  describe('Size Variants', () => {
    it('should apply sm size classes', () => {
      render(<SkeletonText size="sm" data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      expect(container).toHaveClass('space-y-2');
      const line = container.querySelector('[aria-hidden="true"]');
      expect(line).toHaveClass('h-3');
    });

    it('should apply md size classes by default', () => {
      render(<SkeletonText data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      expect(container).toHaveClass('space-y-2');
      const line = container.querySelector('[aria-hidden="true"]');
      expect(line).toHaveClass('h-4');
    });

    it('should apply lg size classes', () => {
      render(<SkeletonText size="lg" data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      expect(container).toHaveClass('space-y-3');
      const line = container.querySelector('[aria-hidden="true"]');
      expect(line).toHaveClass('h-5');
    });

    it('should apply xl size classes', () => {
      render(<SkeletonText size="xl" data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      expect(container).toHaveClass('space-y-3');
      const line = container.querySelector('[aria-hidden="true"]');
      expect(line).toHaveClass('h-6');
    });
  });

  describe('Animation', () => {
    it('should apply pulse animation by default', () => {
      render(<SkeletonText data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      const line = container.querySelector('[aria-hidden="true"]');
      expect(line).toHaveClass('animate-pulse');
    });

    it('should apply no animation when animation is none', () => {
      render(<SkeletonText animation="none" data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      const line = container.querySelector('[aria-hidden="true"]');
      expect(line).not.toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<SkeletonText data-testid="skeleton-text" />);
      const container = screen.getByRole('status');
      expect(container).toBeInTheDocument();
    });

    it('should have aria-busy="true"', () => {
      render(<SkeletonText data-testid="skeleton-text" />);
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-label for screen readers', () => {
      render(<SkeletonText data-testid="skeleton-text" />);
      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-label', 'Loading content');
    });

    it('should have screen reader only text', () => {
      render(<SkeletonText data-testid="skeleton-text" />);
      const srText = screen.getByText('Loading text...');
      expect(srText).toHaveClass('sr-only');
    });

    it('should mark individual lines as aria-hidden', () => {
      render(<SkeletonText lines={2} data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      const lines = container.querySelectorAll('[aria-hidden="true"]');
      expect(lines).toHaveLength(2);
    });
  });

  describe('Styling', () => {
    it('should apply base skeleton classes to lines', () => {
      render(<SkeletonText data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      const line = container.querySelector('[aria-hidden="true"]');
      expect(line).toHaveClass('bg-gray-200');
      expect(line).toHaveClass('rounded');
    });

    it('should apply custom className to container', () => {
      render(<SkeletonText className="my-custom-class" data-testid="skeleton-text" />);
      const container = screen.getByTestId('skeleton-text');
      expect(container).toHaveClass('my-custom-class');
    });
  });
});
