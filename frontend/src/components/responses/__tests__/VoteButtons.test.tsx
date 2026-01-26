import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoteButtons from '../VoteButtons';

describe('VoteButtons', () => {
  const defaultProps = {
    voteCount: 0,
    onUpvote: vi.fn(),
    onDownvote: vi.fn(),
  };

  describe('Rendering', () => {
    it('should display upvote and downvote buttons', () => {
      render(<VoteButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /upvote/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /downvote/i })).toBeInTheDocument();
    });

    it('should display vote count', () => {
      render(<VoteButtons {...defaultProps} voteCount={5} />);

      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('should display negative vote count without plus sign', () => {
      render(<VoteButtons {...defaultProps} voteCount={-3} />);

      expect(screen.getByText('-3')).toBeInTheDocument();
    });

    it('should display zero vote count', () => {
      render(<VoteButtons {...defaultProps} voteCount={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('User Vote State', () => {
    it('should highlight upvote button when user has upvoted', () => {
      render(<VoteButtons {...defaultProps} userVote="up" />);

      const upvoteButton = screen.getByRole('button', { name: /upvote/i });
      expect(upvoteButton.className).toContain('bg-primary-100');
      expect(upvoteButton.className).toContain('text-primary-700');
    });

    it('should highlight downvote button when user has downvoted', () => {
      render(<VoteButtons {...defaultProps} userVote="down" />);

      const downvoteButton = screen.getByRole('button', { name: /downvote/i });
      expect(downvoteButton.className).toContain('bg-red-100');
      expect(downvoteButton.className).toContain('text-red-700');
    });

    it('should not highlight buttons when user has not voted', () => {
      render(<VoteButtons {...defaultProps} userVote={null} />);

      const upvoteButton = screen.getByRole('button', { name: /upvote/i });
      const downvoteButton = screen.getByRole('button', { name: /downvote/i });

      expect(upvoteButton.className).not.toContain('bg-primary-100');
      expect(downvoteButton.className).not.toContain('bg-red-100');
    });
  });

  describe('User Interactions', () => {
    it('should call onUpvote when upvote button is clicked', async () => {
      const onUpvote = vi.fn();
      const user = userEvent.setup();

      render(<VoteButtons {...defaultProps} onUpvote={onUpvote} />);

      await user.click(screen.getByRole('button', { name: /upvote/i }));

      expect(onUpvote).toHaveBeenCalledOnce();
    });

    it('should call onDownvote when downvote button is clicked', async () => {
      const onDownvote = vi.fn();
      const user = userEvent.setup();

      render(<VoteButtons {...defaultProps} onDownvote={onDownvote} />);

      await user.click(screen.getByRole('button', { name: /downvote/i }));

      expect(onDownvote).toHaveBeenCalledOnce();
    });

    it('should not call callbacks when buttons are disabled', async () => {
      const onUpvote = vi.fn();
      const onDownvote = vi.fn();
      const user = userEvent.setup();

      render(
        <VoteButtons {...defaultProps} onUpvote={onUpvote} onDownvote={onDownvote} disabled />,
      );

      await user.click(screen.getByRole('button', { name: /upvote/i }));
      await user.click(screen.getByRole('button', { name: /downvote/i }));

      expect(onUpvote).not.toHaveBeenCalled();
      expect(onDownvote).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable buttons when disabled prop is true', () => {
      render(<VoteButtons {...defaultProps} disabled />);

      expect(screen.getByRole('button', { name: /upvote/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /downvote/i })).toBeDisabled();
    });

    it('should enable buttons when disabled prop is false', () => {
      render(<VoteButtons {...defaultProps} disabled={false} />);

      expect(screen.getByRole('button', { name: /upvote/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /downvote/i })).not.toBeDisabled();
    });
  });

  describe('Orientation', () => {
    it('should support vertical orientation', () => {
      const { container } = render(<VoteButtons {...defaultProps} orientation="vertical" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex-col');
    });

    it('should support horizontal orientation', () => {
      const { container } = render(<VoteButtons {...defaultProps} orientation="horizontal" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex-row');
    });
  });

  describe('Size Variants', () => {
    it('should support small size variant', () => {
      render(<VoteButtons {...defaultProps} size="sm" />);

      const upvoteButton = screen.getByRole('button', { name: /upvote/i });
      expect(upvoteButton.className).toContain('w-6');
      expect(upvoteButton.className).toContain('h-6');
    });

    it('should support medium size variant', () => {
      render(<VoteButtons {...defaultProps} size="md" />);

      const upvoteButton = screen.getByRole('button', { name: /upvote/i });
      expect(upvoteButton.className).toContain('w-8');
      expect(upvoteButton.className).toContain('h-8');
    });

    it('should support large size variant', () => {
      render(<VoteButtons {...defaultProps} size="lg" />);

      const upvoteButton = screen.getByRole('button', { name: /upvote/i });
      expect(upvoteButton.className).toContain('w-10');
      expect(upvoteButton.className).toContain('h-10');
    });
  });
});
