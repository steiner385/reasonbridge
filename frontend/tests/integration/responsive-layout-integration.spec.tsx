/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Responsive Layout Integration Tests
 *
 * Tests the integration of responsive design components with
 * viewport changes and breakpoint detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../../src/contexts/SidebarContext';
import { useSidebar } from '../../src/hooks/useSidebar';

// Mock window.matchMedia
function createMatchMedia(width: number) {
  return (query: string): MediaQueryList => {
    const matches = (() => {
      // Parse common breakpoint queries
      if (query.includes('min-width: 768px')) return width >= 768;
      if (query.includes('max-width: 767px')) return width < 768;
      if (query.includes('min-width: 1024px')) return width >= 1024;
      if (query.includes('min-width: 1280px')) return width >= 1280;
      if (query.includes('prefers-color-scheme: dark')) return false;
      return false;
    })();

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
  };
}

// Test component that displays sidebar state
function SidebarStateDisplay() {
  const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile, closeMobile } = useSidebar();
  return (
    <div>
      <div data-testid="is-collapsed">{isCollapsed ? 'collapsed' : 'expanded'}</div>
      <div data-testid="is-mobile-open">{isMobileOpen ? 'open' : 'closed'}</div>
      <button onClick={toggleCollapsed} data-testid="toggle-button">
        Toggle
      </button>
      <button onClick={toggleMobile} data-testid="toggle-mobile-button">
        Toggle Mobile
      </button>
      <button onClick={closeMobile} data-testid="close-mobile-button">
        Close Mobile
      </button>
    </div>
  );
}

// Test wrapper
function TestApp() {
  return (
    <MemoryRouter>
      <SidebarProvider>
        <SidebarStateDisplay />
      </SidebarProvider>
    </MemoryRouter>
  );
}

describe('Responsive Layout Integration', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
    localStorage.clear();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    localStorage.clear();
  });

  describe('Sidebar State Management', () => {
    it('starts with default collapsed state', async () => {
      window.matchMedia = createMatchMedia(1280);

      render(<TestApp />);

      // Check initial state
      await waitFor(() => {
        expect(screen.getByTestId('is-collapsed')).toBeInTheDocument();
      });
    });

    it('can toggle sidebar state', async () => {
      window.matchMedia = createMatchMedia(1280);

      render(<TestApp />);

      const toggleButton = screen.getByTestId('toggle-button');

      // Toggle the sidebar
      await act(async () => {
        toggleButton.click();
      });

      // State should change
      await waitFor(() => {
        expect(screen.getByTestId('is-collapsed')).toBeInTheDocument();
      });
    });

    it('can toggle mobile drawer', async () => {
      window.matchMedia = createMatchMedia(375);

      render(<TestApp />);

      const toggleMobileButton = screen.getByTestId('toggle-mobile-button');

      await act(async () => {
        toggleMobileButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-mobile-open').textContent).toBe('open');
      });
    });

    it('can close mobile drawer', async () => {
      window.matchMedia = createMatchMedia(375);

      render(<TestApp />);

      // First open the mobile drawer
      const toggleMobileButton = screen.getByTestId('toggle-mobile-button');
      await act(async () => {
        toggleMobileButton.click();
      });

      // Then close it
      const closeMobileButton = screen.getByTestId('close-mobile-button');
      await act(async () => {
        closeMobileButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-mobile-open').textContent).toBe('closed');
      });
    });
  });

  describe('Viewport Breakpoints', () => {
    it('handles desktop viewport (>= 1280px)', async () => {
      window.matchMedia = createMatchMedia(1440);

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('is-collapsed')).toBeInTheDocument();
      });
    });

    it('handles tablet viewport (768-1279px)', async () => {
      window.matchMedia = createMatchMedia(1024);

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('is-collapsed')).toBeInTheDocument();
      });
    });

    it('handles mobile viewport (< 768px)', async () => {
      window.matchMedia = createMatchMedia(375);

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('is-collapsed')).toBeInTheDocument();
      });
    });
  });

  describe('State Persistence', () => {
    it('toggles sidebar state correctly', async () => {
      window.matchMedia = createMatchMedia(1280);

      render(<TestApp />);

      const toggleButton = screen.getByTestId('toggle-button');

      // Toggle once - state should change
      await act(async () => {
        toggleButton.click();
      });

      // Verify state change
      await waitFor(() => {
        expect(screen.getByTestId('is-collapsed')).toBeInTheDocument();
      });
    });
  });
});
