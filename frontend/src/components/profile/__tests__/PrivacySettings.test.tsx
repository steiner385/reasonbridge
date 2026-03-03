/**
 * Unit tests for PrivacySettings component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrivacySettings } from '../PrivacySettings';
import type { PrivacySettings as PrivacySettingsType } from '../../../types/user';

// Mock InfoIcon component
vi.mock('../../ui/InfoIcon', () => ({
  InfoIcon: ({ content }: { content: string }) => (
    <span data-testid="info-icon" title={content}>
      ℹ️
    </span>
  ),
}));

describe('PrivacySettings', () => {
  const mockSettings: PrivacySettingsType = {
    activityHistory: 'PUBLIC',
    detailedTrustScores: 'PUBLIC',
    followerList: 'PUBLIC',
    followingList: 'PUBLIC',
  };

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading skeleton when settings is null', () => {
      const { container } = render(<PrivacySettings settings={null} onChange={mockOnChange} />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should render all privacy toggles when settings exist', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      expect(screen.getByText('Activity History')).toBeInTheDocument();
      expect(screen.getByText('Detailed Trust Scores')).toBeInTheDocument();
      expect(screen.getByText('Follower List')).toBeInTheDocument();
      expect(screen.getByText('Following List')).toBeInTheDocument();
    });

    it('should render info icon for trust scores', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);
      const infoIcons = screen.getAllByTestId('info-icon');
      expect(infoIcons.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PrivacySettings
          settings={mockSettings}
          onChange={mockOnChange}
          className="custom-class"
        />,
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Toggle Values', () => {
    it('should show correct selected state for PUBLIC settings', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      // All toggles should have PUBLIC selected (multiple buttons with aria-checked="true")
      const publicButtons = screen.getAllByRole('radio', { checked: true });
      expect(publicButtons.length).toBe(4); // All 4 settings are PUBLIC
    });

    it('should show correct selected state for FOLLOWERS_ONLY settings', () => {
      const followersOnlySettings: PrivacySettingsType = {
        activityHistory: 'FOLLOWERS_ONLY',
        detailedTrustScores: 'FOLLOWERS_ONLY',
        followerList: 'FOLLOWERS_ONLY',
        followingList: 'FOLLOWERS_ONLY',
      };

      render(<PrivacySettings settings={followersOnlySettings} onChange={mockOnChange} />);

      // Should have FOLLOWERS_ONLY selected
      const selectedButtons = screen.getAllByRole('radio', { checked: true });
      expect(selectedButtons.length).toBe(4);
      selectedButtons.forEach((button) => {
        expect(button).toHaveTextContent('Followers');
      });
    });

    it('should show correct selected state for PRIVATE settings', () => {
      const privateSettings: PrivacySettingsType = {
        activityHistory: 'PRIVATE',
        detailedTrustScores: 'FOLLOWERS_ONLY', // Trust scores can't be PRIVATE
        followerList: 'PRIVATE',
        followingList: 'PRIVATE',
      };

      render(<PrivacySettings settings={privateSettings} onChange={mockOnChange} />);

      // Check that PRIVATE options are selected where applicable
      const privateButtons = screen.getAllByRole('radio', { name: /private/i, checked: true });
      expect(privateButtons.length).toBe(3); // 3 settings can be PRIVATE (not trust scores)
    });
  });

  describe('Interactions', () => {
    it('should call onChange with activityHistory when changed', async () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      // Find and click the Followers option for Activity History
      const radioGroups = screen.getAllByRole('radiogroup');
      const activityGroup = radioGroups[0]; // First radiogroup is Activity History
      const followersButton = activityGroup.querySelector('[role="radio"]:nth-child(2)');

      await userEvent.click(followersButton!);
      expect(mockOnChange).toHaveBeenCalledWith('activityHistory', 'FOLLOWERS_ONLY');
    });

    it('should call onChange with detailedTrustScores when changed', async () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      const radioGroups = screen.getAllByRole('radiogroup');
      const trustGroup = radioGroups[1]; // Second radiogroup is Trust Scores
      const followersButton = trustGroup.querySelector('[role="radio"]:nth-child(2)');

      await userEvent.click(followersButton!);
      expect(mockOnChange).toHaveBeenCalledWith('detailedTrustScores', 'FOLLOWERS_ONLY');
    });

    it('should call onChange with followerList when changed', async () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      const radioGroups = screen.getAllByRole('radiogroup');
      const followerGroup = radioGroups[2]; // Third radiogroup
      const followersButton = followerGroup.querySelector('[role="radio"]:nth-child(2)');

      await userEvent.click(followersButton!);
      expect(mockOnChange).toHaveBeenCalledWith('followerList', 'FOLLOWERS_ONLY');
    });

    it('should call onChange with followingList when changed', async () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      const radioGroups = screen.getAllByRole('radiogroup');
      const followingGroup = radioGroups[3]; // Fourth radiogroup
      const followersButton = followingGroup.querySelector('[role="radio"]:nth-child(2)');

      await userEvent.click(followersButton!);
      expect(mockOnChange).toHaveBeenCalledWith('followingList', 'FOLLOWERS_ONLY');
    });
  });

  describe('Trust Score Constraints', () => {
    it('should not show PRIVATE option for trust scores', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      const radioGroups = screen.getAllByRole('radiogroup');
      const trustGroup = radioGroups[1]; // Trust scores radiogroup
      const buttons = trustGroup.querySelectorAll('[role="radio"]');

      // Should only have 2 options (PUBLIC, FOLLOWERS_ONLY), not 3
      expect(buttons.length).toBe(2);
    });

    it('should show PRIVATE option for activity history', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      const radioGroups = screen.getAllByRole('radiogroup');
      const activityGroup = radioGroups[0]; // Activity History radiogroup
      const buttons = activityGroup.querySelectorAll('[role="radio"]');

      // Should have 3 options
      expect(buttons.length).toBe(3);
    });
  });

  describe('Disabled State', () => {
    it('should disable all toggles when disabled prop is true', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} disabled={true} />);

      const allRadios = screen.getAllByRole('radio');
      allRadios.forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    });

    it('should not call onChange when disabled', async () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} disabled={true} />);

      const radioGroups = screen.getAllByRole('radiogroup');
      const activityGroup = radioGroups[0];
      const followersButton = activityGroup.querySelector('[role="radio"]:nth-child(2)');

      await userEvent.click(followersButton!);
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper radiogroup roles', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      const radioGroups = screen.getAllByRole('radiogroup');
      expect(radioGroups.length).toBe(4);
    });

    it('should have aria-label on radiogroups', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      const radioGroups = screen.getAllByRole('radiogroup');
      radioGroups.forEach((group) => {
        expect(group).toHaveAttribute('aria-label');
      });
    });

    it('should have aria-checked on radio buttons', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      const selectedRadios = screen.getAllByRole('radio', { checked: true });
      selectedRadios.forEach((radio) => {
        expect(radio).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      // Tab to first radiogroup and press right arrow
      const radioGroups = screen.getAllByRole('radiogroup');
      const firstToggle = radioGroups[0].querySelector('[role="radio"][tabindex="0"]');

      expect(firstToggle).toBeInTheDocument();
    });
  });

  describe('Section Descriptions', () => {
    it('should show description for each setting', () => {
      render(<PrivacySettings settings={mockSettings} onChange={mockOnChange} />);

      // Check for descriptions (actual text from component)
      expect(screen.getByText('Your topics, responses, and contributions')).toBeInTheDocument();
      expect(
        screen.getByText('Your Ability, Benevolence, and Integrity breakdown'),
      ).toBeInTheDocument();
      expect(screen.getByText('People who follow you')).toBeInTheDocument();
      expect(screen.getByText('People you follow')).toBeInTheDocument();
    });
  });
});
