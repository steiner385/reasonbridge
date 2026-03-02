/**
 * Unit tests for TierBadge component
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TierBadge from '../TierBadge';
import type { TierLevel } from '../../../types/ranking';

describe('TierBadge', () => {
  describe('Tier Names', () => {
    it('should render correct name for NEWCOMER tier', () => {
      render(<TierBadge tier="NEWCOMER" variant="full" />);
      expect(screen.getByText('Newcomer')).toBeInTheDocument();
    });

    it('should render correct name for CONTRIBUTOR tier', () => {
      render(<TierBadge tier="CONTRIBUTOR" variant="full" />);
      expect(screen.getByText('Contributor')).toBeInTheDocument();
    });

    it('should render correct name for TRUSTED tier', () => {
      render(<TierBadge tier="TRUSTED" variant="full" />);
      expect(screen.getByText('Trusted')).toBeInTheDocument();
    });

    it('should render correct name for LEADER tier', () => {
      render(<TierBadge tier="LEADER" variant="full" />);
      expect(screen.getByText('Leader')).toBeInTheDocument();
    });

    it('should render correct name for EXPERT tier', () => {
      render(<TierBadge tier="EXPERT" variant="full" />);
      expect(screen.getByText('Expert')).toBeInTheDocument();
    });
  });

  describe('Color Classes', () => {
    it('should apply gray colors for NEWCOMER tier', () => {
      render(<TierBadge tier="NEWCOMER" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-gray-100');
      expect(badge).toHaveClass('text-gray-700');
    });

    it('should apply green colors for CONTRIBUTOR tier', () => {
      render(<TierBadge tier="CONTRIBUTOR" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-700');
    });

    it('should apply blue colors for TRUSTED tier', () => {
      render(<TierBadge tier="TRUSTED" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveClass('text-blue-700');
    });

    it('should apply purple colors for LEADER tier', () => {
      render(<TierBadge tier="LEADER" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-purple-100');
      expect(badge).toHaveClass('text-purple-700');
    });

    it('should apply amber/gold colors for EXPERT tier', () => {
      render(<TierBadge tier="EXPERT" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-amber-100');
      expect(badge).toHaveClass('text-amber-700');
    });
  });

  describe('Variants', () => {
    it('should render icon only in icon variant (default)', () => {
      render(<TierBadge tier="CONTRIBUTOR" variant="icon" />);
      const badge = screen.getByRole('status');
      // Should have SVG icon
      expect(badge.querySelector('svg')).toBeInTheDocument();
      // Should not have text label
      expect(screen.queryByText('Contributor')).not.toBeInTheDocument();
    });

    it('should render icon and text in full variant', () => {
      render(<TierBadge tier="CONTRIBUTOR" variant="full" />);
      const badge = screen.getByRole('status');
      // Should have SVG icon
      expect(badge.querySelector('svg')).toBeInTheDocument();
      // Should have text label
      expect(screen.getByText('Contributor')).toBeInTheDocument();
    });

    it('should default to icon variant', () => {
      render(<TierBadge tier="TRUSTED" />);
      expect(screen.queryByText('Trusted')).not.toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply small size classes', () => {
      render(<TierBadge tier="NEWCOMER" size="sm" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-5');
    });

    it('should apply medium size classes (default)', () => {
      render(<TierBadge tier="NEWCOMER" size="md" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-6');
    });

    it('should apply large size classes', () => {
      render(<TierBadge tier="NEWCOMER" size="lg" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-7');
    });

    it('should default to medium size', () => {
      render(<TierBadge tier="TRUSTED" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('h-6');
    });
  });

  describe('Dark Mode Classes', () => {
    it('should include dark mode background classes', () => {
      render(<TierBadge tier="CONTRIBUTOR" />);
      const badge = screen.getByRole('status');
      expect(badge.className).toMatch(/dark:bg-green-900/);
    });

    it('should include dark mode text classes', () => {
      render(<TierBadge tier="TRUSTED" />);
      const badge = screen.getByRole('status');
      expect(badge.className).toMatch(/dark:text-blue-400/);
    });

    it('should include dark mode border classes', () => {
      render(<TierBadge tier="LEADER" />);
      const badge = screen.getByRole('status');
      expect(badge.className).toMatch(/dark:border-purple-700/);
    });
  });

  describe('Tooltip', () => {
    it('should render with tooltip wrapper by default', () => {
      render(<TierBadge tier="EXPERT" />);
      // Badge should be rendered inside a tooltip trigger
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      // The badge should have the data-tour attribute for guided tours
      expect(badge).toHaveAttribute('data-tour', 'tier-badge');
    });

    it('should render badge without tooltip when showTooltip is false', () => {
      render(<TierBadge tier="EXPERT" showTooltip={false} />);
      const badge = screen.getByRole('status');
      // Badge should still render and have aria-label
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', 'User tier: Expert');
    });

    it('should render icon variant with tooltip', () => {
      render(<TierBadge tier="LEADER" variant="icon" />);
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      // Tooltip wrapper should be present (badge has data-tour attribute)
      expect(badge).toHaveAttribute('data-tour', 'tier-badge');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<TierBadge tier="NEWCOMER" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have appropriate aria-label', () => {
      render(<TierBadge tier="TRUSTED" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'User tier: Trusted');
    });

    it('should mark icon as aria-hidden', () => {
      render(<TierBadge tier="CONTRIBUTOR" />);
      const badge = screen.getByRole('status');
      const svg = badge.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<TierBadge tier="EXPERT" className="custom-class" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      render(<TierBadge tier="NEWCOMER" className="my-custom-style" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('my-custom-style');
      expect(badge).toHaveClass('bg-gray-100');
    });
  });

  describe('Icons', () => {
    const tiers: TierLevel[] = ['NEWCOMER', 'CONTRIBUTOR', 'TRUSTED', 'LEADER', 'EXPERT'];

    tiers.forEach((tier) => {
      it(`should render an icon for ${tier} tier`, () => {
        render(<TierBadge tier={tier} />);
        const badge = screen.getByRole('status');
        expect(badge.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render different icons for different tiers', () => {
      const { rerender, container } = render(<TierBadge tier="NEWCOMER" />);
      const newcomerIcon = container.querySelector('svg')?.innerHTML;

      rerender(<TierBadge tier="EXPERT" />);
      const expertIcon = container.querySelector('svg')?.innerHTML;

      // Icons should be different for different tiers
      expect(newcomerIcon).not.toBe(expertIcon);
    });
  });
});
