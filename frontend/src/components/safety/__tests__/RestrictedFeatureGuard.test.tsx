/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RestrictedFeatureGuard } from '../RestrictedFeatureGuard';
import * as ChildSafetyContextModule from '../../../contexts/ChildSafetyContext';

// Mock the ChildSafetyContext
vi.mock('../../../contexts/ChildSafetyContext', () => ({
  useChildSafety: vi.fn(),
}));

const mockUseChildSafety = vi.mocked(ChildSafetyContextModule.useChildSafety);

describe('RestrictedFeatureGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when feature is allowed', () => {
    beforeEach(() => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: false,
        uiTheme: 'standard',
        restrictedFeatures: [],
        showPanicButton: false,
        isFeatureRestricted: () => false,
      });
    });

    it('should render children when feature is not restricted', () => {
      render(
        <RestrictedFeatureGuard feature="DM">
          <button>Send Message</button>
        </RestrictedFeatureGuard>,
      );

      expect(screen.getByRole('button', { name: 'Send Message' })).toBeInTheDocument();
    });
  });

  describe('when feature is restricted', () => {
    beforeEach(() => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: true,
        uiTheme: 'child-friendly',
        restrictedFeatures: ['DM', 'USER_SEARCH', 'FILE_UPLOAD'],
        showPanicButton: true,
        isFeatureRestricted: (feature) => ['DM', 'USER_SEARCH', 'FILE_UPLOAD'].includes(feature),
      });
    });

    it('should hide content by default (fallback="hide")', () => {
      render(
        <RestrictedFeatureGuard feature="DM">
          <button>Send Message</button>
        </RestrictedFeatureGuard>,
      );

      expect(screen.queryByRole('button', { name: 'Send Message' })).not.toBeInTheDocument();
    });

    it('should show disabled content when fallback="disabled"', () => {
      render(
        <RestrictedFeatureGuard feature="DM" fallback="disabled">
          <button>Send Message</button>
        </RestrictedFeatureGuard>,
      );

      const container = screen.getByTestId('restricted-DM-disabled');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('opacity-50', 'pointer-events-none');
      expect(screen.getByRole('button', { name: 'Send Message' })).toBeInTheDocument();
    });

    it('should show message when fallback="message"', () => {
      render(
        <RestrictedFeatureGuard feature="DM" fallback="message">
          <button>Send Message</button>
        </RestrictedFeatureGuard>,
      );

      expect(screen.getByTestId('restricted-DM-message')).toBeInTheDocument();
      expect(
        screen.getByText('Private messaging is not available for your account.'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send Message' })).not.toBeInTheDocument();
    });

    it('should show custom restricted message when provided', () => {
      render(
        <RestrictedFeatureGuard
          feature="FILE_UPLOAD"
          fallback="message"
          restrictedMessage="File uploads are disabled for safety."
        >
          <button>Upload File</button>
        </RestrictedFeatureGuard>,
      );

      expect(screen.getByText('File uploads are disabled for safety.')).toBeInTheDocument();
    });

    it('should show helper text in child mode', () => {
      render(
        <RestrictedFeatureGuard feature="DM" fallback="message">
          <button>Send Message</button>
        </RestrictedFeatureGuard>,
      );

      expect(
        screen.getByText('Ask a parent or guardian if you need access to this feature.'),
      ).toBeInTheDocument();
    });

    it('should render custom fallback ReactNode', () => {
      render(
        <RestrictedFeatureGuard
          feature="DM"
          fallback={<div data-testid="custom-fallback">Custom Content</div>}
        >
          <button>Send Message</button>
        </RestrictedFeatureGuard>,
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send Message' })).not.toBeInTheDocument();
    });
  });

  describe('different restricted features', () => {
    beforeEach(() => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: true,
        uiTheme: 'child-friendly',
        restrictedFeatures: [
          'DM',
          'USER_SEARCH',
          'PROFILE_EDIT',
          'SOCIAL_LINKS',
          'EXTERNAL_LINKS',
          'FILE_UPLOAD',
        ],
        showPanicButton: true,
        isFeatureRestricted: () => true,
      });
    });

    it('should show correct message for USER_SEARCH', () => {
      render(
        <RestrictedFeatureGuard feature="USER_SEARCH" fallback="message">
          <input placeholder="Search users" />
        </RestrictedFeatureGuard>,
      );

      expect(
        screen.getByText('User search is not available for your account.'),
      ).toBeInTheDocument();
    });

    it('should show correct message for FILE_UPLOAD', () => {
      render(
        <RestrictedFeatureGuard feature="FILE_UPLOAD" fallback="message">
          <button>Upload</button>
        </RestrictedFeatureGuard>,
      );

      expect(
        screen.getByText('File uploads are not available for your account.'),
      ).toBeInTheDocument();
    });

    it('should show correct message for EXTERNAL_LINKS', () => {
      render(
        <RestrictedFeatureGuard feature="EXTERNAL_LINKS" fallback="message">
          <a href="https://example.com">External Link</a>
        </RestrictedFeatureGuard>,
      );

      expect(
        screen.getByText('Posting external links is not available for your account.'),
      ).toBeInTheDocument();
    });
  });
});
