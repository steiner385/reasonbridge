/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { useToast } from '../../contexts/ToastContext';
import { useAuthContext } from '../../contexts/AuthContext';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';

/**
 * Settings Page
 * Centralized settings page for user preferences including theme/dark mode
 */

export function SettingsPage() {
  const { mode, setTheme } = useTheme();
  const { isAuthenticated } = useAuthContext();
  const toast = useToast();
  const {
    preferences: notificationPrefs,
    pushAvailable,
    isLoading: notificationsLoading,
    isPending: notificationsPending,
    updatePreferencesAsync,
  } = useNotificationPreferences({ enabled: isAuthenticated });

  const handleThemeChange = (newMode: 'light' | 'dark' | 'auto') => {
    setTheme(newMode);
  };

  const handleNotificationToggle = async (
    field: 'emailNotifications' | 'pushNotifications' | 'weeklyDigest',
  ) => {
    if (!notificationPrefs) return;

    const newValue = !notificationPrefs[field];
    try {
      await updatePreferencesAsync({ [field]: newValue });
      toast.success('Notification preferences updated');
    } catch {
      toast.error('Failed to update preferences');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Manage your account preferences and application settings
        </p>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader title="Appearance" subtitle="Customize how ReasonBridge looks on your device" />
        <CardBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Light Mode */}
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`
                    flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all
                    ${
                      mode === 'light'
                        ? 'border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                        : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                    }
                  `}
                  aria-pressed={mode === 'light'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6 text-gray-700 dark:text-gray-300"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Light
                  </span>
                </button>

                {/* Dark Mode */}
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`
                    flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all
                    ${
                      mode === 'dark'
                        ? 'border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                        : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                    }
                  `}
                  aria-pressed={mode === 'dark'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6 text-gray-700 dark:text-gray-300"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark</span>
                </button>

                {/* Auto Mode */}
                <button
                  onClick={() => handleThemeChange('auto')}
                  className={`
                    flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all
                    ${
                      mode === 'auto'
                        ? 'border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                        : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                    }
                  `}
                  aria-pressed={mode === 'auto'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6 text-gray-700 dark:text-gray-300"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    System
                  </span>
                </button>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">
                {mode === 'auto' ? 'Theme follows your system preference' : `Using ${mode} mode`}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Notification Settings */}
      {isAuthenticated && (
        <Card>
          <CardHeader
            title="Notifications"
            subtitle="Choose how you want to be notified about activity"
          />
          <CardBody>
            {notificationsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Email Notifications Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Email Notifications
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive notifications via email for mentions, follows, and important updates
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle('emailNotifications')}
                    disabled={notificationsPending}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${notificationPrefs?.emailNotifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'}
                    `}
                    role="switch"
                    aria-checked={notificationPrefs?.emailNotifications ?? false}
                    aria-label="Toggle email notifications"
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${notificationPrefs?.emailNotifications ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>

                {/* Push Notifications Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Push Notifications
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive real-time notifications in your browser
                      {!pushAvailable && (
                        <span className="block text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Browser notifications not set up yet
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle('pushNotifications')}
                    disabled={notificationsPending || !pushAvailable}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${notificationPrefs?.pushNotifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'}
                    `}
                    role="switch"
                    aria-checked={notificationPrefs?.pushNotifications ?? false}
                    aria-label="Toggle push notifications"
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${notificationPrefs?.pushNotifications ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>

                {/* Weekly Digest Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Weekly Digest
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive a weekly summary of activity and new discussions
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle('weeklyDigest')}
                    disabled={notificationsPending}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${notificationPrefs?.weeklyDigest ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'}
                    `}
                    role="switch"
                    aria-checked={notificationPrefs?.weeklyDigest ?? false}
                    aria-label="Toggle weekly digest"
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${notificationPrefs?.weeklyDigest ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Other Settings Sections */}
      <Card>
        <CardHeader title="Feedback Preferences" subtitle="Manage AI feedback settings" />
        <CardBody>
          <Link
            to="/settings/feedback-preferences"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            Manage feedback preferences
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Account" subtitle="Manage your account information" />
        <CardBody>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            View profile
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}

export default SettingsPage;
