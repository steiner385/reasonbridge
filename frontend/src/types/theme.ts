/**
 * Theme preference types for dark mode support
 * Manages user's theme selection with persistence
 */

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Theme preference interface
 * Stored in localStorage and synced to backend user preferences
 */
export interface ThemePreference {
  /** Selected theme mode */
  mode: ThemeMode;

  /** ISO 8601 timestamp of last update */
  lastUpdated: string;
}

/**
 * Theme context type for React Context
 */
export interface ThemeContextType {
  /** Current active theme mode */
  mode: ThemeMode;

  /** Whether dark mode is currently active (resolves 'auto' based on system preference) */
  isDark: boolean;

  /** Set theme mode explicitly */
  setTheme: (mode: ThemeMode) => void;

  /** Toggle between light and dark (skips 'auto') */
  toggleTheme: () => void;
}

/**
 * System theme preference from browser
 */
export type SystemTheme = 'light' | 'dark';
