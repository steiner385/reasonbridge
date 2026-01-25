import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkeletonAvatar from './SkeletonAvatar';

describe('SkeletonAvatar', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('should render with circular shape', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('rounded-full');
    });
  });

  describe('Size Variants', () => {
    it('should apply sm size (32px)', () => {
      render(<SkeletonAvatar size="sm" data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('w-8');
      expect(avatar).toHaveClass('h-8');
    });

    it('should apply md size by default (48px)', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('w-12');
      expect(avatar).toHaveClass('h-12');
    });

    it('should apply lg size (64px)', () => {
      render(<SkeletonAvatar size="lg" data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('w-16');
      expect(avatar).toHaveClass('h-16');
    });

    it('should apply xl size (96px)', () => {
      render(<SkeletonAvatar size="xl" data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('w-24');
      expect(avatar).toHaveClass('h-24');
    });
  });

  describe('Animation', () => {
    it('should apply pulse animation by default', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('animate-pulse');
    });

    it('should apply no animation when animation is none', () => {
      render(<SkeletonAvatar animation="none" data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).not.toHaveClass('animate-pulse');
    });

    it('should apply pulse animation when shimmer is requested', () => {
      render(<SkeletonAvatar animation="shimmer" data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />);
      const avatar = screen.getByRole('status');
      expect(avatar).toBeInTheDocument();
    });

    it('should have aria-busy="true"', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />);
      const avatar = screen.getByRole('status');
      expect(avatar).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-label for screen readers', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />);
      const avatar = screen.getByRole('status');
      expect(avatar).toHaveAttribute('aria-label', 'Loading content');
    });

    it('should have screen reader only text', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />);
      const srText = screen.getByText('Loading avatar...');
      expect(srText).toHaveClass('sr-only');
    });
  });

  describe('Styling', () => {
    it('should apply base skeleton classes', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('bg-gray-200');
    });

    it('should apply custom className', () => {
      render(<SkeletonAvatar className="my-custom-class" data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('my-custom-class');
    });

    it('should maintain circular shape with custom className', () => {
      render(<SkeletonAvatar className="border-2" data-testid="skeleton-avatar" />);
      const avatar = screen.getByTestId('skeleton-avatar');
      expect(avatar).toHaveClass('rounded-full');
      expect(avatar).toHaveClass('border-2');
    });
  });
});
