/**
 * Unit tests for FollowersList component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { FollowersList } from '../FollowersList';
import { useFollowers } from '../../../hooks/useFollowers';
import { useAuth } from '../../../hooks/useAuth';
import { useFollow } from '../../../hooks/useFollow';

// Mock the hooks
vi.mock('../../../hooks/useFollowers');
vi.mock('../../../hooks/useAuth');
vi.mock('../../../hooks/useFollow');
vi.mock('../../../hooks/useRequireAuth', () => ({
  useRequireAuth: () => ({
    requireAuth: (callback: () => void) => callback(),
    isAuthenticated: true,
    user: { id: 'current-user' },
  }),
  default: () => ({
    requireAuth: (callback: () => void) => callback(),
    isAuthenticated: true,
    user: { id: 'current-user' },
  }),
}));

const mockUseFollowers = useFollowers as Mock;
const mockUseAuth = useAuth as Mock;
const mockUseFollow = useFollow as Mock;

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('FollowersList', () => {
  const mockUsers = [
    { id: 'user-1', displayName: 'Alice Smith', followedAt: '2026-01-15T10:00:00Z' },
    { id: 'user-2', displayName: 'Bob Jones', followedAt: '2026-01-10T10:00:00Z' },
    { id: 'user-3', displayName: null, followedAt: '2026-01-05T10:00:00Z' },
  ];

  const defaultUseFollowersReturn = {
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
    mockUseFollowers.mockReturnValue(defaultUseFollowersReturn);
    mockUseAuth.mockReturnValue(defaultUseAuthReturn);
    mockUseFollow.mockReturnValue(defaultUseFollowReturn);
  });

  describe('Rendering', () => {
    it('should render list of followers', () => {
      renderWithRouter(<FollowersList userId="target-user" />);

      expect(screen.getByTestId('followers-list')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Anonymous User')).toBeInTheDocument();
    });

    it('should display total count in header', () => {
      renderWithRouter(<FollowersList userId="target-user" />);

      expect(screen.getByText('Followers')).toBeInTheDocument();
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('should render user list items', () => {
      renderWithRouter(<FollowersList userId="target-user" />);

      const items = screen.getAllByTestId('user-list-item');
      expect(items).toHaveLength(3);
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      mockUseFollowers.mockReturnValue({
        ...defaultUseFollowersReturn,
        users: [],
        isLoading: true,
      });

      renderWithRouter(<FollowersList userId="target-user" />);

      expect(screen.getByTestId('followers-list-loading')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when error occurs', () => {
      mockUseFollowers.mockReturnValue({
        ...defaultUseFollowersReturn,
        users: [],
        error: 'Failed to load followers',
      });

      renderWithRouter(<FollowersList userId="target-user" />);

      expect(screen.getByTestId('followers-list-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load followers')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no followers', () => {
      mockUseFollowers.mockReturnValue({
        ...defaultUseFollowersReturn,
        users: [],
        total: 0,
      });

      renderWithRouter(<FollowersList userId="target-user" />);

      expect(screen.getByTestId('followers-list-empty')).toBeInTheDocument();
      expect(screen.getByText('No followers yet')).toBeInTheDocument();
    });

    it('should show custom empty message', () => {
      mockUseFollowers.mockReturnValue({
        ...defaultUseFollowersReturn,
        users: [],
        total: 0,
      });

      renderWithRouter(
        <FollowersList userId="target-user" emptyMessage="This user has no followers" />,
      );

      expect(screen.getByText('This user has no followers')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should show load more button when hasMore is true', () => {
      mockUseFollowers.mockReturnValue({
        ...defaultUseFollowersReturn,
        hasMore: true,
      });

      renderWithRouter(<FollowersList userId="target-user" />);

      expect(screen.getByTestId('load-more-button')).toBeInTheDocument();
      expect(screen.getByText('Load more')).toBeInTheDocument();
    });

    it('should not show load more button when hasMore is false', () => {
      mockUseFollowers.mockReturnValue({
        ...defaultUseFollowersReturn,
        hasMore: false,
      });

      renderWithRouter(<FollowersList userId="target-user" />);

      expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument();
    });

    it('should call loadMore when button is clicked', async () => {
      const loadMore = vi.fn();
      mockUseFollowers.mockReturnValue({
        ...defaultUseFollowersReturn,
        hasMore: true,
        loadMore,
      });

      renderWithRouter(<FollowersList userId="target-user" />);
      await userEvent.click(screen.getByTestId('load-more-button'));

      expect(loadMore).toHaveBeenCalled();
    });

    it('should show loading text on button when loading more', () => {
      mockUseFollowers.mockReturnValue({
        ...defaultUseFollowersReturn,
        hasMore: true,
        isLoading: true,
      });

      renderWithRouter(<FollowersList userId="target-user" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Follow Buttons', () => {
    it('should show follow buttons by default', () => {
      renderWithRouter(<FollowersList userId="target-user" />);

      const followButtons = screen.getAllByTestId('follow-button');
      expect(followButtons.length).toBeGreaterThan(0);
    });

    it('should hide follow buttons when showFollowButtons is false', () => {
      renderWithRouter(<FollowersList userId="target-user" showFollowButtons={false} />);

      expect(screen.queryByTestId('follow-button')).not.toBeInTheDocument();
    });
  });

  describe('Hook Integration', () => {
    it('should pass userId to useFollowers hook', () => {
      renderWithRouter(<FollowersList userId="specific-user-id" />);

      expect(mockUseFollowers).toHaveBeenCalledWith('specific-user-id', expect.any(Object));
    });

    it('should pass pageSize to useFollowers hook', () => {
      renderWithRouter(<FollowersList userId="target-user" pageSize={10} />);

      expect(mockUseFollowers).toHaveBeenCalledWith('target-user', { pageSize: 10 });
    });
  });
});
