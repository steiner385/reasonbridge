import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Skeleton from './Skeleton';

describe('Skeleton', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render with rectangular variant by default', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('rounded');
      expect(skeleton).not.toHaveClass('rounded-full');
    });

    it('should render circular variant with rounded-full class', () => {
      render(<Skeleton variant="circular" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('should render text variant with rounded class', () => {
      render(<Skeleton variant="text" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('rounded');
    });
  });

  describe('Dimensions', () => {
    it('should apply width as pixels when number provided', () => {
      render(<Skeleton width={100} data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '100px' });
    });

    it('should apply width as string when string provided', () => {
      render(<Skeleton width="50%" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '50%' });
    });

    it('should apply height as pixels when number provided', () => {
      render(<Skeleton height={20} data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ height: '20px' });
    });

    it('should apply height as string when string provided', () => {
      render(<Skeleton height="2rem" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ height: '2rem' });
    });

    it('should apply default 1em height for text variant without explicit height', () => {
      render(<Skeleton variant="text" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ height: '1em' });
    });
  });

  describe('Animation', () => {
    it('should apply pulse animation by default', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('should apply no animation class when animation is none', () => {
      render(<Skeleton animation="none" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).not.toHaveClass('animate-pulse');
    });

    it('should apply pulse animation when shimmer is requested', () => {
      // shimmer falls back to pulse in current implementation
      render(<Skeleton animation="shimmer" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
    });

    it('should have aria-busy="true"', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-label for screen readers', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });

    it('should have screen reader only text', () => {
      render(<Skeleton data-testid="skeleton" />);
      const srText = screen.getByText('Loading...');
      expect(srText).toHaveClass('sr-only');
    });
  });

  describe('Styling', () => {
    it('should apply base skeleton classes', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('bg-gray-200');
    });

    it('should apply custom className', () => {
      render(<Skeleton className="my-custom-class" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('my-custom-class');
    });
  });
});
