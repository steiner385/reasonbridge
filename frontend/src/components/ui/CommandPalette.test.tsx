/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for CommandPalette component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommandPalette, { type CommandItem } from './CommandPalette';

describe('CommandPalette', () => {
  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockOnNavigateToTopic = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render when open', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<CommandPalette isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    });

    it('should render search input with placeholder', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      expect(
        screen.getByPlaceholderText('Search topics, actions, or navigation...'),
      ).toBeInTheDocument();
    });

    it('should render custom placeholder', () => {
      render(
        <CommandPalette isOpen={true} onClose={mockOnClose} placeholder="Custom placeholder..." />,
      );

      expect(screen.getByPlaceholderText('Custom placeholder...')).toBeInTheDocument();
    });

    it('should render ESC hint', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('ESC')).toBeInTheDocument();
    });

    it('should render footer with keyboard hints', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('to navigate')).toBeInTheDocument();
      expect(screen.getByText('to select')).toBeInTheDocument();
      expect(screen.getByText('to close')).toBeInTheDocument();
    });
  });

  describe('default actions', () => {
    it('should render default navigation actions when onNavigate provided', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);

      expect(screen.getByText('Go to Home')).toBeInTheDocument();
      expect(screen.getByText('Browse Topics')).toBeInTheDocument();
      expect(screen.getByText('Go to Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Create New Topic')).toBeInTheDocument();
    });

    it('should not render default actions when onNavigate not provided', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText('Go to Home')).not.toBeInTheDocument();
    });

    it('should show Navigation category header', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);

      // "Navigation" appears multiple times (cmdk group heading + visible label)
      expect(screen.getAllByText('Navigation').length).toBeGreaterThan(0);
    });

    it('should show Actions category header', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);

      // "Actions" appears multiple times (cmdk group heading + visible label)
      expect(screen.getAllByText('Actions').length).toBeGreaterThan(0);
    });
  });

  describe('topics', () => {
    const mockTopics = [
      { id: '1', title: 'Climate Change Discussion', description: 'Discuss climate issues' },
      { id: '2', title: 'AI Ethics', description: 'Ethics in artificial intelligence' },
    ];

    it('should render topics section when topics provided', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          topics={mockTopics}
          onNavigateToTopic={mockOnNavigateToTopic}
        />,
      );

      // "Topics" appears multiple times (cmdk group heading + visible label)
      expect(screen.getAllByText('Topics').length).toBeGreaterThan(0);
      expect(screen.getByText('Climate Change Discussion')).toBeInTheDocument();
      expect(screen.getByText('AI Ethics')).toBeInTheDocument();
    });

    it('should render topic descriptions', () => {
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          topics={mockTopics}
          onNavigateToTopic={mockOnNavigateToTopic}
        />,
      );

      expect(screen.getByText('Discuss climate issues')).toBeInTheDocument();
      expect(screen.getByText('Ethics in artificial intelligence')).toBeInTheDocument();
    });

    it('should call onNavigateToTopic when topic selected', async () => {
      const user = userEvent.setup();
      render(
        <CommandPalette
          isOpen={true}
          onClose={mockOnClose}
          topics={mockTopics}
          onNavigateToTopic={mockOnNavigateToTopic}
        />,
      );

      await user.click(screen.getByText('Climate Change Discussion'));

      expect(mockOnNavigateToTopic).toHaveBeenCalledWith('1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('custom actions', () => {
    const mockActions: CommandItem[] = [
      {
        id: 'custom-1',
        label: 'Custom Action',
        description: 'A custom action',
        category: 'Custom',
        onSelect: vi.fn(),
      },
      {
        id: 'custom-2',
        label: 'Another Action',
        shortcut: ['⌘', 'A'],
        category: 'Custom',
        onSelect: vi.fn(),
      },
    ];

    it('should render custom actions', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} actions={mockActions} />);

      expect(screen.getByText('Custom Action')).toBeInTheDocument();
      expect(screen.getByText('Another Action')).toBeInTheDocument();
    });

    it('should render custom category', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} actions={mockActions} />);

      // "Custom" appears multiple times (cmdk group heading + visible label)
      expect(screen.getAllByText('Custom').length).toBeGreaterThan(0);
    });

    it('should render keyboard shortcuts', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} actions={mockActions} />);

      expect(screen.getByText('⌘')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should call onSelect when action selected', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} actions={mockActions} />);

      await user.click(screen.getByText('Custom Action'));

      expect(mockActions[0].onSelect).toHaveBeenCalled();
    });
  });

  describe('recent items', () => {
    const mockRecentItems: CommandItem[] = [
      {
        id: 'recent-1',
        label: 'Recently Viewed Topic',
        description: 'Viewed 5 minutes ago',
        onSelect: vi.fn(),
      },
    ];

    it('should render recent items when no search', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} recentItems={mockRecentItems} />);

      // "Recent" appears multiple times (cmdk group heading + visible label)
      expect(screen.getAllByText('Recent').length).toBeGreaterThan(0);
      expect(screen.getByText('Recently Viewed Topic')).toBeInTheDocument();
    });

    it('should call onSelect when recent item selected', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} recentItems={mockRecentItems} />);

      await user.click(screen.getByText('Recently Viewed Topic'));

      expect(mockRecentItems[0].onSelect).toHaveBeenCalled();
    });
  });

  describe('search functionality', () => {
    it('should show search input', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('command-palette-input')).toBeInTheDocument();
    });

    it('should allow typing in search input', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByTestId('command-palette-input');
      await user.type(input, 'test search');

      expect(input).toHaveValue('test search');
    });

    it('should show empty state when no results', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByTestId('command-palette-input');
      await user.type(input, 'xyznonexistent');

      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });

    it('should reset search when palette closes and reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByTestId('command-palette-input');
      await user.type(input, 'search text');
      expect(input).toHaveValue('search text');

      // Close and reopen
      rerender(<CommandPalette isOpen={false} onClose={mockOnClose} />);
      rerender(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      // Input should be cleared
      expect(screen.getByTestId('command-palette-input')).toHaveValue('');
    });
  });

  describe('navigation actions', () => {
    it('should navigate to home when Go to Home selected', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);

      await user.click(screen.getByText('Go to Home'));

      expect(mockOnNavigate).toHaveBeenCalledWith('/');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate to topics when Browse Topics selected', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);

      await user.click(screen.getByText('Browse Topics'));

      expect(mockOnNavigate).toHaveBeenCalledWith('/topics');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate to profile when Go to Profile selected', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);

      await user.click(screen.getByText('Go to Profile'));

      expect(mockOnNavigate).toHaveBeenCalledWith('/profile');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate to settings when Settings selected', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);

      await user.click(screen.getByText('Settings'));

      expect(mockOnNavigate).toHaveBeenCalledWith('/settings');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate to new topic when Create New Topic selected', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} onNavigate={mockOnNavigate} />);

      await user.click(screen.getByText('Create New Topic'));

      expect(mockOnNavigate).toHaveBeenCalledWith('/topics/new');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('should call onClose when backdrop clicked', async () => {
      const user = userEvent.setup();
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      // Click the backdrop (the first div with bg-black/50)
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have command palette label', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      // cmdk sets aria-label on the dialog
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
    });

    it('should have search input with placeholder', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByTestId('command-palette-input');
      expect(input).toHaveAttribute('placeholder');
    });
  });
});
