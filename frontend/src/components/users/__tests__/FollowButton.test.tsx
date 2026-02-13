/**
 * Unit tests for FollowButton component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowButton } from '../FollowButton';
import { useFollow } from '../../../hooks/useFollow';
import { useAuth } from '../../../hooks/useAuth';

// Mock the hooks
vi.mock('../../../hooks/useFollow');
vi.mock('../../../hooks/useAuth');

const mockUseFollow = useFollow as Mock;
const mockUseAuth = useAuth as Mock;

describe('FollowButton', () => {
  const defaultUseFollowReturn = {
    isFollowing: false,
    isLoading: false,
    error: null,
    follow: vi.fn().mockResolvedValue(true),
    unfollow: vi.fn().mockResolvedValue(true),
    toggleFollow: vi.fn().mockResolvedValue(true),
    checkFollowStatus: vi.fn(),
  };

  const defaultUseAuthReturn = {
    user: { id: 'current-user-123', displayName: 'Current User' },
    isAuthenticated: true,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFollow.mockReturnValue(defaultUseFollowReturn);
    mockUseAuth.mockReturnValue(defaultUseAuthReturn);
  });

  describe('Rendering', () => {
    it('should render Follow button when not following', () => {
      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByTestId('follow-button')).toBeInTheDocument();
      expect(screen.getByText('Follow')).toBeInTheDocument();
    });

    it('should render Following button when following', () => {
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        isFollowing: true,
      });

      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByText('Following')).toBeInTheDocument();
    });

    it('should render Loading text when loading', () => {
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        isLoading: true,
      });

      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not render button when viewing own profile', () => {
      render(<FollowButton userId="current-user-123" />);
      expect(screen.queryByTestId('follow-button')).not.toBeInTheDocument();
    });

    it('should render button when viewing another user profile', () => {
      render(<FollowButton userId="other-user-789" />);
      expect(screen.getByTestId('follow-button')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call toggleFollow when clicked', async () => {
      const toggleFollow = vi.fn().mockResolvedValue(true);
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        toggleFollow,
      });

      render(<FollowButton userId="target-user-456" />);
      await userEvent.click(screen.getByTestId('follow-button'));

      expect(toggleFollow).toHaveBeenCalled();
    });

    it('should be disabled when loading', () => {
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        isLoading: true,
      });

      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByTestId('follow-button')).toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<FollowButton userId="target-user-456" disabled />);
      expect(screen.getByTestId('follow-button')).toBeDisabled();
    });
  });

  describe('Callbacks', () => {
    it('should call onFollowChange when follow state changes', async () => {
      const onFollowChange = vi.fn();

      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        isFollowing: true,
      });

      render(<FollowButton userId="target-user-456" onFollowChange={onFollowChange} />);

      await waitFor(() => {
        expect(onFollowChange).toHaveBeenCalledWith(true);
      });
    });

    it('should call onError when error occurs', async () => {
      const onError = vi.fn();

      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        error: 'Failed to follow user',
      });

      render(<FollowButton userId="target-user-456" onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Failed to follow user');
      });
    });
  });

  describe('Compact Mode', () => {
    it('should not show text in compact mode', () => {
      render(<FollowButton userId="target-user-456" compact />);
      expect(screen.queryByText('Follow')).not.toBeInTheDocument();
    });

    it('should show icon in compact mode', () => {
      const { container } = render(<FollowButton userId="target-user-456" compact />);
      // Should have an SVG icon
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply small size classes', () => {
      render(<FollowButton userId="target-user-456" size="sm" />);
      const button = screen.getByTestId('follow-button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should apply medium size classes by default', () => {
      render(<FollowButton userId="target-user-456" />);
      const button = screen.getByTestId('follow-button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    });

    it('should apply large size classes', () => {
      render(<FollowButton userId="target-user-456" size="lg" />);
      const button = screen.getByTestId('follow-button');
      expect(button).toHaveClass('px-5', 'py-2.5', 'text-base');
    });

    it('should apply compact size classes', () => {
      render(<FollowButton userId="target-user-456" size="sm" compact />);
      const button = screen.getByTestId('follow-button');
      expect(button).toHaveClass('p-1.5');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for follow state', () => {
      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByTestId('follow-button')).toHaveAttribute('aria-label', 'Follow user');
    });

    it('should have aria-label for following state', () => {
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        isFollowing: true,
      });

      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByTestId('follow-button')).toHaveAttribute('aria-label', 'Unfollow user');
    });

    it('should have aria-pressed attribute', () => {
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        isFollowing: true,
      });

      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByTestId('follow-button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have button type', () => {
      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByTestId('follow-button')).toHaveAttribute('type', 'button');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<FollowButton userId="target-user-456" className="custom-class" />);
      expect(screen.getByTestId('follow-button')).toHaveClass('custom-class');
    });

    it('should have blue background when not following', () => {
      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByTestId('follow-button')).toHaveClass('bg-blue-600');
    });

    it('should have outlined style when following', () => {
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        isFollowing: true,
      });

      render(<FollowButton userId="target-user-456" />);
      expect(screen.getByTestId('follow-button')).toHaveClass('border');
    });
  });

  describe('Hook Integration', () => {
    it('should check follow status on mount when no initialFollowing', () => {
      const checkFollowStatus = vi.fn();
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        checkFollowStatus,
      });

      render(<FollowButton userId="target-user-456" />);
      expect(checkFollowStatus).toHaveBeenCalled();
    });

    it('should not check follow status when initialFollowing is provided', () => {
      const checkFollowStatus = vi.fn();
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        checkFollowStatus,
      });

      render(<FollowButton userId="target-user-456" initialFollowing={true} />);
      expect(checkFollowStatus).not.toHaveBeenCalled();
    });

    it('should pass userId to useFollow hook', () => {
      render(<FollowButton userId="specific-user-id" />);
      expect(mockUseFollow).toHaveBeenCalledWith('specific-user-id', false);
    });

    it('should pass initialFollowing to useFollow hook', () => {
      render(<FollowButton userId="specific-user-id" initialFollowing={true} />);
      expect(mockUseFollow).toHaveBeenCalledWith('specific-user-id', true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unauthenticated user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(<FollowButton userId="target-user-456" />);
      // Should still render since we don't know if it's their own profile
      expect(screen.getByTestId('follow-button')).toBeInTheDocument();
    });

    it('should show loading spinner during API call', () => {
      mockUseFollow.mockReturnValue({
        ...defaultUseFollowReturn,
        isLoading: true,
      });

      const { container } = render(<FollowButton userId="target-user-456" />);
      // Should have spinning SVG
      expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
    });
  });
});
