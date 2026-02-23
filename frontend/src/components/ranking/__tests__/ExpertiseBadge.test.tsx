/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for ExpertiseBadge component
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpertiseBadge from '../ExpertiseBadge';
import type { ExpertiseLevel, TopicExpertise } from '../../../types/ranking';

/**
 * Helper to create a mock TopicExpertise object
 */
const createMockExpertise = (overrides: Partial<TopicExpertise> = {}): TopicExpertise => ({
  userId: 'user-123',
  tagId: 'tag-456',
  tagName: 'Climate Science',
  expertiseScore: 0.5,
  expertiseLevel: 'KNOWLEDGEABLE',
  responseCount: 10,
  progressToNextLevel: 50,
  lastActive: '2025-01-15T10:00:00Z',
  ...overrides,
});

describe('ExpertiseBadge', () => {
  describe('Expertise Level Names', () => {
    it('should render correct name for NOVICE level', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'NOVICE',
        expertiseScore: 0.1,
      });
      render(<ExpertiseBadge expertise={expertise} variant="full" />);
      expect(screen.getByText('Novice')).toBeInTheDocument();
    });

    it('should render correct name for FAMILIAR level', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'FAMILIAR',
        expertiseScore: 0.3,
      });
      render(<ExpertiseBadge expertise={expertise} variant="full" />);
      expect(screen.getByText('Familiar')).toBeInTheDocument();
    });

    it('should render correct name for KNOWLEDGEABLE level', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'KNOWLEDGEABLE',
        expertiseScore: 0.6,
      });
      render(<ExpertiseBadge expertise={expertise} variant="full" />);
      expect(screen.getByText('Knowledgeable')).toBeInTheDocument();
    });

    it('should render correct name for EXPERT level', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'EXPERT',
        expertiseScore: 0.85,
      });
      render(<ExpertiseBadge expertise={expertise} variant="full" />);
      expect(screen.getByText('Expert')).toBeInTheDocument();
    });
  });

  describe('Color Classes', () => {
    it('should apply gray colors for NOVICE level', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'NOVICE',
        expertiseScore: 0.1,
      });
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-gray-100');
      expect(badge).toHaveClass('text-gray-700');
    });

    it('should apply teal colors for FAMILIAR level', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'FAMILIAR',
        expertiseScore: 0.3,
      });
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-teal-100');
      expect(badge).toHaveClass('text-teal-700');
    });

    it('should apply indigo colors for KNOWLEDGEABLE level', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'KNOWLEDGEABLE',
        expertiseScore: 0.6,
      });
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-indigo-100');
      expect(badge).toHaveClass('text-indigo-700');
    });

    it('should apply amber/gold colors for EXPERT level', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'EXPERT',
        expertiseScore: 0.9,
      });
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-amber-100');
      expect(badge).toHaveClass('text-amber-700');
    });
  });

  describe('Tag Name Display', () => {
    it('should show tag name when showTag is true', () => {
      const expertise = createMockExpertise({
        tagName: 'Climate Science',
        expertiseLevel: 'EXPERT',
      });
      render(<ExpertiseBadge expertise={expertise} showTag variant="full" />);
      expect(screen.getByText(/Climate Science/)).toBeInTheDocument();
    });

    it('should not show tag name when showTag is false', () => {
      const expertise = createMockExpertise({
        tagName: 'Climate Science',
        expertiseLevel: 'EXPERT',
      });
      render(<ExpertiseBadge expertise={expertise} showTag={false} variant="full" />);
      expect(screen.queryByText(/Climate Science/)).not.toBeInTheDocument();
    });

    it('should not show tag name by default', () => {
      const expertise = createMockExpertise({
        tagName: 'Climate Science',
        expertiseLevel: 'EXPERT',
      });
      render(<ExpertiseBadge expertise={expertise} variant="full" />);
      expect(screen.queryByText(/Climate Science/)).not.toBeInTheDocument();
    });

    it('should format tag name with level as "Expert in Climate Science"', () => {
      const expertise = createMockExpertise({
        tagName: 'Climate Science',
        expertiseLevel: 'EXPERT',
      });
      render(<ExpertiseBadge expertise={expertise} showTag variant="full" />);
      expect(screen.getByText('Expert in Climate Science')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render icon only in icon variant (default)', () => {
      const expertise = createMockExpertise({ expertiseLevel: 'FAMILIAR' });
      render(<ExpertiseBadge expertise={expertise} variant="icon" />);
      const badge = screen.getByRole('status');
      // Should have SVG icon
      expect(badge.querySelector('svg')).toBeInTheDocument();
      // Should not have text label
      expect(screen.queryByText('Familiar')).not.toBeInTheDocument();
    });

    it('should render icon and text in full variant', () => {
      const expertise = createMockExpertise({ expertiseLevel: 'FAMILIAR' });
      render(<ExpertiseBadge expertise={expertise} variant="full" />);
      const badge = screen.getByRole('status');
      // Should have SVG icon
      expect(badge.querySelector('svg')).toBeInTheDocument();
      // Should have text label
      expect(screen.getByText('Familiar')).toBeInTheDocument();
    });

    it('should default to icon variant', () => {
      const expertise = createMockExpertise({ expertiseLevel: 'KNOWLEDGEABLE' });
      render(<ExpertiseBadge expertise={expertise} />);
      expect(screen.queryByText('Knowledgeable')).not.toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply small size classes', () => {
      const expertise = createMockExpertise();
      render(<ExpertiseBadge expertise={expertise} size="sm" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-5');
    });

    it('should apply medium size classes (default)', () => {
      const expertise = createMockExpertise();
      render(<ExpertiseBadge expertise={expertise} size="md" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-6');
    });

    it('should apply large size classes', () => {
      const expertise = createMockExpertise();
      render(<ExpertiseBadge expertise={expertise} size="lg" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-7');
    });

    it('should default to medium size', () => {
      const expertise = createMockExpertise();
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-6');
    });
  });

  describe('Dark Mode Classes', () => {
    it('should include dark mode background classes', () => {
      const expertise = createMockExpertise({ expertiseLevel: 'FAMILIAR' });
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      expect(badge.className).toMatch(/dark:bg-teal-900/);
    });

    it('should include dark mode text classes', () => {
      const expertise = createMockExpertise({ expertiseLevel: 'KNOWLEDGEABLE' });
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      expect(badge.className).toMatch(/dark:text-indigo-400/);
    });

    it('should include dark mode border classes', () => {
      const expertise = createMockExpertise({ expertiseLevel: 'EXPERT' });
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      expect(badge.className).toMatch(/dark:border-amber-700/);
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip by default', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'EXPERT',
        tagName: 'Climate Science',
      });
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('title', 'Expert in Climate Science');
    });

    it('should hide tooltip when showTooltip is false', () => {
      const expertise = createMockExpertise({ expertiseLevel: 'EXPERT' });
      render(<ExpertiseBadge expertise={expertise} showTooltip={false} />);
      const badge = screen.getByRole('status');
      expect(badge).not.toHaveAttribute('title');
    });

    it('should show level and tag name in tooltip for icon variant', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'KNOWLEDGEABLE',
        tagName: 'Economics',
      });
      render(<ExpertiseBadge expertise={expertise} variant="icon" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('title', 'Knowledgeable in Economics');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      const expertise = createMockExpertise();
      render(<ExpertiseBadge expertise={expertise} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have appropriate aria-label', () => {
      const expertise = createMockExpertise({
        expertiseLevel: 'KNOWLEDGEABLE',
        tagName: 'Climate Science',
      });
      render(<ExpertiseBadge expertise={expertise} />);
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Expertise: Knowledgeable in Climate Science',
      );
    });

    it('should mark icon as aria-hidden', () => {
      const expertise = createMockExpertise();
      render(<ExpertiseBadge expertise={expertise} />);
      const badge = screen.getByRole('status');
      const svg = badge.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const expertise = createMockExpertise();
      render(<ExpertiseBadge expertise={expertise} className="custom-class" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const expertise = createMockExpertise({ expertiseLevel: 'NOVICE' });
      render(<ExpertiseBadge expertise={expertise} className="my-custom-style" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('my-custom-style');
      expect(badge).toHaveClass('bg-gray-100');
    });
  });

  describe('Icons', () => {
    const levels: ExpertiseLevel[] = ['NOVICE', 'FAMILIAR', 'KNOWLEDGEABLE', 'EXPERT'];

    levels.forEach((level) => {
      it(`should render an icon for ${level} level`, () => {
        const expertise = createMockExpertise({ expertiseLevel: level });
        render(<ExpertiseBadge expertise={expertise} />);
        const badge = screen.getByRole('status');
        expect(badge.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render different icons for different levels', () => {
      const noviceExpertise = createMockExpertise({ expertiseLevel: 'NOVICE' });
      const expertExpertise = createMockExpertise({ expertiseLevel: 'EXPERT' });

      const { rerender, container } = render(<ExpertiseBadge expertise={noviceExpertise} />);
      const noviceIcon = container.querySelector('svg')?.innerHTML;

      rerender(<ExpertiseBadge expertise={expertExpertise} />);
      const expertIcon = container.querySelector('svg')?.innerHTML;

      // Icons should be different for different levels
      expect(noviceIcon).not.toBe(expertIcon);
    });
  });
});
