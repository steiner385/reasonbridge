/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for NewMessagesDivider component
 *
 * Tests the visual separator that marks where new/unread messages begin
 * in a discussion thread.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NewMessagesDivider } from './NewMessagesDivider';

describe('NewMessagesDivider', () => {
  describe('rendering', () => {
    it('should render with default "New Messages" label', () => {
      render(<NewMessagesDivider />);
      expect(screen.getByText('New Messages')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<NewMessagesDivider label="Unread Responses" />);
      expect(screen.getByText('Unread Responses')).toBeInTheDocument();
    });

    it('should render with message count prefix', () => {
      render(<NewMessagesDivider newMessageCount={5} />);
      expect(screen.getByText('5 New Messages')).toBeInTheDocument();
    });

    it('should render with message count and custom label', () => {
      render(<NewMessagesDivider newMessageCount={3} label="Unread" />);
      expect(screen.getByText('3 Unread')).toBeInTheDocument();
    });

    it('should not include count when zero', () => {
      render(<NewMessagesDivider newMessageCount={0} />);
      // 0 is falsy, so should just show "New Messages"
      expect(screen.getByText('New Messages')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have role="separator" for semantic meaning', () => {
      render(<NewMessagesDivider />);
      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
    });

    it('should have aria-label matching display text', () => {
      render(<NewMessagesDivider newMessageCount={5} />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-label', '5 New Messages');
    });

    it('should have aria-label with custom label', () => {
      render(<NewMessagesDivider label="Unread Posts" />);
      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-label', 'Unread Posts');
    });

    it('should hide decorative line from screen readers', () => {
      render(<NewMessagesDivider />);
      const decorativeLine = document.querySelector('[aria-hidden="true"]');
      expect(decorativeLine).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<NewMessagesDivider className="my-8 mx-4" />);
      const separator = screen.getByRole('separator');
      expect(separator.className).toContain('my-8');
      expect(separator.className).toContain('mx-4');
    });

    it('should have minimum 44px height for touch targets', () => {
      render(<NewMessagesDivider />);
      const separator = screen.getByRole('separator');
      expect(separator.className).toContain('min-h-[44px]');
    });

    it('should have fade-in animation class', () => {
      render(<NewMessagesDivider />);
      const separator = screen.getByRole('separator');
      expect(separator.className).toContain('animate-fade-in');
    });

    it('should have centered flex layout', () => {
      render(<NewMessagesDivider />);
      const separator = screen.getByRole('separator');
      expect(separator.className).toContain('flex');
      expect(separator.className).toContain('items-center');
      expect(separator.className).toContain('justify-center');
    });

    it('should render horizontal line element', () => {
      render(<NewMessagesDivider />);
      const line = document.querySelector('.bg-red-500');
      expect(line).toBeInTheDocument();
    });

    it('should have red accent colors', () => {
      render(<NewMessagesDivider />);
      // Check the label has red text
      const label = screen.getByText('New Messages');
      expect(label.className).toContain('text-red-600');
    });
  });

  describe('text styling', () => {
    it('should render label with rounded pill background', () => {
      render(<NewMessagesDivider />);
      const label = screen.getByText('New Messages');
      expect(label.className).toContain('rounded-full');
    });

    it('should have white background for visibility over line', () => {
      render(<NewMessagesDivider />);
      const label = screen.getByText('New Messages');
      expect(label.className).toContain('bg-white');
    });

    it('should have relative z-index to appear above line', () => {
      render(<NewMessagesDivider />);
      const label = screen.getByText('New Messages');
      expect(label.className).toContain('z-10');
    });

    it('should not be selectable (decorative element)', () => {
      render(<NewMessagesDivider />);
      const label = screen.getByText('New Messages');
      expect(label.className).toContain('select-none');
    });
  });
});
