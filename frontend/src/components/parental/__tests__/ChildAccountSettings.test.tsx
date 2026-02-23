/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChildAccountSettings, ChildSettings } from '../ChildAccountSettings';

describe('ChildAccountSettings', () => {
  const defaultSettings: ChildSettings = {
    enabledFeatures: ['PROFILE_EDIT'],
    uiTheme: 'child-friendly',
    receiveActivityDigest: true,
    digestFrequency: 'weekly',
  };

  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all sections', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      expect(screen.getByTestId('child-account-settings')).toBeInTheDocument();
      expect(screen.getByText('Feature Permissions')).toBeInTheDocument();
      expect(screen.getByText('Interface Theme')).toBeInTheDocument();
      expect(screen.getByText('Activity Notifications')).toBeInTheDocument();
    });

    it('should render all feature toggles', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      expect(screen.getByTestId('feature-toggle-DM')).toBeInTheDocument();
      expect(screen.getByTestId('feature-toggle-USER_SEARCH')).toBeInTheDocument();
      expect(screen.getByTestId('feature-toggle-PROFILE_EDIT')).toBeInTheDocument();
      expect(screen.getByTestId('feature-toggle-SOCIAL_LINKS')).toBeInTheDocument();
      expect(screen.getByTestId('feature-toggle-EXTERNAL_LINKS')).toBeInTheDocument();
      expect(screen.getByTestId('feature-toggle-FILE_UPLOAD')).toBeInTheDocument();
    });

    it('should render theme options', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      expect(screen.getByTestId('theme-standard')).toBeInTheDocument();
      expect(screen.getByTestId('theme-child-friendly')).toBeInTheDocument();
    });

    it('should show digest frequency when digest is enabled', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      expect(screen.getByTestId('digest-frequency')).toBeInTheDocument();
      expect(screen.getByText('Daily')).toBeInTheDocument();
      expect(screen.getByText('Weekly')).toBeInTheDocument();
    });

    it('should hide digest frequency when digest is disabled', () => {
      const settingsWithoutDigest: ChildSettings = {
        ...defaultSettings,
        receiveActivityDigest: false,
      };

      render(<ChildAccountSettings settings={settingsWithoutDigest} onSave={mockOnSave} />);

      expect(screen.queryByTestId('digest-frequency')).not.toBeInTheDocument();
    });
  });

  describe('Feature Toggles', () => {
    it('should show correct initial toggle states', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      // PROFILE_EDIT should be enabled (checked)
      const profileSwitch = screen.getByLabelText('Toggle Profile Editing');
      expect(profileSwitch).toHaveAttribute('aria-checked', 'true');

      // DM should be disabled (unchecked)
      const dmSwitch = screen.getByLabelText('Toggle Direct Messages');
      expect(dmSwitch).toHaveAttribute('aria-checked', 'false');
    });

    it('should toggle feature on click', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      const dmSwitch = screen.getByLabelText('Toggle Direct Messages');
      expect(dmSwitch).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(dmSwitch);

      expect(dmSwitch).toHaveAttribute('aria-checked', 'true');
    });

    it('should show save button after change', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      expect(screen.queryByTestId('settings-actions')).not.toBeInTheDocument();

      const dmSwitch = screen.getByLabelText('Toggle Direct Messages');
      fireEvent.click(dmSwitch);

      expect(screen.getByTestId('settings-actions')).toBeInTheDocument();
    });
  });

  describe('Theme Selection', () => {
    it('should show selected theme state', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      const childFriendlyBtn = screen.getByTestId('theme-child-friendly');
      expect(childFriendlyBtn).toHaveClass('border-primary-500');
    });

    it('should change theme on click', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      const standardBtn = screen.getByTestId('theme-standard');
      fireEvent.click(standardBtn);

      expect(standardBtn).toHaveClass('border-primary-500');
      expect(screen.getByTestId('settings-actions')).toBeInTheDocument();
    });
  });

  describe('Activity Digest', () => {
    it('should toggle digest subscription', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      const digestToggle = screen.getByTestId('digest-toggle');
      expect(digestToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(digestToggle);

      expect(digestToggle).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('digest-frequency')).not.toBeInTheDocument();
    });

    it('should change digest frequency', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      const dailyRadio = screen.getByLabelText('Daily');
      const weeklyRadio = screen.getByLabelText('Weekly');

      expect(weeklyRadio).toBeChecked();
      expect(dailyRadio).not.toBeChecked();

      fireEvent.click(dailyRadio);

      expect(dailyRadio).toBeChecked();
      expect(weeklyRadio).not.toBeChecked();
    });
  });

  describe('Save and Reset', () => {
    it('should call onSave with updated settings', async () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      // Enable DM
      fireEvent.click(screen.getByLabelText('Toggle Direct Messages'));

      // Change theme
      fireEvent.click(screen.getByTestId('theme-standard'));

      // Save
      fireEvent.click(screen.getByTestId('save-settings'));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          enabledFeatures: ['PROFILE_EDIT', 'DM'],
          uiTheme: 'standard',
          receiveActivityDigest: true,
          digestFrequency: 'weekly',
        });
      });
    });

    it('should reset changes on reset button click', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      // Enable DM
      const dmSwitch = screen.getByLabelText('Toggle Direct Messages');
      fireEvent.click(dmSwitch);
      expect(dmSwitch).toHaveAttribute('aria-checked', 'true');

      // Reset
      fireEvent.click(screen.getByText('Reset'));

      // Should be back to original state
      expect(dmSwitch).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('settings-actions')).not.toBeInTheDocument();
    });

    it('should hide actions after successful save', async () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} />);

      fireEvent.click(screen.getByLabelText('Toggle Direct Messages'));
      expect(screen.getByTestId('settings-actions')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('save-settings'));

      await waitFor(() => {
        expect(screen.queryByTestId('settings-actions')).not.toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable all controls when disabled prop is true', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} disabled />);

      const dmSwitch = screen.getByLabelText('Toggle Direct Messages');
      expect(dmSwitch).toBeDisabled();

      const standardBtn = screen.getByTestId('theme-standard');
      expect(standardBtn).toBeDisabled();

      const digestToggle = screen.getByTestId('digest-toggle');
      expect(digestToggle).toBeDisabled();
    });

    it('should not toggle features when disabled', () => {
      render(<ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} disabled />);

      const dmSwitch = screen.getByLabelText('Toggle Direct Messages');
      fireEvent.click(dmSwitch);

      // Should still be unchecked
      expect(dmSwitch).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('settings-actions')).not.toBeInTheDocument();
    });
  });

  describe('Saving State', () => {
    it('should show loading spinner when saving', () => {
      render(
        <ChildAccountSettings settings={defaultSettings} onSave={mockOnSave} isSaving={true} />,
      );

      // Make a change to show save button
      fireEvent.click(screen.getByLabelText('Toggle Direct Messages'));

      const saveButton = screen.getByTestId('save-settings');
      expect(saveButton).toBeDisabled();
      expect(saveButton.querySelector('svg.animate-spin')).toBeInTheDocument();
    });
  });
});
