/**
 * Unit tests for Sidebar component
 * Tests collapsed/expanded state behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../../../../src/components/layouts/Sidebar';
import { ChildSafetyProvider } from '../../../../src/contexts/ChildSafetyContext';
import * as sidebarHook from '../../../../src/hooks/useSidebar';
import * as authHook from '../../../../src/hooks/useAuth';
import * as notificationsHook from '../../../../src/hooks/useNotifications';

describe('Sidebar Component', () => {
  const mockUser = {
    id: 'user-1',
    displayName: 'Test User',
    email: 'test@example.com',
    avatarUrl: null,
  };

  const mockUseSidebar = (isCollapsed: boolean) => {
    vi.spyOn(sidebarHook, 'useSidebar').mockReturnValue({
      isCollapsed,
      isMobileOpen: false,
      toggleCollapsed: vi.fn(),
      toggleMobile: vi.fn(),
      closeMobile: vi.fn(),
    });
  };

  const mockUseAuth = (user: typeof mockUser | null = mockUser) => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    });
  };

  const mockUseNotifications = () => {
    vi.spyOn(notificationsHook, 'useNotifications').mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      refetch: vi.fn(),
    });
  };

  const renderSidebar = () => {
    return render(
      <MemoryRouter>
        <ChildSafetyProvider>
          <Sidebar />
        </ChildSafetyProvider>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications();
  });

  describe('expanded state', () => {
    beforeEach(() => {
      mockUseSidebar(false);
      mockUseAuth();
    });

    it('should render with expanded width', () => {
      renderSidebar();

      const sidebar = screen.getByRole('complementary', { name: 'Sidebar navigation' });
      expect(sidebar).toHaveClass('w-64');
      expect(sidebar).not.toHaveClass('w-20');
    });

    it('should show navigation labels when expanded', () => {
      renderSidebar();

      expect(screen.getByText('Topics')).toBeInTheDocument();
      expect(screen.getByText('Simulator')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show user profile info when expanded', () => {
      renderSidebar();

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('collapsed state', () => {
    beforeEach(() => {
      mockUseSidebar(true);
      mockUseAuth();
    });

    it('should render with collapsed width', () => {
      renderSidebar();

      const sidebar = screen.getByRole('complementary', { name: 'Sidebar navigation' });
      expect(sidebar).toHaveClass('w-20');
      expect(sidebar).not.toHaveClass('w-64');
    });

    it('should hide navigation labels when collapsed', () => {
      renderSidebar();

      // Labels should not be rendered at all
      expect(screen.queryByText('Topics')).not.toBeInTheDocument();
      expect(screen.queryByText('Simulator')).not.toBeInTheDocument();
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should hide user profile text when collapsed', () => {
      renderSidebar();

      // User name and email should not be visible
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    });

    it('should still show user avatar when collapsed', () => {
      renderSidebar();

      // Avatar initial should still be visible
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should have title attribute on profile link when collapsed', () => {
      renderSidebar();

      const profileLink = screen.getByRole('link', { name: /Test User - test@example.com/i });
      expect(profileLink).toHaveAttribute('title', expect.stringContaining('Test User'));
    });
  });

  describe('no user logged in', () => {
    it('should not show user profile section when not logged in', () => {
      mockUseSidebar(false);
      mockUseAuth(null);

      renderSidebar();

      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });
  });
});
