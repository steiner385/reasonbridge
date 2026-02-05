import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useSidebar } from '../../../src/hooks/useSidebar';
import { SidebarProvider } from '../../../src/contexts/SidebarContext';

describe('useSidebar hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SidebarProvider>{children}</SidebarProvider>
  );

  it('should throw error when used outside SidebarProvider', () => {
    expect(() => {
      renderHook(() => useSidebar());
    }).toThrow('useSidebarContext must be used within SidebarProvider');
  });

  it('should return context values when used inside SidebarProvider', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current).toBeDefined();
    expect(typeof result.current.isCollapsed).toBe('boolean');
    expect(typeof result.current.isMobileOpen).toBe('boolean');
    expect(typeof result.current.toggleCollapsed).toBe('function');
    expect(typeof result.current.toggleMobile).toBe('function');
    expect(typeof result.current.closeMobile).toBe('function');
  });

  it('should provide the same functionality as useSidebarContext', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    // Verify all expected properties exist
    expect(result.current).toHaveProperty('isCollapsed');
    expect(result.current).toHaveProperty('isMobileOpen');
    expect(result.current).toHaveProperty('toggleCollapsed');
    expect(result.current).toHaveProperty('toggleMobile');
    expect(result.current).toHaveProperty('closeMobile');
  });

  it('should return boolean state values', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current.isCollapsed).toBe(false); // Default expanded
    expect(result.current.isMobileOpen).toBe(false); // Default closed
  });

  it('should return callable action methods', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });

    // Should not throw when called
    expect(() => result.current.toggleCollapsed()).not.toThrow();
    expect(() => result.current.toggleMobile()).not.toThrow();
    expect(() => result.current.closeMobile()).not.toThrow();
  });
});
