import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TopicDetailSkeleton from './TopicDetailSkeleton';

const renderWithRouter = (ui: React.ReactNode) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('TopicDetailSkeleton', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const skeleton = screen.getByTestId('topic-detail-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render main card', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const mainCard = screen.getByTestId('topic-detail-skeleton-main-card');
      expect(mainCard).toBeInTheDocument();
    });

    it('should render title skeleton', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const title = screen.getByTestId('topic-detail-skeleton-title');
      expect(title).toBeInTheDocument();
    });

    it('should render status skeleton', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const status = screen.getByTestId('topic-detail-skeleton-status');
      expect(status).toBeInTheDocument();
    });

    it('should render description skeleton', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const description = screen.getByTestId('topic-detail-skeleton-description');
      expect(description).toBeInTheDocument();
    });

    it('should render stats skeleton', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const stats = screen.getByTestId('topic-detail-skeleton-stats');
      expect(stats).toBeInTheDocument();
    });
  });

  describe('Responses Section', () => {
    it('should show responses section by default', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const responses = screen.getByTestId('topic-detail-skeleton-responses');
      expect(responses).toBeInTheDocument();
    });

    it('should show 3 response skeletons', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const response1 = screen.getByTestId('topic-detail-skeleton-response-1');
      const response2 = screen.getByTestId('topic-detail-skeleton-response-2');
      const response3 = screen.getByTestId('topic-detail-skeleton-response-3');
      expect(response1).toBeInTheDocument();
      expect(response2).toBeInTheDocument();
      expect(response3).toBeInTheDocument();
    });

    it('should hide responses section when showResponses is false', () => {
      renderWithRouter(<TopicDetailSkeleton showResponses={false} />);
      const responses = screen.queryByTestId('topic-detail-skeleton-responses');
      expect(responses).not.toBeInTheDocument();
    });
  });

  describe('Common Ground Section', () => {
    it('should show common ground section by default', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const commonGround = screen.getByTestId('topic-detail-skeleton-common-ground');
      expect(commonGround).toBeInTheDocument();
    });

    it('should hide common ground section when showCommonGround is false', () => {
      renderWithRouter(<TopicDetailSkeleton showCommonGround={false} />);
      const commonGround = screen.queryByTestId('topic-detail-skeleton-common-ground');
      expect(commonGround).not.toBeInTheDocument();
    });
  });

  describe('Stats Grid', () => {
    it('should have 4 stat items', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const stats = screen.getByTestId('topic-detail-skeleton-stats');
      const statItems = stats.querySelectorAll('.bg-gray-50.rounded-lg.p-4');
      expect(statItems).toHaveLength(4);
    });
  });

  describe('Description', () => {
    it('should have 4 lines of description text', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const description = screen.getByTestId('topic-detail-skeleton-description');
      const lines = description.querySelectorAll('[aria-hidden="true"]');
      expect(lines).toHaveLength(4);
    });
  });

  describe('Animation', () => {
    it('should have pulse animation on title', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const title = screen.getByTestId('topic-detail-skeleton-title');
      expect(title).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible loading indicators', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('should have aria-busy on skeleton sections', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const statusElements = screen.getAllByRole('status');
      expect(statusElements[0]).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      renderWithRouter(<TopicDetailSkeleton className="my-custom-class" />);
      const skeleton = screen.getByTestId('topic-detail-skeleton');
      expect(skeleton).toHaveClass('my-custom-class');
    });

    it('should accept custom data-testid', () => {
      renderWithRouter(<TopicDetailSkeleton data-testid="custom-topic-detail" />);
      const skeleton = screen.getByTestId('custom-topic-detail');
      expect(skeleton).toBeInTheDocument();
    });

    it('should have max-w-4xl for consistent width', () => {
      renderWithRouter(<TopicDetailSkeleton />);
      const skeleton = screen.getByTestId('topic-detail-skeleton');
      expect(skeleton).toHaveClass('max-w-4xl');
    });
  });
});
