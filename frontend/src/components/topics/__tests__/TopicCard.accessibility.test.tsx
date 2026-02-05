import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import TopicCard from '../TopicCard';
import type { Topic } from '../../../types/topic';

// Extend Vitest's expect with jest-axe matchers
expect.extend(toHaveNoViolations);

const mockTopic: Topic = {
  id: 'test-topic-1',
  title: 'Should AI-generated content require disclosure?',
  description:
    'Debate whether content created by AI systems should be clearly labeled to inform consumers.',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-15').toISOString(),
  updatedAt: new Date('2024-01-15').toISOString(),
  participantCount: 42,
  responseCount: 128,
  currentDiversityScore: 7.8,
  tags: [
    { id: 'tech-1', name: 'Technology' },
    { id: 'ethics-1', name: 'Ethics' },
  ],
};

describe('TopicCard Accessibility Tests', () => {
  it('should have no accessibility violations in light mode', async () => {
    const { container } = render(
      <BrowserRouter>
        <TopicCard topic={mockTopic} />
      </BrowserRouter>,
    );

    const results = await axe(container, {
      rules: {
        // Enable color contrast checking
        'color-contrast': { enabled: true },
        // Check for sufficient color contrast (WCAG AA)
        'color-contrast-enhanced': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with ARCHIVED status', async () => {
    const archivedTopic = { ...mockTopic, status: 'ARCHIVED' as const };
    const { container } = render(
      <BrowserRouter>
        <TopicCard topic={archivedTopic} />
      </BrowserRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with SEEDING status', async () => {
    const seedingTopic = { ...mockTopic, status: 'SEEDING' as const };
    const { container } = render(
      <BrowserRouter>
        <TopicCard topic={seedingTopic} />
      </BrowserRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have sufficient contrast for all text elements', async () => {
    const { container } = render(
      <BrowserRouter>
        <TopicCard topic={mockTopic} />
      </BrowserRouter>,
    );

    // Run axe with specific color-contrast rules
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    // Ensure no color contrast violations
    const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
    expect(contrastViolations).toHaveLength(0);
  });

  it('should maintain accessibility when truncating description', async () => {
    const { container } = render(
      <BrowserRouter>
        <TopicCard topic={mockTopic} truncateDescription={true} />
      </BrowserRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible link text', async () => {
    const { container } = render(
      <BrowserRouter>
        <TopicCard topic={mockTopic} />
      </BrowserRouter>,
    );

    const results = await axe(container, {
      rules: {
        'link-name': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should have proper heading structure', async () => {
    const { container } = render(
      <BrowserRouter>
        <TopicCard topic={mockTopic} />
      </BrowserRouter>,
    );

    const results = await axe(container, {
      rules: {
        'heading-order': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', async () => {
    const { container } = render(
      <BrowserRouter>
        <TopicCard topic={mockTopic} />
      </BrowserRouter>,
    );

    const results = await axe(container, {
      rules: {
        'focus-order-semantics': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });
});
