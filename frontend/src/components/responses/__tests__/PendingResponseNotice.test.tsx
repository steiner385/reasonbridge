/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PendingResponseNotice } from '../PendingResponseNotice';

describe('PendingResponseNotice', () => {
  describe('Rendering', () => {
    it('should render when show is true', () => {
      render(<PendingResponseNotice show={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Your response is being checked by a helper/i)).toBeInTheDocument();
    });

    it('should render nothing when show is false', () => {
      const { container } = render(<PendingResponseNotice show={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('should display the default child-friendly message', () => {
      render(<PendingResponseNotice show={true} />);

      expect(screen.getByText(/Your response is being checked by a helper/i)).toBeInTheDocument();
      expect(screen.getByText(/It will show up soon!/i)).toBeInTheDocument();
    });

    it('should display expected wait time message', () => {
      render(<PendingResponseNotice show={true} />);

      expect(screen.getByText(/Usually within 24 hours/i)).toBeInTheDocument();
    });

    it('should display custom message when provided', () => {
      const customMessage = 'Custom review message';
      render(<PendingResponseNotice show={true} message={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('Dismiss functionality', () => {
    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(<PendingResponseNotice show={true} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss message/i });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not render dismiss button when onDismiss is not provided', () => {
      render(<PendingResponseNotice show={true} />);

      expect(screen.queryByRole('button', { name: /dismiss message/i })).not.toBeInTheDocument();
    });

    it('should render dismiss button when onDismiss is provided', () => {
      render(<PendingResponseNotice show={true} onDismiss={() => {}} />);

      expect(screen.getByRole('button', { name: /dismiss message/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" for screen reader announcement', () => {
      render(<PendingResponseNotice show={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-live="polite" for non-intrusive announcements', () => {
      render(<PendingResponseNotice show={true} />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have accessible dismiss button', () => {
      render(<PendingResponseNotice show={true} onDismiss={() => {}} />);

      const button = screen.getByRole('button', { name: /dismiss message/i });
      expect(button).toHaveAttribute('aria-label', 'Dismiss message');
    });
  });

  describe('Styling', () => {
    it('should apply sky/light blue styling classes for child-friendly appearance', () => {
      render(<PendingResponseNotice show={true} />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('bg-sky-50');
      expect(container).toHaveClass('border-sky-200');
    });

    it('should have dark mode classes for dark theme support', () => {
      render(<PendingResponseNotice show={true} />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('dark:bg-sky-900/20');
      expect(container).toHaveClass('dark:border-sky-700');
    });
  });

  describe('Icon', () => {
    it('should render a clock icon', () => {
      render(<PendingResponseNotice show={true} />);

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Test ID', () => {
    it('should have data-testid for testing', () => {
      render(<PendingResponseNotice show={true} />);

      expect(screen.getByTestId('pending-response-notice')).toBeInTheDocument();
    });
  });
});
