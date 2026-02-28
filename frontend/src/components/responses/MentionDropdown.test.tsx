/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { MentionUser } from '../../services/mentionService';
import MentionDropdown from './MentionDropdown';

describe('MentionDropdown', () => {
  const mockUsers: MentionUser[] = [
    {
      id: 'user-1',
      username: 'johndoe',
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatar1.jpg',
    },
    { id: 'user-2', username: 'janedoe', displayName: 'Jane Doe' },
    {
      id: 'user-3',
      username: 'bobsmith',
      displayName: 'Bob Smith',
      avatarUrl: 'https://example.com/avatar3.jpg',
    },
  ];

  const defaultProps = {
    users: mockUsers,
    highlightedIndex: 0,
    onSelect: vi.fn(),
    onHighlightChange: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all users', () => {
      render(<MentionDropdown {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('@janedoe')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('@bobsmith')).toBeInTheDocument();
    });

    it('should render avatar images when provided', () => {
      const { container } = render(<MentionDropdown {...defaultProps} />);

      // Images have aria-hidden so they don't have "img" role, query by tag
      const avatars = container.querySelectorAll('img');
      expect(avatars).toHaveLength(2); // Only John and Bob have avatars
    });

    it('should render initials when avatar is not provided', () => {
      render(<MentionDropdown {...defaultProps} />);

      // Jane doesn't have an avatar, should show initial
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(<MentionDropdown {...defaultProps} users={[]} isLoading={true} />);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading mention suggestions')).toBeInTheDocument();
    });

    it('should show empty state when no users', () => {
      render(<MentionDropdown {...defaultProps} users={[]} />);

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<MentionDropdown {...defaultProps} className="custom-class" />);

      const listbox = screen.getByRole('listbox');
      expect(listbox.className).toContain('custom-class');
    });

    it('should apply custom style for positioning', () => {
      render(<MentionDropdown {...defaultProps} style={{ top: '100px', left: '50px' }} />);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveStyle({ top: '100px', left: '50px' });
    });
  });

  describe('accessibility', () => {
    it('should have proper listbox role', () => {
      render(<MentionDropdown {...defaultProps} />);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should have proper option roles', () => {
      render(<MentionDropdown {...defaultProps} />);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('should mark highlighted option as selected', () => {
      render(<MentionDropdown {...defaultProps} highlightedIndex={1} />);

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      expect(options[2]).toHaveAttribute('aria-selected', 'false');
    });

    it('should have minimum touch target height (44px)', () => {
      render(<MentionDropdown {...defaultProps} />);

      const options = screen.getAllByRole('option');
      options.forEach((option) => {
        expect(option.className).toContain('min-h-[44px]');
      });
    });

    it('should have aria-busy when loading', () => {
      render(<MentionDropdown {...defaultProps} users={[]} isLoading={true} />);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('selection', () => {
    it('should call onSelect when clicking a user', () => {
      const onSelect = vi.fn();
      render(<MentionDropdown {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Jane Doe'));

      expect(onSelect).toHaveBeenCalledWith(mockUsers[1]);
    });

    it('should call onHighlightChange when hovering over a user', () => {
      const onHighlightChange = vi.fn();
      render(<MentionDropdown {...defaultProps} onHighlightChange={onHighlightChange} />);

      fireEvent.mouseEnter(screen.getAllByRole('option')[2]);

      expect(onHighlightChange).toHaveBeenCalledWith(2);
    });
  });

  describe('keyboard navigation', () => {
    it('should call onHighlightChange with next index on ArrowDown', () => {
      const onHighlightChange = vi.fn();
      render(
        <MentionDropdown
          {...defaultProps}
          highlightedIndex={0}
          onHighlightChange={onHighlightChange}
        />,
      );

      const listbox = screen.getByRole('listbox');
      fireEvent.keyDown(listbox, { key: 'ArrowDown' });

      expect(onHighlightChange).toHaveBeenCalledWith(1);
    });

    it('should not exceed users length on ArrowDown', () => {
      const onHighlightChange = vi.fn();
      render(
        <MentionDropdown
          {...defaultProps}
          highlightedIndex={2}
          onHighlightChange={onHighlightChange}
        />,
      );

      const listbox = screen.getByRole('listbox');
      fireEvent.keyDown(listbox, { key: 'ArrowDown' });

      expect(onHighlightChange).toHaveBeenCalledWith(2); // Should stay at max
    });

    it('should call onHighlightChange with previous index on ArrowUp', () => {
      const onHighlightChange = vi.fn();
      render(
        <MentionDropdown
          {...defaultProps}
          highlightedIndex={2}
          onHighlightChange={onHighlightChange}
        />,
      );

      const listbox = screen.getByRole('listbox');
      fireEvent.keyDown(listbox, { key: 'ArrowUp' });

      expect(onHighlightChange).toHaveBeenCalledWith(1);
    });

    it('should not go below 0 on ArrowUp', () => {
      const onHighlightChange = vi.fn();
      render(
        <MentionDropdown
          {...defaultProps}
          highlightedIndex={0}
          onHighlightChange={onHighlightChange}
        />,
      );

      const listbox = screen.getByRole('listbox');
      fireEvent.keyDown(listbox, { key: 'ArrowUp' });

      expect(onHighlightChange).toHaveBeenCalledWith(0); // Should stay at 0
    });

    it('should call onSelect on Enter', () => {
      const onSelect = vi.fn();
      render(<MentionDropdown {...defaultProps} highlightedIndex={1} onSelect={onSelect} />);

      const listbox = screen.getByRole('listbox');
      fireEvent.keyDown(listbox, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledWith(mockUsers[1]);
    });

    it('should call onClose on Escape', () => {
      const onClose = vi.fn();
      render(<MentionDropdown {...defaultProps} onClose={onClose} />);

      const listbox = screen.getByRole('listbox');
      fireEvent.keyDown(listbox, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose on Tab', () => {
      const onClose = vi.fn();
      render(<MentionDropdown {...defaultProps} onClose={onClose} />);

      const listbox = screen.getByRole('listbox');
      fireEvent.keyDown(listbox, { key: 'Tab' });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('highlighting', () => {
    it('should apply highlight styles to highlighted user', () => {
      render(<MentionDropdown {...defaultProps} highlightedIndex={1} />);

      const options = screen.getAllByRole('option');

      // Highlighted option should have primary background
      expect(options[1].className).toContain('bg-primary-50');

      // Non-highlighted options should not have primary background
      expect(options[0].className).not.toContain('bg-primary-50');
      expect(options[2].className).not.toContain('bg-primary-50');
    });
  });

  describe('dark mode', () => {
    it('should include dark mode classes', () => {
      render(<MentionDropdown {...defaultProps} />);

      const listbox = screen.getByRole('listbox');
      expect(listbox.className).toContain('dark:bg-gray-800');
      expect(listbox.className).toContain('dark:border-gray-700');
    });
  });
});
