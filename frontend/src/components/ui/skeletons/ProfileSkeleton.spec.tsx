import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfileSkeleton from './ProfileSkeleton';

const renderWithRouter = (ui: React.ReactNode) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ProfileSkeleton', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      renderWithRouter(<ProfileSkeleton />);
      const skeleton = screen.getByTestId('profile-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render profile header card', () => {
      renderWithRouter(<ProfileSkeleton />);
      const header = screen.getByTestId('profile-skeleton-header');
      expect(header).toBeInTheDocument();
    });

    it('should render title skeleton', () => {
      renderWithRouter(<ProfileSkeleton />);
      const title = screen.getByTestId('profile-skeleton-title');
      expect(title).toBeInTheDocument();
    });

    it('should render avatar skeleton', () => {
      renderWithRouter(<ProfileSkeleton />);
      const avatar = screen.getByTestId('profile-skeleton-avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('should render name skeleton', () => {
      renderWithRouter(<ProfileSkeleton />);
      const name = screen.getByTestId('profile-skeleton-name');
      expect(name).toBeInTheDocument();
    });

    it('should render email skeleton', () => {
      renderWithRouter(<ProfileSkeleton />);
      const email = screen.getByTestId('profile-skeleton-email');
      expect(email).toBeInTheDocument();
    });
  });

  describe('Trust Scores Section', () => {
    it('should render trust scores card', () => {
      renderWithRouter(<ProfileSkeleton />);
      const trustScores = screen.getByTestId('profile-skeleton-trust-scores');
      expect(trustScores).toBeInTheDocument();
    });

    it('should render ability trust score skeleton', () => {
      renderWithRouter(<ProfileSkeleton />);
      const ability = screen.getByTestId('profile-skeleton-trust-ability');
      expect(ability).toBeInTheDocument();
    });

    it('should render benevolence trust score skeleton', () => {
      renderWithRouter(<ProfileSkeleton />);
      const benevolence = screen.getByTestId('profile-skeleton-trust-benevolence');
      expect(benevolence).toBeInTheDocument();
    });

    it('should render integrity trust score skeleton', () => {
      renderWithRouter(<ProfileSkeleton />);
      const integrity = screen.getByTestId('profile-skeleton-trust-integrity');
      expect(integrity).toBeInTheDocument();
    });

    it('should have 3 progress bar skeletons', () => {
      renderWithRouter(<ProfileSkeleton />);
      const trustScores = screen.getByTestId('profile-skeleton-trust-scores');
      // Each trust score has a progress bar (rounded-full skeleton)
      const progressBars = trustScores.querySelectorAll('.rounded-full');
      expect(progressBars.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Activity Section', () => {
    it('should show activity section by default', () => {
      renderWithRouter(<ProfileSkeleton />);
      const activity = screen.getByTestId('profile-skeleton-activity');
      expect(activity).toBeInTheDocument();
    });

    it('should hide activity section when showActivity is false', () => {
      renderWithRouter(<ProfileSkeleton showActivity={false} />);
      const activity = screen.queryByTestId('profile-skeleton-activity');
      expect(activity).not.toBeInTheDocument();
    });

    it('should have 4 stat items in activity grid', () => {
      renderWithRouter(<ProfileSkeleton />);
      const activity = screen.getByTestId('profile-skeleton-activity');
      const statItems = activity.querySelectorAll('.text-center');
      expect(statItems).toHaveLength(4);
    });
  });

  describe('Avatar', () => {
    it('should render circular avatar skeleton', () => {
      renderWithRouter(<ProfileSkeleton />);
      const avatar = screen.getByTestId('profile-skeleton-avatar');
      expect(avatar).toHaveClass('rounded-full');
    });

    it('should render xl size avatar', () => {
      renderWithRouter(<ProfileSkeleton />);
      const avatar = screen.getByTestId('profile-skeleton-avatar');
      // xl size is w-24 h-24
      expect(avatar).toHaveClass('w-24');
      expect(avatar).toHaveClass('h-24');
    });
  });

  describe('Animation', () => {
    it('should have pulse animation on avatar', () => {
      renderWithRouter(<ProfileSkeleton />);
      const avatar = screen.getByTestId('profile-skeleton-avatar');
      expect(avatar).toHaveClass('animate-pulse');
    });

    it('should have pulse animation on title', () => {
      renderWithRouter(<ProfileSkeleton />);
      const title = screen.getByTestId('profile-skeleton-title');
      expect(title).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible loading indicators', () => {
      renderWithRouter(<ProfileSkeleton />);
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('should have aria-busy on skeleton sections', () => {
      renderWithRouter(<ProfileSkeleton />);
      const statusElements = screen.getAllByRole('status');
      expect(statusElements[0]).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      renderWithRouter(<ProfileSkeleton className="my-custom-class" />);
      const skeleton = screen.getByTestId('profile-skeleton');
      expect(skeleton).toHaveClass('my-custom-class');
    });

    it('should accept custom data-testid', () => {
      renderWithRouter(<ProfileSkeleton data-testid="custom-profile" />);
      const skeleton = screen.getByTestId('custom-profile');
      expect(skeleton).toBeInTheDocument();
    });

    it('should have max-w-4xl for consistent width', () => {
      renderWithRouter(<ProfileSkeleton />);
      const skeleton = screen.getByTestId('profile-skeleton');
      expect(skeleton).toHaveClass('max-w-4xl');
    });

    it('should have vertical spacing between cards', () => {
      renderWithRouter(<ProfileSkeleton />);
      const skeleton = screen.getByTestId('profile-skeleton');
      expect(skeleton).toHaveClass('space-y-6');
    });
  });

  describe('Layout Grid', () => {
    it('should have responsive grid for info section', () => {
      renderWithRouter(<ProfileSkeleton />);
      const header = screen.getByTestId('profile-skeleton-header');
      const gridElement = header.querySelector('.grid');
      expect(gridElement).toHaveClass('md:grid-cols-2');
    });

    it('should have responsive grid for activity section', () => {
      renderWithRouter(<ProfileSkeleton />);
      const activity = screen.getByTestId('profile-skeleton-activity');
      const gridElement = activity.querySelector('.grid');
      expect(gridElement).toHaveClass('md:grid-cols-4');
    });
  });
});
