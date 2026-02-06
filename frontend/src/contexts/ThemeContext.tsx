import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode, ThemeContextType } from '../types/theme';
import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * Theme Context
 * Manages dark mode theme state with user preference and system detection
 * Supports three modes: 'light', 'dark', 'auto' (follows system preference)
 */

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'theme-preference';

/**
 * Theme Provider Component
 * Provides theme state management to the application
 * - Persists user preference to localStorage
 * - Detects system dark mode preference
 * - Applies/removes 'dark' class to document root
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Load theme preference from localStorage (default: 'auto')
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        return stored;
      }
      return 'auto'; // Default to system preference
    } catch {
      return 'auto';
    }
  });

  // Detect system dark mode preference
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  // Calculate effective dark mode state
  const isDark = mode === 'dark' || (mode === 'auto' && systemPrefersDark);

  // Persist theme preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference to localStorage:', error);
    }
  }, [mode]);

  // Apply/remove 'dark' class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Set theme mode
  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
  }, []);

  // Toggle theme (cycles through light → dark → auto)
  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light';
    });
  }, []);

  const value: ThemeContextType = {
    mode,
    isDark,
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access Theme context
 * Must be used within ThemeProvider
 */
export function useThemeContext(): ThemeContextType {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}
