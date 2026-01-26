import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResponseSkeleton from './ResponseSkeleton';

const renderWithRouter = (ui: React.ReactNode) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ResponseSkeleton', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      renderWithRouter(<ResponseSkeleton />);
      const skeleton = screen.getByTestId('response-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render avatar skeleton by default', () => {
      renderWithRouter(<ResponseSkeleton />);
      const avatar = screen.getByTestId('response-skeleton-avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('should render author skeleton', () => {
      renderWithRouter(<ResponseSkeleton />);
      const author = screen.getByTestId('response-skeleton-author');
      expect(author).toBeInTheDocument();
    });

    it('should render timestamp skeleton', () => {
      renderWithRouter(<ResponseSkeleton />);
      const timestamp = screen.getByTestId('response-skeleton-timestamp');
      expect(timestamp).toBeInTheDocument();
    });

    it('should render content skeleton', () => {
      renderWithRouter(<ResponseSkeleton />);
      const content = screen.getByTestId('response-skeleton-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Avatar Visibility', () => {
    it('should show avatar by default', () => {
      renderWithRouter(<ResponseSkeleton />);
      const avatar = screen.getByTestId('response-skeleton-avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('should hide avatar when showAvatar is false', () => {
      renderWithRouter(<ResponseSkeleton showAvatar={false} />);
      const avatar = screen.queryByTestId('response-skeleton-avatar');
      expect(avatar).not.toBeInTheDocument();
    });
  });

  describe('Content Structure', () => {
    it('should have 3 lines of text content', () => {
      renderWithRouter(<ResponseSkeleton />);
      const content = screen.getByTestId('response-skeleton-content');
      const lines = content.querySelectorAll('[aria-hidden="true"]');
      expect(lines).toHaveLength(3);
    });

    it('should have action buttons row', () => {
      renderWithRouter(<ResponseSkeleton />);
      const skeleton = screen.getByTestId('response-skeleton');
      // Should have 3 action button skeletons
      const actionButtons = skeleton.querySelectorAll('.flex.items-center.gap-4.mt-3 > div');
      expect(actionButtons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Animation', () => {
    it('should have pulse animation on avatar', () => {
      renderWithRouter(<ResponseSkeleton />);
      const avatar = screen.getByTestId('response-skeleton-avatar');
      expect(avatar).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible loading indicators', () => {
      renderWithRouter(<ResponseSkeleton />);
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      renderWithRouter(<ResponseSkeleton className="my-custom-class" />);
      const skeleton = screen.getByTestId('response-skeleton');
      expect(skeleton).toHaveClass('my-custom-class');
    });

    it('should accept custom data-testid', () => {
      renderWithRouter(<ResponseSkeleton data-testid="custom-response" />);
      const skeleton = screen.getByTestId('custom-response');
      expect(skeleton).toBeInTheDocument();
    });
  });
});
