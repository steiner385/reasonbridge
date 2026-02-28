/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ShareButton from './ShareButton';

// Mock the ToastContext
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  show: vi.fn(),
  dismiss: vi.fn(),
  dismissAll: vi.fn(),
};

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('ShareButton', () => {
  const defaultProps = {
    topicId: 'topic-123',
    responseId: 'response-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://example.com',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render share button', () => {
      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /share response/i });
      expect(button).toBeInTheDocument();
    });

    it('should have accessible aria-label', () => {
      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /share response/i });
      expect(button).toHaveAttribute('aria-label', 'Share response');
    });

    it('should have minimum touch target size for accessibility', () => {
      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /share response/i });
      expect(button.className).toContain('min-w-[44px]');
      expect(button.className).toContain('min-h-[44px]');
    });

    it('should apply custom className', () => {
      render(<ShareButton {...defaultProps} className="custom-class" />);

      const button = screen.getByRole('button', { name: /share response/i });
      expect(button.className).toContain('custom-class');
    });
  });

  describe('Clipboard functionality', () => {
    it('should copy URL to clipboard on click when Web Share API is not available', async () => {
      // Ensure navigator.share is not available
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /share response/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'https://example.com/topics/topic-123#response-response-456',
        );
      });
    });

    it('should show success toast after copying to clipboard', async () => {
      // Ensure navigator.share is not available
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /share response/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Link copied to clipboard');
      });
    });

    it('should show error toast when clipboard write fails', async () => {
      // Ensure navigator.share is not available
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });

      // Mock clipboard to fail
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
        },
      });

      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /share response/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to copy link');
      });
    });
  });

  describe('Web Share API', () => {
    it('should use Web Share API when available on mobile', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /share response/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Check out this response',
          url: 'https://example.com/topics/topic-123#response-response-456',
        });
      });

      // Should not copy to clipboard when share succeeds
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('should fall back to clipboard when Web Share API fails', async () => {
      const mockShare = vi.fn().mockRejectedValue(new Error('Share failed'));
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /share response/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'https://example.com/topics/topic-123#response-response-456',
        );
      });
    });

    it('should not fall back to clipboard when user cancels share', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = vi.fn().mockRejectedValue(abortError);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /share response/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
      });

      // Should not copy to clipboard when user cancelled
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });

  describe('URL construction', () => {
    it('should construct correct URL with topic and response IDs', async () => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });

      render(<ShareButton topicId="my-topic" responseId="my-response" />);

      const button = screen.getByRole('button', { name: /share response/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'https://example.com/topics/my-topic#response-my-response',
        );
      });
    });
  });
});
