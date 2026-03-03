/**
 * Unit tests for ProfileHeader component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileHeader } from '../ProfileHeader';
import type { UserProfile } from '../../../types/user';
import { VerificationLevel, UserStatus } from '../../../types/user';

// Mock child components
vi.mock('../../ui/Avatar', () => ({
  default: ({ alt, size, className }: { alt: string; size: string; className?: string }) => (
    <div data-testid="avatar" data-alt={alt} data-size={size} className={className} />
  ),
}));

vi.mock('../../users', () => ({
  FollowButton: ({
    userId,
    userName,
    onFollowChange,
  }: {
    userId: string;
    userName?: string;
    onFollowChange?: (isFollowing: boolean) => void;
  }) => (
    <button
      data-testid="follow-button"
      data-user-id={userId}
      data-user-name={userName}
      onClick={() => onFollowChange?.(true)}
    >
      Follow
    </button>
  ),
}));

vi.mock('../../ranking/TierBadge', () => ({
  default: ({ tier, size }: { tier: string; size: string }) => (
    <span data-testid="tier-badge" data-tier={tier} data-size={size}>
      {tier}
    </span>
  ),
}));

describe('ProfileHeader', () => {
  const mockUser: UserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    bio: 'Test bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    verificationLevel: VerificationLevel.BASIC,
    trustScoreAbility: 0.8,
    trustScoreBenevolence: 0.7,
    trustScoreIntegrity: 0.9,
    status: UserStatus.ACTIVE,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
    followerCount: 42,
    followingCount: 17,
    topicCount: 5,
    responseCount: 23,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render user display name', () => {
      render(<ProfileHeader user={mockUser} />);
      expect(screen.getByRole('heading', { name: 'Test User' })).toBeInTheDocument();
    });

    it('should render avatar with correct props', () => {
      render(<ProfileHeader user={mockUser} />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveAttribute('data-alt', 'Test User');
      expect(avatar).toHaveAttribute('data-size', 'xl');
    });

    it('should render bio when present', () => {
      render(<ProfileHeader user={mockUser} />);
      expect(screen.getByText('Test bio')).toBeInTheDocument();
    });

    it('should not render bio when absent', () => {
      const userWithoutBio = { ...mockUser, bio: undefined };
      render(<ProfileHeader user={userWithoutBio} />);
      expect(screen.queryByText('Test bio')).not.toBeInTheDocument();
    });

    it('should render member since date', () => {
      render(<ProfileHeader user={mockUser} />);
      expect(screen.getByText(/Member since January 2024/)).toBeInTheDocument();
    });

    it('should render follower count', () => {
      render(<ProfileHeader user={mockUser} />);
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('followers')).toBeInTheDocument();
    });

    it('should render following count', () => {
      render(<ProfileHeader user={mockUser} />);
      expect(screen.getByText('17')).toBeInTheDocument();
      expect(screen.getByText('following')).toBeInTheDocument();
    });

    it('should render tier badge when tierLevel is provided', () => {
      render(<ProfileHeader user={mockUser} tierLevel="TRUSTED" />);
      const badge = screen.getByTestId('tier-badge');
      expect(badge).toHaveAttribute('data-tier', 'TRUSTED');
    });

    it('should not render tier badge when tierLevel is undefined', () => {
      render(<ProfileHeader user={mockUser} />);
      expect(screen.queryByTestId('tier-badge')).not.toBeInTheDocument();
    });
  });

  describe('Verification Badge', () => {
    it('should render verified badge for VERIFIED_HUMAN users', () => {
      const verifiedUser = { ...mockUser, verificationLevel: VerificationLevel.VERIFIED_HUMAN };
      render(<ProfileHeader user={verifiedUser} />);
      expect(screen.getByText('✓ Verified')).toBeInTheDocument();
    });

    it('should not render verified badge for BASIC users', () => {
      render(<ProfileHeader user={mockUser} />);
      expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument();
    });

    it('should not render verified badge for ENHANCED users', () => {
      const enhancedUser = { ...mockUser, verificationLevel: VerificationLevel.ENHANCED };
      render(<ProfileHeader user={enhancedUser} />);
      expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument();
    });
  });

  describe('Actions - Own Profile', () => {
    it('should render Edit Profile button for own profile', () => {
      render(<ProfileHeader user={mockUser} isOwnProfile={true} />);
      expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
    });

    it('should not render Follow button for own profile', () => {
      render(<ProfileHeader user={mockUser} isOwnProfile={true} />);
      expect(screen.queryByTestId('follow-button')).not.toBeInTheDocument();
    });

    it('should call onEditClick when Edit Profile is clicked', async () => {
      const onEditClick = vi.fn();
      render(<ProfileHeader user={mockUser} isOwnProfile={true} onEditClick={onEditClick} />);

      await userEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
      expect(onEditClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Actions - Other Profile', () => {
    it('should render Follow button for other profile', () => {
      render(<ProfileHeader user={mockUser} isOwnProfile={false} />);
      expect(screen.getByTestId('follow-button')).toBeInTheDocument();
    });

    it('should not render Edit Profile button for other profile', () => {
      render(<ProfileHeader user={mockUser} isOwnProfile={false} />);
      expect(screen.queryByRole('button', { name: 'Edit Profile' })).not.toBeInTheDocument();
    });

    it('should pass correct props to FollowButton', () => {
      render(<ProfileHeader user={mockUser} isOwnProfile={false} />);
      const followButton = screen.getByTestId('follow-button');
      expect(followButton).toHaveAttribute('data-user-id', 'user-123');
      expect(followButton).toHaveAttribute('data-user-name', 'Test User');
    });

    it('should call onFollowChange when follow state changes', async () => {
      const onFollowChange = vi.fn();
      render(
        <ProfileHeader user={mockUser} isOwnProfile={false} onFollowChange={onFollowChange} />,
      );

      await userEvent.click(screen.getByTestId('follow-button'));
      expect(onFollowChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Follower/Following Clicks', () => {
    it('should call onFollowersClick when followers count is clicked', async () => {
      const onFollowersClick = vi.fn();
      render(<ProfileHeader user={mockUser} onFollowersClick={onFollowersClick} />);

      const followersButton = screen.getByRole('button', { name: /42 followers/i });
      await userEvent.click(followersButton);
      expect(onFollowersClick).toHaveBeenCalledTimes(1);
    });

    it('should call onFollowingClick when following count is clicked', async () => {
      const onFollowingClick = vi.fn();
      render(<ProfileHeader user={mockUser} onFollowingClick={onFollowingClick} />);

      const followingButton = screen.getByRole('button', { name: /17 following/i });
      await userEvent.click(followingButton);
      expect(onFollowingClick).toHaveBeenCalledTimes(1);
    });

    it('should disable followers button when onFollowersClick is not provided', () => {
      render(<ProfileHeader user={mockUser} />);
      const followersButton = screen.getByRole('button', { name: /42 followers/i });
      expect(followersButton).toBeDisabled();
    });

    it('should disable following button when onFollowingClick is not provided', () => {
      render(<ProfileHeader user={mockUser} />);
      const followingButton = screen.getByRole('button', { name: /17 following/i });
      expect(followingButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined follower count', () => {
      const userNoFollowers = { ...mockUser, followerCount: undefined };
      render(<ProfileHeader user={userNoFollowers} />);
      expect(screen.queryByText('followers')).not.toBeInTheDocument();
    });

    it('should handle undefined following count', () => {
      const userNoFollowing = { ...mockUser, followingCount: undefined };
      render(<ProfileHeader user={userNoFollowing} />);
      expect(screen.queryByText('following')).not.toBeInTheDocument();
    });

    it('should handle zero follower count', () => {
      const userZeroFollowers = { ...mockUser, followerCount: 0 };
      render(<ProfileHeader user={userZeroFollowers} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('followers')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<ProfileHeader user={mockUser} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have h1 heading for user name', () => {
      render(<ProfileHeader user={mockUser} />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test User');
    });

    it('should have accessible follower/following buttons', () => {
      render(
        <ProfileHeader user={mockUser} onFollowersClick={() => {}} onFollowingClick={() => {}} />,
      );

      expect(screen.getByRole('button', { name: /followers/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /following/i })).not.toBeDisabled();
    });

    it('should have focus-visible styling classes', () => {
      render(
        <ProfileHeader user={mockUser} onFollowersClick={() => {}} onFollowingClick={() => {}} />,
      );

      const followersButton = screen.getByRole('button', { name: /followers/i });
      expect(followersButton.className).toContain('focus-visible:ring');
    });
  });

  describe('Responsive Layout', () => {
    it('should have flex layout classes', () => {
      const { container } = render(<ProfileHeader user={mockUser} />);
      expect(container.firstChild).toHaveClass('flex', 'flex-col', 'sm:flex-row');
    });

    it('should have text alignment classes for responsive', () => {
      const { container } = render(<ProfileHeader user={mockUser} />);
      // User info section has text-center on mobile, text-left on desktop
      const userInfo = container.querySelector('.flex-1');
      expect(userInfo).toHaveClass('text-center', 'sm:text-left');
    });
  });
});
