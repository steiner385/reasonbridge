/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for TierGateBanner component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TierGateBanner from '../TierGateBanner';
import type { TierLevel, ExpertiseLevel } from '../../../types/ranking';

// Helper to render component with Router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('TierGateBanner', () => {
  describe('Tier Restriction', () => {
    it('should show restriction message for tier requirement', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
        />,
      );

      expect(screen.getByText(/this topic requires/i)).toBeInTheDocument();
      expect(screen.getByText(/tier or higher/i)).toBeInTheDocument();
    });

    it('should show required tier badge', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
        />,
      );

      // Should display the required tier name
      expect(screen.getByText('Trusted')).toBeInTheDocument();
    });

    it('should show users current tier badge', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
        />,
      );

      // Should display current tier message
      expect(screen.getByText(/your current tier/i)).toBeInTheDocument();
      expect(screen.getByText('Contributor')).toBeInTheDocument();
    });

    it('should show link to improve tier', () => {
      renderWithRouter(
        <TierGateBanner restrictionType="tier" requiredLevel="LEADER" currentLevel="NEWCOMER" />,
      );

      const improveLink = screen.getByRole('link', { name: /improve your tier/i });
      expect(improveLink).toBeInTheDocument();
      expect(improveLink).toHaveAttribute('href', '/ranking');
    });
  });

  describe('Expertise Restriction', () => {
    it('should show restriction message for expertise requirement', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="expertise"
          requiredLevel="EXPERT"
          currentLevel="FAMILIAR"
          tagName="Climate Science"
        />,
      );

      expect(screen.getByText(/this topic requires/i)).toBeInTheDocument();
      expect(screen.getByText(/level expertise/i)).toBeInTheDocument();
    });

    it('should show tag name for expertise restriction', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="expertise"
          requiredLevel="KNOWLEDGEABLE"
          currentLevel="NOVICE"
          tagName="Machine Learning"
        />,
      );

      expect(screen.getByText(/machine learning/i)).toBeInTheDocument();
    });

    it('should show users current expertise level', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="expertise"
          requiredLevel="EXPERT"
          currentLevel="FAMILIAR"
          tagName="Climate Science"
        />,
      );

      expect(screen.getByText(/your current level/i)).toBeInTheDocument();
      expect(screen.getByText('Familiar')).toBeInTheDocument();
    });

    it('should show link to build expertise', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="expertise"
          requiredLevel="EXPERT"
          currentLevel="NOVICE"
          tagName="Climate Science"
        />,
      );

      const buildLink = screen.getByRole('link', { name: /build expertise/i });
      expect(buildLink).toBeInTheDocument();
      expect(buildLink).toHaveAttribute('href', '/ranking');
    });
  });

  describe('Provisional Access', () => {
    it('should show Request Access button when provisional access is allowed', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
          allowProvisionalAccess={true}
        />,
      );

      expect(screen.getByRole('button', { name: /request access/i })).toBeInTheDocument();
    });

    it('should hide Request Access button when provisional access is not allowed', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
          allowProvisionalAccess={false}
        />,
      );

      expect(screen.queryByRole('button', { name: /request access/i })).not.toBeInTheDocument();
    });

    it('should not show Request Access button by default', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
        />,
      );

      expect(screen.queryByRole('button', { name: /request access/i })).not.toBeInTheDocument();
    });

    it('should call onRequestAccess when Request Access button is clicked', () => {
      const onRequestAccess = vi.fn();

      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
          allowProvisionalAccess={true}
          onRequestAccess={onRequestAccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /request access/i }));
      expect(onRequestAccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dark Mode Support', () => {
    it('should include dark mode background classes for tier restriction', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
        />,
      );

      const banner = screen.getByRole('alert');
      expect(banner.className).toMatch(/dark:bg-/);
    });

    it('should include dark mode text classes', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
        />,
      );

      const banner = screen.getByRole('alert');
      expect(banner.className).toMatch(/dark:text-/);
    });

    it('should include dark mode border classes', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
        />,
      );

      const banner = screen.getByRole('alert');
      expect(banner.className).toMatch(/dark:border-/);
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for the banner', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
        />,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have warning icon for visual indication', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
        />,
      );

      const banner = screen.getByRole('alert');
      const icon = banner.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
          className="custom-class"
        />,
      );

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      renderWithRouter(
        <TierGateBanner
          restrictionType="tier"
          requiredLevel="TRUSTED"
          currentLevel="CONTRIBUTOR"
          className="my-custom-style"
        />,
      );

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('my-custom-style');
      // Should also have default styling classes
      expect(banner).toHaveClass('rounded-lg');
    });
  });

  describe('All Tier Levels', () => {
    const tierLevels: TierLevel[] = ['NEWCOMER', 'CONTRIBUTOR', 'TRUSTED', 'LEADER', 'EXPERT'];

    tierLevels.forEach((requiredTier) => {
      it(`should display ${requiredTier} tier correctly as required`, () => {
        renderWithRouter(
          <TierGateBanner
            restrictionType="tier"
            requiredLevel={requiredTier}
            currentLevel="NEWCOMER"
          />,
        );

        const banner = screen.getByRole('alert');
        expect(banner).toBeInTheDocument();
      });
    });
  });

  describe('All Expertise Levels', () => {
    const expertiseLevels: ExpertiseLevel[] = ['NOVICE', 'FAMILIAR', 'KNOWLEDGEABLE', 'EXPERT'];

    expertiseLevels.forEach((requiredLevel) => {
      it(`should display ${requiredLevel} expertise correctly as required`, () => {
        renderWithRouter(
          <TierGateBanner
            restrictionType="expertise"
            requiredLevel={requiredLevel}
            currentLevel="NOVICE"
            tagName="Test Topic"
          />,
        );

        const banner = screen.getByRole('alert');
        expect(banner).toBeInTheDocument();
      });
    });
  });
});
