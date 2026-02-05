import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useThemeContext } from '../../../src/contexts/ThemeContext';
import * as useMediaQueryModule from '../../../src/hooks/useMediaQuery';
import type { ReactNode } from 'react';

// Mock useMediaQuery hook
vi.mock('../../../src/hooks/useMediaQuery');

describe('ThemeContext', () => {
  beforeEach(() => {
    // Mock useMediaQuery to return false (light system preference) by default
    vi.mocked(useMediaQueryModule.useMediaQuery).mockReturnValue(false);

    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value.toString();
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Clear localStorage before each test
    localStorage.clear();

    // Mock document.documentElement
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  describe('initialization', () => {
    it('should initialize with auto mode when no localStorage value', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.mode).toBe('auto');
    });

    it('should initialize with stored light mode', () => {
      localStorage.setItem('theme-preference', 'light');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.mode).toBe('light');
    });

    it('should initialize with stored dark mode', () => {
      localStorage.setItem('theme-preference', 'dark');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.mode).toBe('dark');
    });

    it('should initialize with stored auto mode', () => {
      localStorage.setItem('theme-preference', 'auto');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.mode).toBe('auto');
    });

    it('should default to auto mode with invalid localStorage value', () => {
      localStorage.setItem('theme-preference', 'invalid');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.mode).toBe('auto');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.getItem to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.mode).toBe('auto');

      // Restore
      localStorage.getItem = originalGetItem;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('isDark computation', () => {
    it('should be false when mode is light', () => {
      localStorage.setItem('theme-preference', 'light');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.isDark).toBe(false);
    });

    it('should be true when mode is dark', () => {
      localStorage.setItem('theme-preference', 'dark');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.isDark).toBe(true);
    });

    it('should follow system preference when mode is auto and system is light', () => {
      vi.mocked(useMediaQueryModule.useMediaQuery).mockReturnValue(false); // Light system preference
      localStorage.setItem('theme-preference', 'auto');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.isDark).toBe(false);
    });

    it('should follow system preference when mode is auto and system is dark', () => {
      vi.mocked(useMediaQueryModule.useMediaQuery).mockReturnValue(true); // Dark system preference
      localStorage.setItem('theme-preference', 'auto');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.isDark).toBe(true);
    });
  });

  describe('setTheme', () => {
    it('should change mode to light', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should change mode to dark', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should change mode to auto', () => {
      vi.mocked(useMediaQueryModule.useMediaQuery).mockReturnValue(true); // Dark system preference
      localStorage.setItem('theme-preference', 'light');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('auto');
      });

      expect(result.current.mode).toBe('auto');
      expect(result.current.isDark).toBe(true); // Follows system
    });
  });

  describe('toggleTheme', () => {
    it('should cycle from light to dark', () => {
      localStorage.setItem('theme-preference', 'light');
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('dark');
    });

    it('should cycle from dark to auto', () => {
      localStorage.setItem('theme-preference', 'dark');
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('auto');
    });

    it('should cycle from auto to light', () => {
      localStorage.setItem('theme-preference', 'auto');
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('light');
    });

    it('should complete full cycle: light → dark → auto → light', () => {
      localStorage.setItem('theme-preference', 'light');
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.mode).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.mode).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.mode).toBe('auto');

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.mode).toBe('light');
    });
  });

  describe('localStorage persistence', () => {
    it('should persist theme mode to localStorage when changed', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(localStorage.getItem('theme-preference')).toBe('dark');
    });

    it('should update localStorage when toggling theme', () => {
      localStorage.setItem('theme-preference', 'light');
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorage.getItem('theme-preference')).toBe('dark');
    });

    it('should handle localStorage errors when saving', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage quota exceeded');
      });

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      act(() => {
        result.current.setTheme('dark');
      });

      // Should not crash, just log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save theme preference to localStorage:',
        expect.any(Error),
      );

      // Restore
      localStorage.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('DOM manipulation', () => {
    it('should add dark class to document when isDark is true', () => {
      localStorage.setItem('theme-preference', 'dark');

      renderHook(() => useThemeContext(), { wrapper });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from document when isDark is false', () => {
      localStorage.setItem('theme-preference', 'light');
      document.documentElement.classList.add('dark'); // Pre-add to test removal

      renderHook(() => useThemeContext(), { wrapper });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should update DOM class when theme changes', () => {
      localStorage.setItem('theme-preference', 'light');
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(document.documentElement.classList.contains('dark')).toBe(false);

      act(() => {
        result.current.setTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      act(() => {
        result.current.setTheme('light');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply dark class when in auto mode with dark system preference', () => {
      vi.mocked(useMediaQueryModule.useMediaQuery).mockReturnValue(true); // Dark system
      localStorage.setItem('theme-preference', 'auto');

      renderHook(() => useThemeContext(), { wrapper });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('useThemeContext hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      expect(() => {
        renderHook(() => useThemeContext());
      }).toThrow('useThemeContext must be used within ThemeProvider');
    });

    it('should provide context values when used inside ThemeProvider', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current).toHaveProperty('mode');
      expect(result.current).toHaveProperty('isDark');
      expect(result.current).toHaveProperty('setTheme');
      expect(result.current).toHaveProperty('toggleTheme');
      expect(typeof result.current.setTheme).toBe('function');
      expect(typeof result.current.toggleTheme).toBe('function');
    });
  });

  describe('system preference detection', () => {
    it('should call useMediaQuery with correct media query', () => {
      renderHook(() => useThemeContext(), { wrapper });

      expect(vi.mocked(useMediaQueryModule.useMediaQuery)).toHaveBeenCalledWith(
        '(prefers-color-scheme: dark)',
      );
    });

    it('should respect system preference in auto mode', () => {
      vi.mocked(useMediaQueryModule.useMediaQuery).mockReturnValue(true); // Dark system preference
      localStorage.setItem('theme-preference', 'auto');

      const { result } = renderHook(() => useThemeContext(), { wrapper });

      expect(result.current.isDark).toBe(true);
    });
  });
});
