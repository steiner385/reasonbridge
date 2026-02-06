import { useThemeContext } from '../contexts/ThemeContext';
import type { ThemeContextType } from '../types/theme';

/**
 * Hook to access theme state and actions
 * Convenience wrapper around useThemeContext
 *
 * @returns Theme context with mode, isDark state, and action methods
 *
 * @example
 * ```tsx
 * const { mode, isDark, setTheme, toggleTheme } = useTheme();
 *
 * // Set specific theme
 * <button onClick={() => setTheme('dark')}>Dark Mode</button>
 *
 * // Toggle between modes
 * <button onClick={toggleTheme}>Toggle Theme</button>
 *
 * // Use theme state
 * {isDark ? <MoonIcon /> : <SunIcon />}
 * ```
 */
export function useTheme(): ThemeContextType {
  return useThemeContext();
}
