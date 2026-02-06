import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';

/**
 * Settings Page
 * Centralized settings page for user preferences including theme/dark mode
 */

export function SettingsPage() {
  const { mode, setTheme } = useTheme();

  const handleThemeChange = (newMode: 'light' | 'dark' | 'auto') => {
    setTheme(newMode);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
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
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {mode === 'auto' ? 'Theme follows your system preference' : `Using ${mode} mode`}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

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
