/**
 * Unit tests for TrustScoreBadge component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrustScoreBadge } from '../TrustScoreBadge';
import { VerificationLevel, UserStatus, type User } from '../../../types/user';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  verificationLevel: VerificationLevel.BASIC,
  trustScoreAbility: 0.7,
  trustScoreBenevolence: 0.6,
  trustScoreIntegrity: 0.8,
  status: UserStatus.ACTIVE,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
  ...overrides,
});

describe('TrustScoreBadge', () => {
  describe('Rendering', () => {
    it('should render overall trust score', () => {
      const user = createMockUser({
        trustScoreAbility: 0.7,
        trustScoreBenevolence: 0.6,
        trustScoreIntegrity: 0.8,
      });
      // Average = (70 + 60 + 80) / 3 = 70
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should render trust level label by default', () => {
      const user = createMockUser();
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('High Trust')).toBeInTheDocument();
    });

    it('should hide label when showLabel is false', () => {
      const user = createMockUser();
      render(<TrustScoreBadge user={user} showLabel={false} />);
      expect(screen.queryByText('Based on contributions')).not.toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render compact badge', () => {
      const user = createMockUser();
      render(<TrustScoreBadge user={user} compact />);
      // Compact mode has role="status"
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should render star emoji in compact mode', () => {
      const user = createMockUser();
      render(<TrustScoreBadge user={user} compact />);
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('should have aria-label in compact mode', () => {
      const user = createMockUser();
      render(<TrustScoreBadge user={user} compact />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Trust score: 70%');
    });
  });

  describe('Trust Levels', () => {
    it('should display "Very High Trust" for scores >= 80%', () => {
      const user = createMockUser({
        trustScoreAbility: 0.9,
        trustScoreBenevolence: 0.9,
        trustScoreIntegrity: 0.9,
      });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('Very High Trust')).toBeInTheDocument();
    });

    it('should display "High Trust" for scores 60-79%', () => {
      const user = createMockUser({
        trustScoreAbility: 0.7,
        trustScoreBenevolence: 0.7,
        trustScoreIntegrity: 0.7,
      });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('High Trust')).toBeInTheDocument();
    });

    it('should display "Medium Trust" for scores 40-59%', () => {
      const user = createMockUser({
        trustScoreAbility: 0.5,
        trustScoreBenevolence: 0.5,
        trustScoreIntegrity: 0.5,
      });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('Medium Trust')).toBeInTheDocument();
    });

    it('should display "Low Trust" for scores 20-39%', () => {
      const user = createMockUser({
        trustScoreAbility: 0.3,
        trustScoreBenevolence: 0.3,
        trustScoreIntegrity: 0.3,
      });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('Low Trust')).toBeInTheDocument();
    });

    it('should display "Very Low Trust" for scores < 20%', () => {
      const user = createMockUser({
        trustScoreAbility: 0.1,
        trustScoreBenevolence: 0.1,
        trustScoreIntegrity: 0.1,
      });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('Very Low Trust')).toBeInTheDocument();
    });
  });

  describe('Trustworthy Indicator', () => {
    it('should show "Trustworthy" for scores >= 60%', () => {
      const user = createMockUser({
        trustScoreAbility: 0.7,
        trustScoreBenevolence: 0.7,
        trustScoreIntegrity: 0.7,
      });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('✓ Trustworthy')).toBeInTheDocument();
    });

    it('should show "Low trust" for scores < 60%', () => {
      const user = createMockUser({
        trustScoreAbility: 0.4,
        trustScoreBenevolence: 0.4,
        trustScoreIntegrity: 0.4,
      });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('⚠ Low trust')).toBeInTheDocument();
    });
  });

  describe('Dimensional Breakdown', () => {
    it('should hide dimensions by default', () => {
      const user = createMockUser();
      render(<TrustScoreBadge user={user} />);
      expect(screen.queryByText('Ability')).not.toBeInTheDocument();
    });

    it('should show dimensions when showDimensions is true', () => {
      const user = createMockUser({
        trustScoreAbility: 0.7,
        trustScoreBenevolence: 0.6,
        trustScoreIntegrity: 0.8,
      });
      render(<TrustScoreBadge user={user} showDimensions />);
      // Verify dimension labels are present
      expect(screen.getByText('Ability')).toBeInTheDocument();
      expect(screen.getByText('Benevolence')).toBeInTheDocument();
      expect(screen.getByText('Integrity')).toBeInTheDocument();
      // Verify percentages exist (using getAllByText since overall score may share a value)
      const percentageElements = screen.getAllByText(/^\d+%$/);
      // Should have at least 4 percentages: overall + 3 dimensions
      expect(percentageElements.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Verification Badge', () => {
    it('should show verification badge by default', () => {
      const user = createMockUser({ verificationLevel: VerificationLevel.BASIC });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('Basic')).toBeInTheDocument();
    });

    it('should show "Verified" for VERIFIED_HUMAN level', () => {
      const user = createMockUser({ verificationLevel: VerificationLevel.VERIFIED_HUMAN });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('should show "Enhanced" for ENHANCED level', () => {
      const user = createMockUser({ verificationLevel: VerificationLevel.ENHANCED });
      render(<TrustScoreBadge user={user} />);
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
    });

    it('should hide verification badge when showVerification is false', () => {
      const user = createMockUser({ verificationLevel: VerificationLevel.VERIFIED_HUMAN });
      render(<TrustScoreBadge user={user} showVerification={false} />);
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply medium size by default', () => {
      const user = createMockUser();
      const { container } = render(<TrustScoreBadge user={user} />);
      // Medium size uses p-4
      const badge = container.firstChild;
      expect(badge).toHaveClass('p-4');
    });

    it('should apply small size', () => {
      const user = createMockUser();
      const { container } = render(<TrustScoreBadge user={user} size="sm" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('p-3');
    });

    it('should apply large size', () => {
      const user = createMockUser();
      const { container } = render(<TrustScoreBadge user={user} size="lg" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('p-6');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();
      const user = createMockUser();
      const { container } = render(<TrustScoreBadge user={user} onClick={onClick} />);

      await userEvent.click(container.firstChild as Element);
      expect(onClick).toHaveBeenCalled();
    });

    it('should have cursor pointer when onClick is provided', () => {
      const onClick = vi.fn();
      const user = createMockUser();
      const { container } = render(<TrustScoreBadge user={user} onClick={onClick} />);
      expect(container.firstChild).toHaveStyle({ cursor: 'pointer' });
    });

    it('should call onClick in compact mode', async () => {
      const onClick = vi.fn();
      const user = createMockUser();
      render(<TrustScoreBadge user={user} onClick={onClick} compact />);

      await userEvent.click(screen.getByRole('status'));
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const user = createMockUser();
      const { container } = render(<TrustScoreBadge user={user} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should apply custom className in compact mode', () => {
      const user = createMockUser();
      render(<TrustScoreBadge user={user} compact className="custom-compact" />);
      expect(screen.getByRole('status')).toHaveClass('custom-compact');
    });
  });

  describe('Color Coding', () => {
    it('should use green colors for very high trust', () => {
      const user = createMockUser({
        trustScoreAbility: 0.9,
        trustScoreBenevolence: 0.9,
        trustScoreIntegrity: 0.9,
      });
      const { container } = render(<TrustScoreBadge user={user} />);
      expect(container.firstChild).toHaveClass('bg-green-50');
    });

    it('should use red colors for very low trust', () => {
      const user = createMockUser({
        trustScoreAbility: 0.1,
        trustScoreBenevolence: 0.1,
        trustScoreIntegrity: 0.1,
      });
      const { container } = render(<TrustScoreBadge user={user} />);
      expect(container.firstChild).toHaveClass('bg-red-50');
    });
  });
});
