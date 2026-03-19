/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for BookmarkButton component
 *
 * Tests the bookmark toggle button for responses including:
 * - Rendering in bookmarked and unbookmarked states
 * - Click handling with auth requirement
 * - Accessibility attributes
 * - Size variants and styling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useBookmarkStatus } from '../../hooks/useBookmarks';
import BookmarkButton from './BookmarkButton';

// Mock useBookmarkStatus hook
const mockToggleBookmark = vi.fn();
vi.mock('../../hooks/useBookmarks', () => ({
  useBookmarkStatus: vi.fn(() => ({
    isBookmarked: false,
    isPending: false,
    toggleBookmark: mockToggleBookmark,
  })),
}));

// Cast the mocked module to control return values
const mockUseBookmarkStatus = useBookmarkStatus as ReturnType<typeof vi.fn>;

// Mock useRequireAuth hook
const mockRequireAuth = vi.fn();
vi.mock('../../hooks/useRequireAuth', () => ({
  useRequireAuth: () => ({
    requireAuth: mockRequireAuth,
  }),
}));

// Mock useToast hook
const mockToastError = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    error: mockToastError,
  }),
}));

// Mock Tooltip component
vi.mock('../ui/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div data-tooltip={content}>{children}</div>
  ),
}));

describe('BookmarkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not bookmarked, not pending
    mockUseBookmarkStatus.mockReturnValue({
      isBookmarked: false,
      isPending: false,
      toggleBookmark: mockToggleBookmark,
    });
    // Default: execute auth callback immediately
    mockRequireAuth.mockImplementation((callback: () => void) => callback());
  });

  describe('rendering', () => {
    it('should render bookmark button', () => {
      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button).toBeInTheDocument();
    });

    it('should show outline icon when not bookmarked', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: false,
        isPending: false,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button).toHaveAttribute('data-bookmarked', 'false');
      // Check for outline icon (has stroke attribute)
      const svg = button.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'none');
    });

    it('should show filled icon when bookmarked', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: true,
        isPending: false,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button).toHaveAttribute('data-bookmarked', 'true');
      // Check for filled icon (has fill="currentColor")
      const svg = button.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'currentColor');
    });
  });

  describe('click handling', () => {
    it('should require auth before toggling bookmark', () => {
      render(<BookmarkButton responseId="response-1" />);

      fireEvent.click(screen.getByTestId('bookmark-button'));

      expect(mockRequireAuth).toHaveBeenCalled();
    });

    it('should call toggleBookmark when clicked and authed', () => {
      render(<BookmarkButton responseId="response-1" />);

      fireEvent.click(screen.getByTestId('bookmark-button'));

      expect(mockToggleBookmark).toHaveBeenCalled();
    });

    it('should not call toggleBookmark when disabled', () => {
      render(<BookmarkButton responseId="response-1" disabled />);

      const button = screen.getByTestId('bookmark-button');
      expect(button).toBeDisabled();

      fireEvent.click(button);

      // Even if auth passes, disabled should prevent toggle
      expect(mockToggleBookmark).not.toHaveBeenCalled();
    });

    it('should not call toggleBookmark when pending', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: false,
        isPending: true,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label for add bookmark', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: false,
        isPending: false,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button).toHaveAttribute('aria-label', 'Add bookmark');
    });

    it('should have aria-label for remove bookmark', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: true,
        isPending: false,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button).toHaveAttribute('aria-label', 'Remove bookmark');
    });

    it('should have aria-pressed reflecting bookmark state', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: true,
        isPending: false,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have data-tour attribute for onboarding', () => {
      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button).toHaveAttribute('data-tour', 'bookmark-button');
    });
  });

  describe('tooltip', () => {
    it('should show tooltip for unbookmarked state', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: false,
        isPending: false,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const tooltipWrapper = document.querySelector('[data-tooltip]');
      expect(tooltipWrapper).toHaveAttribute('data-tooltip', 'Save this response to revisit later');
    });

    it('should show tooltip for bookmarked state', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: true,
        isPending: false,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const tooltipWrapper = document.querySelector('[data-tooltip]');
      expect(tooltipWrapper).toHaveAttribute(
        'data-tooltip',
        'Remove this response from your saved bookmarks',
      );
    });
  });

  describe('size variants', () => {
    it('should render with small size', () => {
      render(<BookmarkButton responseId="response-1" size="sm" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button.className).toContain('w-6');
      expect(button.className).toContain('h-6');
      // Still has 44px minimum touch target
      expect(button.className).toContain('min-w-[44px]');
      expect(button.className).toContain('min-h-[44px]');
    });

    it('should render with medium size (default)', () => {
      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button.className).toContain('w-8');
      expect(button.className).toContain('h-8');
    });

    it('should render with large size', () => {
      render(<BookmarkButton responseId="response-1" size="lg" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button.className).toContain('w-10');
      expect(button.className).toContain('h-10');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<BookmarkButton responseId="response-1" className="custom-class" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button.className).toContain('custom-class');
    });

    it('should have amber background when bookmarked', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: true,
        isPending: false,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button.className).toContain('bg-amber-100');
      expect(button.className).toContain('text-amber-600');
    });

    it('should have gray text when not bookmarked', () => {
      mockUseBookmarkStatus.mockReturnValue({
        isBookmarked: false,
        isPending: false,
        toggleBookmark: mockToggleBookmark,
      });

      render(<BookmarkButton responseId="response-1" />);

      const button = screen.getByTestId('bookmark-button');
      expect(button.className).toContain('text-gray-500');
    });

    it('should have reduced opacity when disabled', () => {
      render(<BookmarkButton responseId="response-1" disabled />);

      const button = screen.getByTestId('bookmark-button');
      expect(button.className).toContain('disabled:opacity-40');
    });
  });

  describe('hook integration', () => {
    it('should pass responseId to useBookmarkStatus', () => {
      render(<BookmarkButton responseId="my-response-id" />);

      expect(mockUseBookmarkStatus).toHaveBeenCalledWith('my-response-id');
    });
  });
});
