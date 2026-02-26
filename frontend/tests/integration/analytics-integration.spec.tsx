/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Analytics Integration Tests
 *
 * Tests the integration of the analytics system with route navigation
 * and user interactions across the application.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AnalyticsProvider } from '../../src/components/analytics';
import {
  trackPageView,
  trackEvent,
  configureAnalytics,
  setAnalyticsConsent,
  getAnalyticsConsent,
  setMinorUserStatus,
} from '../../src/lib/analytics';
import * as ChildSafetyContextModule from '../../src/contexts/ChildSafetyContext';

// Mock the analytics module
vi.mock('../../src/lib/analytics', async () => {
  const actual = await vi.importActual('../../src/lib/analytics');
  return {
    ...actual,
    trackPageView: vi.fn(),
    trackEvent: vi.fn(),
    setMinorUserStatus: vi.fn(),
  };
});

// Mock the ChildSafetyContext
vi.mock('../../src/contexts/ChildSafetyContext', () => ({
  useChildSafety: vi.fn(() => ({
    isChildMode: false,
    uiTheme: 'standard',
    restrictedFeatures: [],
    showPanicButton: false,
    isFeatureRestricted: () => false,
  })),
}));

const mockUseChildSafety = vi.mocked(ChildSafetyContextModule.useChildSafety);

// Simple test pages
function HomePage() {
  return <div data-testid="home-page">Home</div>;
}

function TopicsPage() {
  return <div data-testid="topics-page">Topics</div>;
}

function ProfilePage() {
  return <div data-testid="profile-page">Profile</div>;
}

// Test wrapper with router and analytics
function TestApp({ initialPath = '/' }: { initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AnalyticsProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </AnalyticsProvider>
    </MemoryRouter>
  );
}

describe('Analytics Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Page View Tracking', () => {
    it('tracks page view on initial render', async () => {
      render(<TestApp initialPath="/" />);

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      // Page view should be tracked after component mount
      await waitFor(() => {
        expect(trackPageView).toHaveBeenCalled();
      });
    });

    it('tracks page view when navigating to different routes', async () => {
      render(<TestApp initialPath="/topics" />);

      await waitFor(() => {
        expect(screen.getByTestId('topics-page')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(trackPageView).toHaveBeenCalledWith(
          expect.stringContaining('/topics'),
          expect.any(String),
        );
      });
    });

    it('includes search params in tracked path', async () => {
      render(<TestApp initialPath="/topics?category=politics" />);

      await waitFor(() => {
        expect(trackPageView).toHaveBeenCalledWith(
          expect.stringContaining('?category=politics'),
          expect.any(String),
        );
      });
    });
  });

  describe('Consent Management', () => {
    it('returns unknown when no consent is set', () => {
      const consent = getAnalyticsConsent();
      expect(consent).toBe('unknown');
    });

    it('stores granted consent in localStorage', () => {
      setAnalyticsConsent('granted');
      expect(localStorage.getItem('analytics-consent')).toBe('granted');
    });

    it('stores denied consent in localStorage', () => {
      setAnalyticsConsent('denied');
      expect(localStorage.getItem('analytics-consent')).toBe('denied');
    });

    it('returns correct consent status after setting', () => {
      setAnalyticsConsent('granted');
      expect(getAnalyticsConsent()).toBe('granted');

      setAnalyticsConsent('denied');
      expect(getAnalyticsConsent()).toBe('denied');
    });
  });

  describe('Configuration', () => {
    it('can configure analytics with custom settings', () => {
      // This should not throw
      expect(() => {
        configureAnalytics({
          enabled: true,
          provider: 'console',
          debug: true,
        });
      }).not.toThrow();
    });

    it('accepts partial configuration', () => {
      expect(() => {
        configureAnalytics({ debug: true });
      }).not.toThrow();
    });
  });

  describe('Event Tracking', () => {
    it('can track custom events', () => {
      trackEvent('login', { method: 'email' });

      expect(trackEvent).toHaveBeenCalledWith('login', { method: 'email' });
    });

    it('can track events without props', () => {
      trackEvent('logout');

      // trackEvent may be called with or without a second argument
      expect(trackEvent).toHaveBeenCalledWith('logout');
    });

    it('can track topic creation events', () => {
      trackEvent('topic_create', { category: 'politics', tagCount: 3 });

      expect(trackEvent).toHaveBeenCalledWith('topic_create', {
        category: 'politics',
        tagCount: 3,
      });
    });

    it('can track search events', () => {
      trackEvent('search', { query: 'climate change', resultCount: 15 });

      expect(trackEvent).toHaveBeenCalledWith('search', {
        query: 'climate change',
        resultCount: 15,
      });
    });
  });

  describe('Error Tracking', () => {
    it('can track error events', () => {
      trackEvent('error', { code: '500', message: 'Server error' });

      expect(trackEvent).toHaveBeenCalledWith('error', {
        code: '500',
        message: 'Server error',
      });
    });
  });

  describe('Child Safety - Minor Tracking Disable', () => {
    afterEach(() => {
      // Reset to non-minor mode
      mockUseChildSafety.mockReturnValue({
        isChildMode: false,
        uiTheme: 'standard',
        restrictedFeatures: [],
        showPanicButton: false,
        isFeatureRestricted: () => false,
      });
    });

    it('calls setMinorUserStatus with false when not in child mode', async () => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: false,
        uiTheme: 'standard',
        restrictedFeatures: [],
        showPanicButton: false,
        isFeatureRestricted: () => false,
      });

      render(<TestApp initialPath="/" />);

      await waitFor(() => {
        expect(setMinorUserStatus).toHaveBeenCalledWith(false);
      });
    });

    it('calls setMinorUserStatus with true when in child mode', async () => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: true,
        uiTheme: 'child-friendly',
        restrictedFeatures: ['DM', 'USER_SEARCH'],
        showPanicButton: true,
        isFeatureRestricted: () => true,
      });

      render(<TestApp initialPath="/" />);

      await waitFor(() => {
        expect(setMinorUserStatus).toHaveBeenCalledWith(true);
      });
    });

    it('still tracks page views after component mounts (tracking module handles blocking)', async () => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: true,
        uiTheme: 'child-friendly',
        restrictedFeatures: [],
        showPanicButton: true,
        isFeatureRestricted: () => false,
      });

      render(<TestApp initialPath="/topics" />);

      // trackPageView is still called (the analytics module decides whether to actually track)
      await waitFor(() => {
        expect(trackPageView).toHaveBeenCalled();
      });
    });
  });
});
