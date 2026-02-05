import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SidebarProvider, useSidebarContext } from '../../../src/contexts/SidebarContext';
import type { ReactNode } from 'react';

describe('SidebarContext', () => {
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

  beforeEach(() => {
    // Replace global localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SidebarProvider>{children}</SidebarProvider>
  );

  describe('initialization', () => {
    it('should initialize with expanded sidebar when no localStorage value', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      expect(result.current.isCollapsed).toBe(false);
      expect(result.current.isMobileOpen).toBe(false);
    });

    it('should initialize with collapsed sidebar when localStorage is "true"', () => {
      localStorageMock.setItem('sidebar-collapsed', 'true');

      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should initialize with expanded sidebar when localStorage is "false"', () => {
      localStorageMock.setItem('sidebar-collapsed', 'false');

      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should always initialize mobile drawer as closed', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      expect(result.current.isMobileOpen).toBe(false);
    });
  });

  describe('toggleCollapsed', () => {
    it('should toggle sidebar from expanded to collapsed', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleCollapsed();
      });

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should toggle sidebar from collapsed to expanded', () => {
      localStorageMock.setItem('sidebar-collapsed', 'true');
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleCollapsed();
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should toggle sidebar multiple times correctly', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      expect(result.current.isCollapsed).toBe(false);

      act(() => {
        result.current.toggleCollapsed();
      });
      expect(result.current.isCollapsed).toBe(true);

      act(() => {
        result.current.toggleCollapsed();
      });
      expect(result.current.isCollapsed).toBe(false);

      act(() => {
        result.current.toggleCollapsed();
      });
      expect(result.current.isCollapsed).toBe(true);
    });
  });

  describe('toggleMobile', () => {
    it('should toggle mobile drawer from closed to open', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleMobile();
      });

      expect(result.current.isMobileOpen).toBe(true);
    });

    it('should toggle mobile drawer from open to closed', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleMobile();
      });

      expect(result.current.isMobileOpen).toBe(true);

      act(() => {
        result.current.toggleMobile();
      });

      expect(result.current.isMobileOpen).toBe(false);
    });
  });

  describe('closeMobile', () => {
    it('should close mobile drawer when open', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleMobile(); // Open first
      });

      expect(result.current.isMobileOpen).toBe(true);

      act(() => {
        result.current.closeMobile();
      });

      expect(result.current.isMobileOpen).toBe(false);
    });

    it('should remain closed when already closed', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      expect(result.current.isMobileOpen).toBe(false);

      act(() => {
        result.current.closeMobile();
      });

      expect(result.current.isMobileOpen).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist collapsed state to localStorage when toggled', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleCollapsed();
      });

      expect(localStorageMock.getItem('sidebar-collapsed')).toBe('true');
    });

    it('should update localStorage when toggled back to expanded', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleCollapsed(); // Collapse
      });

      act(() => {
        result.current.toggleCollapsed(); // Expand
      });

      expect(localStorageMock.getItem('sidebar-collapsed')).toBe('false');
    });

    it('should not persist mobile drawer state to localStorage', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleMobile();
      });

      expect(localStorageMock.getItem('mobile-drawer-open')).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      // Spy on console.error to suppress error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('localStorage quota exceeded');
      });

      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleCollapsed();
      });

      // Should not crash, just log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save sidebar state to localStorage:',
        expect.any(Error),
      );

      // Restore original functions
      localStorageMock.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('useSidebarContext hook', () => {
    it('should throw error when used outside SidebarProvider', () => {
      expect(() => {
        renderHook(() => useSidebarContext());
      }).toThrow('useSidebarContext must be used within SidebarProvider');
    });

    it('should provide context values when used inside SidebarProvider', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      expect(result.current).toHaveProperty('isCollapsed');
      expect(result.current).toHaveProperty('isMobileOpen');
      expect(result.current).toHaveProperty('toggleCollapsed');
      expect(result.current).toHaveProperty('toggleMobile');
      expect(result.current).toHaveProperty('closeMobile');
    });
  });

  describe('independent state management', () => {
    it('should manage desktop and mobile states independently', () => {
      const { result } = renderHook(() => useSidebarContext(), { wrapper });

      act(() => {
        result.current.toggleCollapsed(); // Collapse sidebar
        result.current.toggleMobile(); // Open drawer
      });

      expect(result.current.isCollapsed).toBe(true);
      expect(result.current.isMobileOpen).toBe(true);

      act(() => {
        result.current.closeMobile(); // Close drawer
      });

      // Sidebar should still be collapsed
      expect(result.current.isCollapsed).toBe(true);
      expect(result.current.isMobileOpen).toBe(false);
    });
  });
});
