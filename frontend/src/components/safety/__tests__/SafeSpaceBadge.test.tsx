/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafeSpaceBadge } from '../SafeSpaceBadge';
import * as ChildSafetyContextModule from '../../../contexts/ChildSafetyContext';

// Mock the ChildSafetyContext
vi.mock('../../../contexts/ChildSafetyContext', () => ({
  useChildSafety: vi.fn(),
}));

const mockUseChildSafety = vi.mocked(ChildSafetyContextModule.useChildSafety);

describe('SafeSpaceBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should not render when not in child mode', () => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: false,
        uiTheme: 'standard',
        restrictedFeatures: [],
        showPanicButton: false,
        isFeatureRestricted: () => false,
      });

      render(<SafeSpaceBadge />);

      expect(screen.queryByTestId('safe-space-badge')).not.toBeInTheDocument();
    });

    it('should render when in child mode', () => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: true,
        uiTheme: 'child-friendly',
        restrictedFeatures: [],
        showPanicButton: true,
        isFeatureRestricted: () => false,
      });

      render(<SafeSpaceBadge />);

      expect(screen.getByTestId('safe-space-badge')).toBeInTheDocument();
      expect(screen.getByText('Safe Space')).toBeInTheDocument();
    });

    it('should render when forceShow is true even if not in child mode', () => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: false,
        uiTheme: 'standard',
        restrictedFeatures: [],
        showPanicButton: false,
        isFeatureRestricted: () => false,
      });

      render(<SafeSpaceBadge forceShow />);

      expect(screen.getByTestId('safe-space-badge')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    beforeEach(() => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: true,
        uiTheme: 'child-friendly',
        restrictedFeatures: [],
        showPanicButton: true,
        isFeatureRestricted: () => false,
      });
    });

    it('should render inline variant by default', () => {
      render(<SafeSpaceBadge />);

      const badge = screen.getByTestId('safe-space-badge');
      expect(badge).toHaveClass('text-xs');
      expect(screen.getByText('Safe Space')).toBeInTheDocument();
    });

    it('should render floating variant', () => {
      render(<SafeSpaceBadge variant="floating" />);

      const badge = screen.getByTestId('safe-space-badge');
      expect(badge).toHaveClass('text-sm', 'shadow-lg');
      expect(screen.getByText('Safe Space')).toBeInTheDocument();
    });

    it('should render header variant with full text', () => {
      render(<SafeSpaceBadge variant="header" />);

      const badge = screen.getByTestId('safe-space-badge');
      expect(badge).toHaveClass('text-sm');
      expect(screen.getByText('You are in a Safe Space')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: true,
        uiTheme: 'child-friendly',
        restrictedFeatures: [],
        showPanicButton: true,
        isFeatureRestricted: () => false,
      });
    });

    it('should have correct ARIA attributes', () => {
      render(<SafeSpaceBadge />);

      const badge = screen.getByTestId('safe-space-badge');
      expect(badge).toHaveAttribute('role', 'status');
      expect(badge).toHaveAttribute('aria-label', 'Safe space indicator');
    });
  });

  describe('custom className', () => {
    beforeEach(() => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: true,
        uiTheme: 'child-friendly',
        restrictedFeatures: [],
        showPanicButton: true,
        isFeatureRestricted: () => false,
      });
    });

    it('should apply custom className', () => {
      render(<SafeSpaceBadge className="custom-class mt-4" />);

      const badge = screen.getByTestId('safe-space-badge');
      expect(badge).toHaveClass('custom-class', 'mt-4');
    });
  });
});
