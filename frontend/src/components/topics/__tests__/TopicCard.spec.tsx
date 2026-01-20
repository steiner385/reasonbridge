/**
 * Unit tests for TopicCard component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TopicCard from '../TopicCard';
import type { Topic } from '../../../types/topic';

const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: 'topic-1',
  title: 'Test Topic',
  description: 'This is a test topic description for discussion.',
  creatorId: 'user-1',
  status: 'ACTIVE',
  evidenceStandards: 'STANDARD',
  minimumDiversityScore: 0.5,
  currentDiversityScore: 0.7,
  participantCount: 15,
  responseCount: 42,
  crossCuttingThemes: ['theme1', 'theme2'],
  createdAt: '2026-01-01T00:00:00Z',
  activatedAt: '2026-01-02T00:00:00Z',
  archivedAt: null,
  tags: [
    { id: 'tag-1', name: 'Politics', slug: 'politics' },
    { id: 'tag-2', name: 'Science', slug: 'science' },
  ],
  ...overrides,
});

// Wrapper component to provide router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('TopicCard', () => {
  describe('Rendering', () => {
    it('should render topic title', () => {
      const topic = createMockTopic({ title: 'Climate Change Discussion' });
      renderWithRouter(<TopicCard topic={topic} />);
      expect(screen.getByText('Climate Change Discussion')).toBeInTheDocument();
    });

    it('should render topic description', () => {
      const topic = createMockTopic({ description: 'A detailed description' });
      renderWithRouter(<TopicCard topic={topic} />);
      expect(screen.getByText('A detailed description')).toBeInTheDocument();
    });

    it('should render participant count', () => {
      const topic = createMockTopic({ participantCount: 25 });
      renderWithRouter(<TopicCard topic={topic} />);
      expect(screen.getByText('25 participants')).toBeInTheDocument();
    });

    it('should render response count', () => {
      const topic = createMockTopic({ responseCount: 100 });
      renderWithRouter(<TopicCard topic={topic} />);
      expect(screen.getByText('100 responses')).toBeInTheDocument();
    });

    it('should render creation date', () => {
      const topic = createMockTopic({ createdAt: '2026-01-15T00:00:00Z' });
      renderWithRouter(<TopicCard topic={topic} />);
      // Date format depends on locale, just check that a date is rendered
      expect(screen.getByText(/1\/15\/2026|15\/1\/2026|2026/)).toBeInTheDocument();
    });

    it('should render "View Discussion" link', () => {
      const topic = createMockTopic({ id: 'topic-123' });
      renderWithRouter(<TopicCard topic={topic} />);
      const link = screen.getByRole('link', { name: /View Discussion/i });
      expect(link).toHaveAttribute('href', '/topics/topic-123');
    });
  });

  describe('Status Badge', () => {
    it('should show ACTIVE status with green styling', () => {
      const topic = createMockTopic({ status: 'ACTIVE' });
      renderWithRouter(<TopicCard topic={topic} />);
      const statusBadge = screen.getByText('ACTIVE');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-700');
    });

    it('should show SEEDING status with yellow styling', () => {
      const topic = createMockTopic({ status: 'SEEDING' });
      renderWithRouter(<TopicCard topic={topic} />);
      const statusBadge = screen.getByText('SEEDING');
      expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-700');
    });

    it('should show ARCHIVED status with gray styling', () => {
      const topic = createMockTopic({ status: 'ARCHIVED' });
      renderWithRouter(<TopicCard topic={topic} />);
      const statusBadge = screen.getByText('ARCHIVED');
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-700');
    });
  });

  describe('Tags', () => {
    it('should render tags with hashtag prefix', () => {
      const topic = createMockTopic({
        tags: [
          { id: 'tag-1', name: 'Politics', slug: 'politics' },
          { id: 'tag-2', name: 'Science', slug: 'science' },
        ],
      });
      renderWithRouter(<TopicCard topic={topic} />);
      expect(screen.getByText('#Politics')).toBeInTheDocument();
      expect(screen.getByText('#Science')).toBeInTheDocument();
    });

    it('should not render tags section when no tags', () => {
      const topic = createMockTopic({ tags: [] });
      renderWithRouter(<TopicCard topic={topic} />);
      expect(screen.queryByText('#')).not.toBeInTheDocument();
    });

    it('should not render tags section when tags is undefined', () => {
      const topic = createMockTopic({ tags: undefined });
      renderWithRouter(<TopicCard topic={topic} />);
      expect(screen.queryByText('#')).not.toBeInTheDocument();
    });
  });

  describe('Diversity Score', () => {
    it('should render diversity score when present', () => {
      const topic = createMockTopic({ currentDiversityScore: 0.75 });
      renderWithRouter(<TopicCard topic={topic} />);
      expect(screen.getByText('Diversity: 0.8')).toBeInTheDocument();
    });

    it('should not render diversity score when null', () => {
      const topic = createMockTopic({ currentDiversityScore: null });
      renderWithRouter(<TopicCard topic={topic} />);
      expect(screen.queryByText(/Diversity:/)).not.toBeInTheDocument();
    });
  });

  describe('Description Truncation', () => {
    it('should truncate description by default', () => {
      const topic = createMockTopic({
        description: 'A very long description that should be truncated',
      });
      renderWithRouter(<TopicCard topic={topic} />);
      const description = screen.getByText('A very long description that should be truncated');
      expect(description).toHaveClass('line-clamp-2');
    });

    it('should not truncate description when truncateDescription is false', () => {
      const topic = createMockTopic({
        description: 'A very long description',
      });
      renderWithRouter(<TopicCard topic={topic} truncateDescription={false} />);
      const description = screen.getByText('A very long description');
      expect(description).not.toHaveClass('line-clamp-2');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when card is clicked', async () => {
      const onClick = vi.fn();
      const topic = createMockTopic();
      renderWithRouter(<TopicCard topic={topic} onClick={onClick} />);

      // Find the card element (it's the div with the data-testid from Card)
      const cardContent = screen.getByText(topic.title).closest('[class*="rounded-xl"]');
      await userEvent.click(cardContent!);

      expect(onClick).toHaveBeenCalled();
    });

    it('should be clickable when onClick is provided', () => {
      const onClick = vi.fn();
      const topic = createMockTopic();
      const { container } = renderWithRouter(<TopicCard topic={topic} onClick={onClick} />);

      // The Card should have cursor-pointer class when clickable
      const card = container.querySelector('.cursor-pointer');
      expect(card).toBeInTheDocument();
    });

    it('should not be clickable when onClick is not provided', () => {
      const topic = createMockTopic();
      const { container } = renderWithRouter(<TopicCard topic={topic} />);

      // The Card should not have cursor-pointer class
      const card = container.querySelector('.cursor-pointer');
      expect(card).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to card', () => {
      const topic = createMockTopic();
      const { container } = renderWithRouter(
        <TopicCard topic={topic} className="custom-card-class" />,
      );
      expect(container.querySelector('.custom-card-class')).toBeInTheDocument();
    });
  });

  describe('Hoverable State', () => {
    it('should have hover effects', () => {
      const topic = createMockTopic();
      const { container } = renderWithRouter(<TopicCard topic={topic} />);
      // The Card component has hoverable prop set, so it should have hover classes
      const card = container.querySelector('.hover\\:shadow-xl');
      expect(card).toBeInTheDocument();
    });
  });
});
