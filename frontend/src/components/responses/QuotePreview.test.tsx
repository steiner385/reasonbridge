/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for QuotePreview component
 *
 * Tests the quote/reply preview functionality including:
 * - Content rendering and truncation
 * - Click handling for navigation
 * - Keyboard accessibility
 * - Size variants and styling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuotePreview from './QuotePreview';

describe('QuotePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render quote preview with content', () => {
      render(
        <QuotePreview parentId="parent-1" parentContent="This is the parent response content" />,
      );

      expect(screen.getByTestId('quote-preview')).toBeInTheDocument();
      expect(screen.getByText('This is the parent response content')).toBeInTheDocument();
    });

    it('should render with author name', () => {
      render(
        <QuotePreview parentId="parent-1" parentContent="Some content" parentAuthorName="Alice" />,
      );

      expect(screen.getByText('Alice:')).toBeInTheDocument();
    });

    it('should not render author name prefix when not provided', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Some content" />);

      expect(screen.queryByText(':')).not.toBeInTheDocument();
    });

    it('should have correct data-parent-id attribute', () => {
      render(<QuotePreview parentId="response-123" parentContent="Content" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview).toHaveAttribute('data-parent-id', 'response-123');
    });
  });

  describe('content truncation', () => {
    it('should truncate content longer than maxLength', () => {
      const longContent =
        'This is a very long response that should be truncated because it exceeds the maximum length allowed for the preview display.';

      render(<QuotePreview parentId="parent-1" parentContent={longContent} maxLength={50} />);

      // First 50 chars: "This is a very long response that should be trunca"
      expect(
        screen.getByText(/^This is a very long response that should be trunca\.\.\.$/),
      ).toBeInTheDocument();
    });

    it('should not truncate content shorter than maxLength', () => {
      const shortContent = 'Short content';

      render(<QuotePreview parentId="parent-1" parentContent={shortContent} maxLength={100} />);

      expect(screen.getByText('Short content')).toBeInTheDocument();
      expect(screen.queryByText(/\.\.\.$/)).not.toBeInTheDocument();
    });

    it('should use default maxLength of 100', () => {
      const content = 'A'.repeat(150);

      render(<QuotePreview parentId="parent-1" parentContent={content} />);

      // Should show first 100 chars + "..."
      const truncated = screen.getByText(/^A+\.\.\.$/);
      expect(truncated.textContent).toBe('A'.repeat(100) + '...');
    });

    it('should handle exact maxLength content without truncation', () => {
      const content = 'A'.repeat(100);

      render(<QuotePreview parentId="parent-1" parentContent={content} maxLength={100} />);

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
      expect(screen.queryByText(/\.\.\.$/)).not.toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onNavigateToParent when clicked', () => {
      const handleNavigate = vi.fn();

      render(
        <QuotePreview
          parentId="parent-1"
          parentContent="Content"
          onNavigateToParent={handleNavigate}
        />,
      );

      fireEvent.click(screen.getByTestId('quote-preview'));

      expect(handleNavigate).toHaveBeenCalledWith('parent-1');
    });

    it('should scroll to parent element when no callback provided', () => {
      // Create a mock parent element
      const mockParentElement = document.createElement('div');
      mockParentElement.setAttribute('data-response-id', 'parent-1');
      mockParentElement.scrollIntoView = vi.fn();
      mockParentElement.classList.add = vi.fn();
      mockParentElement.classList.remove = vi.fn();
      document.body.appendChild(mockParentElement);

      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      fireEvent.click(screen.getByTestId('quote-preview'));

      expect(mockParentElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      });

      document.body.removeChild(mockParentElement);
    });
  });

  describe('keyboard accessibility', () => {
    it('should be focusable with tabIndex', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview).toHaveAttribute('tabIndex', '0');
    });

    it('should trigger navigation on Enter key', () => {
      const handleNavigate = vi.fn();

      render(
        <QuotePreview
          parentId="parent-1"
          parentContent="Content"
          onNavigateToParent={handleNavigate}
        />,
      );

      const preview = screen.getByTestId('quote-preview');
      fireEvent.keyDown(preview, { key: 'Enter' });

      expect(handleNavigate).toHaveBeenCalledWith('parent-1');
    });

    it('should trigger navigation on Space key', () => {
      const handleNavigate = vi.fn();

      render(
        <QuotePreview
          parentId="parent-1"
          parentContent="Content"
          onNavigateToParent={handleNavigate}
        />,
      );

      const preview = screen.getByTestId('quote-preview');
      fireEvent.keyDown(preview, { key: ' ' });

      expect(handleNavigate).toHaveBeenCalledWith('parent-1');
    });

    it('should not trigger on other keys', () => {
      const handleNavigate = vi.fn();

      render(
        <QuotePreview
          parentId="parent-1"
          parentContent="Content"
          onNavigateToParent={handleNavigate}
        />,
      );

      const preview = screen.getByTestId('quote-preview');
      fireEvent.keyDown(preview, { key: 'Tab' });

      expect(handleNavigate).not.toHaveBeenCalled();
    });

    it('should have role="button"', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const preview = screen.getByRole('button');
      expect(preview).toBeInTheDocument();
    });

    it('should have descriptive aria-label with author name', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" parentAuthorName="Bob" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview).toHaveAttribute('aria-label', 'Replying to Bob. Click to view original.');
    });

    it('should have generic aria-label without author name', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview).toHaveAttribute(
        'aria-label',
        'Replying to a response. Click to view original.',
      );
    });
  });

  describe('size variants', () => {
    it('should render with small size', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" size="sm" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview.className).toContain('text-xs');
      expect(preview.className).toContain('py-1.5');
    });

    it('should render with medium size (default)', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview.className).toContain('text-sm');
      expect(preview.className).toContain('py-2');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(
        <QuotePreview parentId="parent-1" parentContent="Content" className="my-custom-class" />,
      );

      const preview = screen.getByTestId('quote-preview');
      expect(preview.className).toContain('my-custom-class');
    });

    it('should have left border indicator', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview.className).toContain('border-l-2');
    });

    it('should have hover styles', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview.className).toContain('hover:bg-gray-100');
      expect(preview.className).toContain('hover:border-blue-400');
    });

    it('should have focus ring styles', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview.className).toContain('focus:ring-2');
      expect(preview.className).toContain('focus:ring-blue-500');
    });

    it('should have cursor-pointer for clickable indication', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const preview = screen.getByTestId('quote-preview');
      expect(preview.className).toContain('cursor-pointer');
    });
  });

  describe('icons', () => {
    it('should render reply icon', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const svgs = screen.getByTestId('quote-preview').querySelectorAll('svg');
      expect(svgs.length).toBe(2); // Reply icon + chevron
    });

    it('should hide icons from screen readers', () => {
      render(<QuotePreview parentId="parent-1" parentContent="Content" />);

      const svgs = screen.getByTestId('quote-preview').querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});
