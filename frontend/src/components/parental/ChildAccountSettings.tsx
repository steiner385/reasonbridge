/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';

/**
 * Features that can be toggled by parents
 */
export type SettableFeature =
  | 'DM'
  | 'USER_SEARCH'
  | 'PROFILE_EDIT'
  | 'SOCIAL_LINKS'
  | 'EXTERNAL_LINKS'
  | 'FILE_UPLOAD';

export interface ChildSettings {
  /** Features that are enabled (not restricted) for this child */
  enabledFeatures: SettableFeature[];
  /** UI theme preference */
  uiTheme: 'standard' | 'child-friendly';
  /** Whether to receive activity digest emails */
  receiveActivityDigest: boolean;
  /** Frequency of activity digest */
  digestFrequency: 'daily' | 'weekly';
}

export interface ChildAccountSettingsProps {
  /** Current settings for the child */
  settings: ChildSettings;
  /** Callback when settings are saved */
  onSave: (settings: ChildSettings) => Promise<void>;
  /** Whether the component is in a saving state */
  isSaving?: boolean;
  /** Whether the component is disabled (e.g., consent withdrawn) */
  disabled?: boolean;
}

const FEATURE_INFO: Record<SettableFeature, { label: string; description: string; icon: string }> =
  {
    DM: {
      label: 'Direct Messages',
      description: 'Allow private messaging with other users',
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    },
    USER_SEARCH: {
      label: 'User Search',
      description: 'Allow searching for other users by name',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    },
    PROFILE_EDIT: {
      label: 'Profile Editing',
      description: 'Allow editing profile information and bio',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
    SOCIAL_LINKS: {
      label: 'Social Links',
      description: 'Allow adding social media links to profile',
      icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    },
    EXTERNAL_LINKS: {
      label: 'External Links',
      description: 'Allow posting links to external websites',
      icon: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
    },
    FILE_UPLOAD: {
      label: 'File Upload',
      description: 'Allow uploading files and images',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
  };

const ALL_FEATURES: SettableFeature[] = [
  'DM',
  'USER_SEARCH',
  'PROFILE_EDIT',
  'SOCIAL_LINKS',
  'EXTERNAL_LINKS',
  'FILE_UPLOAD',
];

/**
 * ChildAccountSettings - Parental controls for child account features
 *
 * @remarks
 * Allows parents to manage their child's account settings:
 * - Toggle individual features (DM, search, profile editing, etc.)
 * - Set UI theme preference
 * - Configure activity digest notifications
 *
 * **Design:**
 * - Clear toggle switches with feature descriptions
 * - Grouped sections for related settings
 * - Disabled state when consent is withdrawn
 *
 * @param props - Component props
 * @returns Rendered settings component
 *
 * @example
 * ```tsx
 * <ChildAccountSettings
 *   settings={{ enabledFeatures: ['PROFILE_EDIT'], uiTheme: 'child-friendly', ... }}
 *   onSave={async (settings) => await api.updateSettings(settings)}
 * />
 * ```
 */
export function ChildAccountSettings({
  settings,
  onSave,
  isSaving = false,
  disabled = false,
}: ChildAccountSettingsProps): React.ReactElement {
  const [localSettings, setLocalSettings] = useState<ChildSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const isFeatureEnabled = useCallback(
    (feature: SettableFeature) => localSettings.enabledFeatures.includes(feature),
    [localSettings.enabledFeatures],
  );

  const handleFeatureToggle = (feature: SettableFeature) => {
    setLocalSettings((prev) => {
      const isEnabled = prev.enabledFeatures.includes(feature);
      const newFeatures = isEnabled
        ? prev.enabledFeatures.filter((f) => f !== feature)
        : [...prev.enabledFeatures, feature];

      return { ...prev, enabledFeatures: newFeatures };
    });
    setHasChanges(true);
  };

  const handleThemeChange = (theme: 'standard' | 'child-friendly') => {
    setLocalSettings((prev) => ({ ...prev, uiTheme: theme }));
    setHasChanges(true);
  };

  const handleDigestToggle = () => {
    setLocalSettings((prev) => ({
      ...prev,
      receiveActivityDigest: !prev.receiveActivityDigest,
    }));
    setHasChanges(true);
  };

  const handleFrequencyChange = (frequency: 'daily' | 'weekly') => {
    setLocalSettings((prev) => ({ ...prev, digestFrequency: frequency }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6" data-testid="child-account-settings">
      {/* Feature Toggles Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Feature Permissions
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Control which features your child can access on ReasonBridge.
        </p>

        <div className="space-y-3">
          {ALL_FEATURES.map((feature) => {
            const info = FEATURE_INFO[feature];
            const enabled = isFeatureEnabled(feature);

            return (
              <div
                key={feature}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  disabled
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
                data-testid={`feature-toggle-${feature}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      enabled && !disabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={info.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{info.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{info.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Toggle ${info.label}`}
                  disabled={disabled}
                  onClick={() => handleFeatureToggle(feature)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    disabled
                      ? 'cursor-not-allowed opacity-50'
                      : enabled
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Theme Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Interface Theme
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose the visual theme for your child&apos;s experience.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleThemeChange('standard')}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              disabled
                ? 'cursor-not-allowed opacity-50'
                : localSettings.uiTheme === 'standard'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            data-testid="theme-standard"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100">Standard</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Default theme with standard colors
            </p>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleThemeChange('child-friendly')}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              disabled
                ? 'cursor-not-allowed opacity-50'
                : localSettings.uiTheme === 'child-friendly'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            data-testid="theme-child-friendly"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-teal-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100">Child-Friendly</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Calming colors and larger text
            </p>
          </button>
        </div>
      </section>

      {/* Notification Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Activity Notifications
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Receive updates about your child&apos;s activity on ReasonBridge.
        </p>

        <div className="space-y-4">
          <div
            className={`flex items-center justify-between p-4 rounded-lg border ${
              disabled
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Activity Digest</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive email summaries of your child&apos;s activity
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={localSettings.receiveActivityDigest}
              aria-label="Toggle activity digest"
              disabled={disabled}
              onClick={handleDigestToggle}
              data-testid="digest-toggle"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                disabled
                  ? 'cursor-not-allowed opacity-50'
                  : localSettings.receiveActivityDigest
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  localSettings.receiveActivityDigest ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {localSettings.receiveActivityDigest && (
            <div
              className="ml-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              data-testid="digest-frequency"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                How often?
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={localSettings.digestFrequency === 'daily'}
                    onChange={() => handleFrequencyChange('daily')}
                    disabled={disabled}
                    className="text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Daily</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={localSettings.digestFrequency === 'weekly'}
                    onChange={() => handleFrequencyChange('weekly')}
                    disabled={disabled}
                    className="text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Weekly</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Save/Reset Buttons */}
      {hasChanges && (
        <div
          className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700"
          data-testid="settings-actions"
        >
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            data-testid="save-settings"
          >
            {isSaving && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

export default ChildAccountSettings;
