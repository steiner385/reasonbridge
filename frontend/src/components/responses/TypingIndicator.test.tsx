/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for TypingIndicator component
 *
 * Tests the real-time typing indicator display that shows when users
 * are actively composing responses in a discussion.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  describe('rendering', () => {
    it('should render null when message is null', () => {
      const { container } = render(<TypingIndicator message={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render null when message is empty string', () => {
      // Empty string should be treated as falsy and return null
      const { container } = render(<TypingIndicator message="" />);
      // Empty string is falsy in JavaScript, so component returns null
      expect(container.firstChild).toBeNull();
    });

    it('should render the message when provided', () => {
      render(<TypingIndicator message="Alice is typing..." />);
      expect(screen.getByText('Alice is typing...')).toBeInTheDocument();
    });

    it('should render multiple users typing message', () => {
      render(<TypingIndicator message="Alice and Bob are typing..." />);
      expect(screen.getByText('Alice and Bob are typing...')).toBeInTheDocument();
    });

    it('should render several people typing message', () => {
      render(<TypingIndicator message="Several people are typing..." />);
      expect(screen.getByText('Several people are typing...')).toBeInTheDocument();
    });
  });

  describe('animation dots', () => {
    it('should render three animated dots', () => {
      render(<TypingIndicator message="Alice is typing..." />);

      // The dots are wrapped in a span with aria-hidden
      const dotsContainer = document.querySelector('[aria-hidden="true"]');
      expect(dotsContainer).toBeInTheDocument();

      // Check for three dot elements
      const dots = dotsContainer?.querySelectorAll('.rounded-full');
      expect(dots).toHaveLength(3);
    });

    it('should apply staggered animation delays to dots', () => {
      render(<TypingIndicator message="Alice is typing..." />);

      const dotsContainer = document.querySelector('[aria-hidden="true"]');
      const dots = dotsContainer?.querySelectorAll('.rounded-full');

      // Check animation delays are staggered
      expect(dots?.[0]).toHaveStyle({ animationDelay: '0s' });
      expect(dots?.[1]).toHaveStyle({ animationDelay: '0.2s' });
      expect(dots?.[2]).toHaveStyle({ animationDelay: '0.4s' });
    });
  });

  describe('accessibility', () => {
    it('should have role="status" for live region', () => {
      render(<TypingIndicator message="Alice is typing..." />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeInTheDocument();
    });

    it('should have aria-live="polite" for non-intrusive announcements', () => {
      render(<TypingIndicator message="Alice is typing..." />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-atomic="true" to announce the entire content', () => {
      render(<TypingIndicator message="Alice is typing..." />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should hide animated dots from screen readers', () => {
      render(<TypingIndicator message="Alice is typing..." />);

      const dotsContainer = document.querySelector('[aria-hidden="true"]');
      expect(dotsContainer).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className when provided', () => {
      render(<TypingIndicator message="Alice is typing..." className="mt-4 px-6" />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion.className).toContain('mt-4');
      expect(statusRegion.className).toContain('px-6');
    });

    it('should apply default styling classes', () => {
      render(<TypingIndicator message="Alice is typing..." />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion.className).toContain('flex');
      expect(statusRegion.className).toContain('items-center');
      expect(statusRegion.className).toContain('gap-2');
    });

    it('should render message text in italic', () => {
      render(<TypingIndicator message="Alice is typing..." />);

      const messageSpan = screen.getByText('Alice is typing...');
      expect(messageSpan.className).toContain('italic');
    });
  });
});
