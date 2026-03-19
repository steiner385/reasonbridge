/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for KeyboardShortcutsHelp component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyboardShortcutsHelp, { type ShortcutCategory } from './KeyboardShortcutsHelp';

describe('KeyboardShortcutsHelp', () => {
  const mockOnClose = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when open', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<KeyboardShortcutsHelp isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });

  describe('default categories', () => {
    it('should render Navigation category', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('should render Actions category', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should render General category', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('General')).toBeInTheDocument();
    });
  });

  describe('default shortcuts', () => {
    it('should display J/K navigation shortcuts', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Move to next response')).toBeInTheDocument();
      expect(screen.getByText('Move to previous response')).toBeInTheDocument();
      expect(screen.getByText('j')).toBeInTheDocument();
      expect(screen.getByText('k')).toBeInTheDocument();
    });

    it('should display reply shortcut', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Reply to focused response')).toBeInTheDocument();
      expect(screen.getByText('r')).toBeInTheDocument();
    });

    it('should display search shortcut', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Focus search bar')).toBeInTheDocument();
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('should display help shortcut', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Show this help dialog')).toBeInTheDocument();
      // ? appears in shortcuts section and footer, so use getAllByText
      expect(screen.getAllByText('?').length).toBeGreaterThan(0);
    });

    it('should display escape shortcut', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Close modal or deselect')).toBeInTheDocument();
      expect(screen.getByText('Esc')).toBeInTheDocument();
    });

    it('should display Tab navigation shortcuts', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Move through interactive elements')).toBeInTheDocument();
      expect(screen.getByText('Move backwards through elements')).toBeInTheDocument();
    });
  });

  describe('custom categories', () => {
    it('should render custom categories', () => {
      const customCategories: ShortcutCategory[] = [
        {
          title: 'Custom Category',
          shortcuts: [{ keys: ['x'], description: 'Custom action' }],
        },
      ];

      render(
        <KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} categories={customCategories} />,
      );

      expect(screen.getByText('Custom Category')).toBeInTheDocument();
      expect(screen.getByText('Custom action')).toBeInTheDocument();
      expect(screen.getByText('x')).toBeInTheDocument();
    });

    it('should display multi-key shortcuts', () => {
      const customCategories: ShortcutCategory[] = [
        {
          title: 'Combos',
          shortcuts: [{ keys: ['Ctrl', 'S'], description: 'Save' }],
        },
      ];

      render(
        <KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} categories={customCategories} />,
      );

      expect(screen.getByText('Ctrl')).toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();
      expect(screen.getByText('+')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible role list', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(
        screen.getByRole('list', { name: 'Keyboard shortcuts categories' }),
      ).toBeInTheDocument();
    });

    it('should have category list items', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(0);
    });
  });

  describe('footer', () => {
    it('should display help hint in footer', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Press/)).toBeInTheDocument();
      expect(screen.getByText(/anywhere to open this help dialog/)).toBeInTheDocument();
    });
  });

  describe('modal close', () => {
    it('should call onClose when modal is closed', async () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
      const user = userEvent.setup();

      // Find and click the close button (X button in modal)
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
