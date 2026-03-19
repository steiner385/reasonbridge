/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for ReactionBar component
 *
 * Tests the emoji reaction display and interaction for responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactionSummary } from '../../services/reactionService';
import ReactionBar from './ReactionBar';

// Mock useRequireAuth hook
const mockRequireAuth = vi.fn();
vi.mock('../../hooks/useRequireAuth', () => ({
  useRequireAuth: () => ({
    requireAuth: mockRequireAuth,
  }),
}));

// Mock EmojiPicker component
vi.mock('./EmojiPicker', () => ({
  default: ({ onSelect, disabled }: { onSelect: (emoji: string) => void; disabled?: boolean }) => (
    <button
      data-testid="emoji-picker"
      onClick={() => onSelect('🎉')}
      disabled={disabled}
      aria-label="Add reaction"
    >
      +
    </button>
  ),
}));

const createReaction = (
  emoji: string,
  count: number,
  userReacted: boolean = false,
  users: { id: string; displayName: string }[] = [],
): ReactionSummary => ({
  emoji,
  count,
  userReacted,
  users,
});

describe('ReactionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default requireAuth behavior - execute callback immediately
    mockRequireAuth.mockImplementation((callback: () => void) => callback());
  });

  describe('rendering', () => {
    it('should render reaction buttons for each reaction', () => {
      const reactions = [createReaction('👍', 5), createReaction('❤️', 3), createReaction('🎉', 1)];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} />);

      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('🎉')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should render empty when no reactions', () => {
      render(<ReactionBar reactions={[]} onReactionClick={() => {}} />);

      const buttons = screen.queryAllByTestId('reaction-button');
      expect(buttons).toHaveLength(0);
    });

    it('should show emoji picker when showPicker is true', () => {
      render(<ReactionBar reactions={[]} onReactionClick={() => {}} showPicker={true} />);

      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    });

    it('should hide emoji picker when showPicker is false', () => {
      render(<ReactionBar reactions={[]} onReactionClick={() => {}} showPicker={false} />);

      expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument();
    });
  });

  describe('user reacted state', () => {
    it('should indicate when user has reacted via data attribute', () => {
      const reactions = [createReaction('👍', 5, true)];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} />);

      const button = screen.getByTestId('reaction-button');
      expect(button).toHaveAttribute('data-user-reacted', 'true');
    });

    it('should indicate when user has not reacted via data attribute', () => {
      const reactions = [createReaction('👍', 5, false)];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} />);

      const button = screen.getByTestId('reaction-button');
      expect(button).toHaveAttribute('data-user-reacted', 'false');
    });

    it('should have aria-pressed true when user has reacted', () => {
      const reactions = [createReaction('👍', 5, true)];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} />);

      const button = screen.getByTestId('reaction-button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('click handling', () => {
    it('should call onReactionClick with emoji when clicked', () => {
      const handleClick = vi.fn();
      const reactions = [createReaction('👍', 5)];

      render(<ReactionBar reactions={reactions} onReactionClick={handleClick} />);

      fireEvent.click(screen.getByTestId('reaction-button'));

      expect(handleClick).toHaveBeenCalledWith('👍');
    });

    it('should require auth before calling onReactionClick', () => {
      const handleClick = vi.fn();
      const reactions = [createReaction('👍', 5)];

      render(<ReactionBar reactions={reactions} onReactionClick={handleClick} />);

      fireEvent.click(screen.getByTestId('reaction-button'));

      expect(mockRequireAuth).toHaveBeenCalled();
    });

    it('should not call onReactionClick when disabled', () => {
      const handleClick = vi.fn();
      const reactions = [createReaction('👍', 5)];

      render(<ReactionBar reactions={reactions} onReactionClick={handleClick} disabled={true} />);

      const button = screen.getByTestId('reaction-button');
      expect(button).toBeDisabled();
    });

    it('should call onReactionClick from emoji picker selection', () => {
      const handleClick = vi.fn();

      render(<ReactionBar reactions={[]} onReactionClick={handleClick} showPicker={true} />);

      fireEvent.click(screen.getByTestId('emoji-picker'));

      expect(handleClick).toHaveBeenCalledWith('🎉');
    });
  });

  describe('tooltip', () => {
    it('should show tooltip with user names on hover', () => {
      const reactions = [
        createReaction('👍', 2, false, [
          { id: '1', displayName: 'Alice' },
          { id: '2', displayName: 'Bob' },
        ]),
      ];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} />);

      const button = screen.getByTestId('reaction-button');
      expect(button).toHaveAttribute('title', 'Alice, Bob');
    });

    it('should prepend "You" when user has reacted', () => {
      const reactions = [createReaction('👍', 2, true, [{ id: '1', displayName: 'Alice' }])];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} />);

      const button = screen.getByTestId('reaction-button');
      expect(button).toHaveAttribute('title', 'You, Alice');
    });

    it('should truncate and show count for many users', () => {
      // Provide fewer users than total count to trigger "and X others"
      const users = Array.from({ length: 3 }, (_, i) => ({
        id: String(i),
        displayName: `User${i}`,
      }));
      // Total count is 10, but we only have 3 user objects (API typically returns top N)
      const reactions = [createReaction('👍', 10, false, users)];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} maxTooltipUsers={5} />);

      const button = screen.getByTestId('reaction-button');
      // Should show first 3 users + "and 7 others"
      expect(button.getAttribute('title')).toContain('and');
      expect(button.getAttribute('title')).toContain('7');
      expect(button.getAttribute('title')).toContain('others');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label describing reaction', () => {
      const reactions = [createReaction('👍', 5, true)];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} />);

      const button = screen.getByTestId('reaction-button');
      expect(button).toHaveAttribute('aria-label', '👍 reaction, 5 people, you reacted');
    });

    it('should use singular "person" for count of 1', () => {
      const reactions = [createReaction('👍', 1, false)];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} />);

      const button = screen.getByTestId('reaction-button');
      expect(button).toHaveAttribute('aria-label', '👍 reaction, 1 person');
    });

    it('should have data-tour attribute for onboarding', () => {
      render(<ReactionBar reactions={[]} onReactionClick={() => {}} />);

      const container = document.querySelector('[data-tour="reaction-bar"]');
      expect(container).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ReactionBar reactions={[]} onReactionClick={() => {}} className="custom-class" />);

      const container = document.querySelector('.custom-class');
      expect(container).toBeInTheDocument();
    });

    it('should render with small size variant', () => {
      const reactions = [createReaction('👍', 5)];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} size="sm" />);

      const button = screen.getByTestId('reaction-button');
      expect(button.className).toContain('h-6');
    });

    it('should render with large size variant', () => {
      const reactions = [createReaction('👍', 5)];

      render(<ReactionBar reactions={reactions} onReactionClick={() => {}} size="lg" />);

      const button = screen.getByTestId('reaction-button');
      expect(button.className).toContain('h-10');
    });
  });
});
