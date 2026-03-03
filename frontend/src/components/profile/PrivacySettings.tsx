/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PrivacySettings - Privacy settings form component
 *
 * Allows users to configure visibility of profile sections including
 * activity history, trust scores, and follower/following lists.
 *
 * @remarks
 * **Privacy Model:**
 * - Activity History: PUBLIC | FOLLOWERS_ONLY | PRIVATE
 * - Trust Scores: PUBLIC | FOLLOWERS_ONLY (never PRIVATE for platform integrity)
 * - Follower/Following Lists: PUBLIC | FOLLOWERS_ONLY | PRIVATE
 *
 * **Constraints:**
 * - Trust scores cannot be set to PRIVATE because they're essential for
 *   establishing credibility in discussions. This is enforced at both
 *   type level (TrustVisibility) and UI level (disablePrivate prop).
 *
 * **Accessibility:**
 * - Uses PrivacyToggle with full keyboard navigation (arrow keys)
 * - ARIA radiogroup pattern for each setting
 * - Loading skeleton shown when settings are null
 *
 * @example
 * ```tsx
 * <PrivacySettings
 *   settings={privacySettings}
 *   onChange={(field, value) => updatePrivacy({ [field]: value })}
 *   disabled={isSaving}
 * />
 * ```
 */

import type {
  PrivacySettings as PrivacySettingsType,
  ProfileVisibility,
  TrustVisibility,
} from '../../types/user';
import { InfoIcon } from '../ui/InfoIcon';
import { PrivacyToggle } from './PrivacyToggle';

export interface PrivacySettingsProps {
  /** Current privacy settings */
  settings: PrivacySettingsType | null;
  /** Callback when a setting changes */
  onChange: (field: keyof PrivacySettingsType, value: ProfileVisibility | TrustVisibility) => void;
  /** Whether the form is disabled (during save) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PrivacySettings form component
 */
export function PrivacySettings({
  settings,
  onChange,
  disabled = false,
  className = '',
}: PrivacySettingsProps) {
  // Handle null settings gracefully (loading state)
  if (!settings) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Section header - always visible for loading context */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>🔐</span>
            Privacy Settings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Control who can see different parts of your profile
          </p>
        </div>
        {/* Loading skeleton for settings */}
        <div className="animate-pulse space-y-6">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Section header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span>🔐</span>
          Privacy Settings
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Control who can see different parts of your profile
        </p>
      </div>

      {/* Activity History */}
      <PrivacyToggle
        label="Activity History"
        description="Your topics, responses, and contributions"
        value={settings.activityHistory}
        onChange={(value) => onChange('activityHistory', value)}
        disabled={disabled}
      />

      {/* Trust Scores - PRIVATE disabled */}
      <div>
        <PrivacyToggle
          label="Detailed Trust Scores"
          description="Your Ability, Benevolence, and Integrity breakdown"
          value={settings.detailedTrustScores}
          onChange={(value) => onChange('detailedTrustScores', value)}
          disablePrivate={true}
          disabled={disabled}
        />
        <div className="flex items-start gap-2 mt-2 text-xs text-amber-600 dark:text-amber-400">
          <InfoIcon
            content="Trust scores help maintain platform integrity. Overall trust level is always visible, but detailed breakdown can be limited to followers."
            size="sm"
          />
          <span>Trust scores cannot be fully private to maintain platform transparency</span>
        </div>
      </div>

      {/* Follower List */}
      <PrivacyToggle
        label="Follower List"
        description="People who follow you"
        value={settings.followerList}
        onChange={(value) => onChange('followerList', value)}
        disabled={disabled}
      />

      {/* Following List */}
      <PrivacyToggle
        label="Following List"
        description="People you follow"
        value={settings.followingList}
        onChange={(value) => onChange('followingList', value)}
        disabled={disabled}
      />
    </div>
  );
}

export default PrivacySettings;
