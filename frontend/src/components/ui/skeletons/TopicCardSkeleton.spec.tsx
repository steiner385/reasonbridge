import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TopicCardSkeleton from './TopicCardSkeleton';

// Wrap component in Router since Card may use Link
const renderWithRouter = (ui: React.ReactNode) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('TopicCardSkeleton', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const skeleton = screen.getByTestId('topic-card-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render title skeleton', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const title = screen.getByTestId('topic-card-skeleton-title');
      expect(title).toBeInTheDocument();
    });

    it('should render status skeleton', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const status = screen.getByTestId('topic-card-skeleton-status');
      expect(status).toBeInTheDocument();
    });

    it('should render date skeleton', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const date = screen.getByTestId('topic-card-skeleton-date');
      expect(date).toBeInTheDocument();
    });

    it('should render description skeleton', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const description = screen.getByTestId('topic-card-skeleton-description');
      expect(description).toBeInTheDocument();
    });

    it('should render link skeleton', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const link = screen.getByTestId('topic-card-skeleton-link');
      expect(link).toBeInTheDocument();
    });
  });

  describe('Tags Section', () => {
    it('should show tags section by default', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const skeleton = screen.getByTestId('topic-card-skeleton');
      // Tags section should have 3 tag skeletons
      const tagSkeletons = skeleton.querySelectorAll('.flex.flex-wrap.gap-2.mb-4 > div');
      expect(tagSkeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('should hide tags section when showTags is false', () => {
      renderWithRouter(<TopicCardSkeleton showTags={false} />);
      const skeleton = screen.getByTestId('topic-card-skeleton');
      // Tags section should not be present
      const tagSection = skeleton.querySelector('.flex.flex-wrap.gap-2.mb-4');
      expect(tagSection).toBeNull();
    });
  });

  describe('Layout Matching', () => {
    it('should have title width of 75%', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const title = screen.getByTestId('topic-card-skeleton-title');
      expect(title).toHaveStyle({ width: '75%' });
    });

    it('should have description with 2 lines', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const description = screen.getByTestId('topic-card-skeleton-description');
      const lines = description.querySelectorAll('[aria-hidden="true"]');
      expect(lines).toHaveLength(2);
    });

    it('should render stats row with 3 stat items', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const skeleton = screen.getByTestId('topic-card-skeleton');
      // Stats row has 3 items (participants, responses, diversity)
      const statsRow = skeleton.querySelector('.flex.flex-wrap.gap-4.mb-4');
      expect(statsRow).toBeInTheDocument();
      const statItems = statsRow?.querySelectorAll('.flex.items-center.gap-1');
      expect(statItems?.length).toBe(3);
    });
  });

  describe('Animation', () => {
    it('should have pulse animation on skeleton elements', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const title = screen.getByTestId('topic-card-skeleton-title');
      expect(title).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible loading indicator', () => {
      renderWithRouter(<TopicCardSkeleton />);
      // The skeleton should have at least one element with role="status"
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('should have aria-busy attribute', () => {
      renderWithRouter(<TopicCardSkeleton />);
      const statusElements = screen.getAllByRole('status');
      expect(statusElements[0]).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      renderWithRouter(<TopicCardSkeleton className="my-custom-class" />);
      const skeleton = screen.getByTestId('topic-card-skeleton');
      expect(skeleton).toHaveClass('my-custom-class');
    });

    it('should accept custom data-testid', () => {
      renderWithRouter(<TopicCardSkeleton data-testid="custom-skeleton" />);
      const skeleton = screen.getByTestId('custom-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });
});
