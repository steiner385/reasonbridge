/**
 * Unit tests for FollowingList component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { FollowingList } from '../FollowingList';
import { useFollowing } from '../../../hooks/useFollowers';
import { useAuth } from '../../../hooks/useAuth';
import { useFollow } from '../../../hooks/useFollow';

// Mock the hooks
vi.mock('../../../hooks/useFollowers');
vi.mock('../../../hooks/useAuth');
vi.mock('../../../hooks/useFollow');

const mockUseFollowing = useFollowing as Mock;
const mockUseAuth = useAuth as Mock;
const mockUseFollow = useFollow as Mock;

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('FollowingList', () => {
  const mockUsers = [
    { id: 'user-1', displayName: 'Alice Smith', followedAt: '2026-01-15T10:00:00Z' },
    { id: 'user-2', displayName: 'Bob Jones', followedAt: '2026-01-10T10:00:00Z' },
    { id: 'user-3', displayName: null, followedAt: '2026-01-05T10:00:00Z' },
  ];

  const defaultUseFollowingReturn = {
    users: mockUsers,
    total: 3,
    isLoading: false,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
  };

  const defaultUseAuthReturn = {
    user: { id: 'current-user', displayName: 'Current User' },
    isAuthenticated: true,
    isLoading: false,
  };

  const defaultUseFollowReturn = {
    isFollowing: false,
    isLoading: false,
    error: null,
    follow: vi.fn(),
    unfollow: vi.fn(),
    toggleFollow: vi.fn(),
    checkFollowStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFollowing.mockReturnValue(defaultUseFollowingReturn);
    mockUseAuth.mockReturnValue(defaultUseAuthReturn);
    mockUseFollow.mockReturnValue(defaultUseFollowReturn);
  });

  describe('Rendering', () => {
    it('should render list of following users', () => {
      renderWithRouter(<FollowingList userId="target-user" />);

      expect(screen.getByTestId('following-list')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Anonymous User')).toBeInTheDocument();
    });

    it('should display total count in header', () => {
      renderWithRouter(<FollowingList userId="target-user" />);

      expect(screen.getByText('Following')).toBeInTheDocument();
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('should render user list items', () => {
      renderWithRouter(<FollowingList userId="target-user" />);

      const items = screen.getAllByTestId('user-list-item');
      expect(items).toHaveLength(3);
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      mockUseFollowing.mockReturnValue({
        ...defaultUseFollowingReturn,
        users: [],
        isLoading: true,
      });

      renderWithRouter(<FollowingList userId="target-user" />);

      expect(screen.getByTestId('following-list-loading')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when error occurs', () => {
      mockUseFollowing.mockReturnValue({
        ...defaultUseFollowingReturn,
        users: [],
        error: 'Failed to load following',
      });

      renderWithRouter(<FollowingList userId="target-user" />);

      expect(screen.getByTestId('following-list-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load following')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when not following anyone', () => {
      mockUseFollowing.mockReturnValue({
        ...defaultUseFollowingReturn,
        users: [],
        total: 0,
      });

      renderWithRouter(<FollowingList userId="target-user" />);

      expect(screen.getByTestId('following-list-empty')).toBeInTheDocument();
      expect(screen.getByText('Not following anyone yet')).toBeInTheDocument();
    });

    it('should show custom empty message', () => {
      mockUseFollowing.mockReturnValue({
        ...defaultUseFollowingReturn,
        users: [],
        total: 0,
      });

      renderWithRouter(
        <FollowingList userId="target-user" emptyMessage="You haven't followed anyone" />,
      );

      expect(screen.getByText("You haven't followed anyone")).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should show load more button when hasMore is true', () => {
      mockUseFollowing.mockReturnValue({
        ...defaultUseFollowingReturn,
        hasMore: true,
      });

      renderWithRouter(<FollowingList userId="target-user" />);

      expect(screen.getByTestId('load-more-button')).toBeInTheDocument();
      expect(screen.getByText('Load more')).toBeInTheDocument();
    });

    it('should not show load more button when hasMore is false', () => {
      mockUseFollowing.mockReturnValue({
        ...defaultUseFollowingReturn,
        hasMore: false,
      });

      renderWithRouter(<FollowingList userId="target-user" />);

      expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument();
    });

    it('should call loadMore when button is clicked', async () => {
      const loadMore = vi.fn();
      mockUseFollowing.mockReturnValue({
        ...defaultUseFollowingReturn,
        hasMore: true,
        loadMore,
      });

      renderWithRouter(<FollowingList userId="target-user" />);
      await userEvent.click(screen.getByTestId('load-more-button'));

      expect(loadMore).toHaveBeenCalled();
    });

    it('should show loading text on button when loading more', () => {
      mockUseFollowing.mockReturnValue({
        ...defaultUseFollowingReturn,
        hasMore: true,
        isLoading: true,
      });

      renderWithRouter(<FollowingList userId="target-user" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Follow Buttons', () => {
    it('should show follow buttons by default', () => {
      renderWithRouter(<FollowingList userId="target-user" />);

      const followButtons = screen.getAllByTestId('follow-button');
      expect(followButtons.length).toBeGreaterThan(0);
    });

    it('should hide follow buttons when showFollowButtons is false', () => {
      renderWithRouter(<FollowingList userId="target-user" showFollowButtons={false} />);

      expect(screen.queryByTestId('follow-button')).not.toBeInTheDocument();
    });
  });

  describe('Hook Integration', () => {
    it('should pass userId to useFollowing hook', () => {
      renderWithRouter(<FollowingList userId="specific-user-id" />);

      expect(mockUseFollowing).toHaveBeenCalledWith('specific-user-id', expect.any(Object));
    });

    it('should pass pageSize to useFollowing hook', () => {
      renderWithRouter(<FollowingList userId="target-user" pageSize={10} />);

      expect(mockUseFollowing).toHaveBeenCalledWith('target-user', { pageSize: 10 });
    });
  });
});
