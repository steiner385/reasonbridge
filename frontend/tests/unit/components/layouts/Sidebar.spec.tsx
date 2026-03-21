/**
 * Unit tests for Sidebar component
 * Tests collapsed/expanded state behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from '../../../../src/components/layouts/Sidebar';
import { ToastProvider } from '../../../../src/contexts/ToastContext';
import { AuthProvider } from '../../../../src/contexts/AuthContext';
import { ChildSafetyProvider } from '../../../../src/contexts/ChildSafetyContext';
import * as sidebarHook from '../../../../src/hooks/useSidebar';
import * as authHook from '../../../../src/hooks/useAuth';
import * as notificationsHook from '../../../../src/hooks/useNotifications';
import * as topicNavigationHook from '../../../../src/hooks/useTopicNavigation';
import * as webSocketHook from '../../../../src/hooks/useWebSocket';

// Mock useTopics to prevent actual API calls
vi.mock('../../../../src/lib/useTopics', () => ({
  useTopics: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
    error: null,
  })),
}));

describe('Sidebar Component', () => {
  const mockUser = {
    id: 'user-1',
    displayName: 'Test User',
    email: 'test@example.com',
    avatarUrl: null,
  };

  const mockUseSidebar = (isCollapsed: boolean, sidebarMode: 'full' | 'topics' = 'full') => {
    vi.spyOn(sidebarHook, 'useSidebar').mockReturnValue({
      isCollapsed,
      isMobileOpen: false,
      sidebarMode,
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

  const mockUseTopicNavigation = () => {
    vi.spyOn(topicNavigationHook, 'useTopicNavigation').mockReturnValue({
      activeTopicId: null,
      navigateToTopic: vi.fn(),
      clearTopic: vi.fn(),
      isTopicActive: vi.fn().mockReturnValue(false),
    });
  };

  const mockUseWebSocket = () => {
    vi.spyOn(webSocketHook, 'useWebSocket').mockReturnValue({
      state: 'CONNECTED',
      isConnected: true,
      subscribe: vi.fn().mockReturnValue(vi.fn()),
      send: vi.fn(),
    });
  };

  const createQueryClient = () => {
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  };

  const renderSidebar = () => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            <AuthProvider>
              <ChildSafetyProvider>
                <Sidebar />
              </ChildSafetyProvider>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications();
    mockUseTopicNavigation();
    mockUseWebSocket();
  });

  describe('expanded state', () => {
    beforeEach(() => {
      mockUseSidebar(false, 'full');
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
      mockUseSidebar(true, 'full');
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

      // Avatar component should be visible (as Gravatar or image)
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('should have title attribute on profile link when collapsed', () => {
      renderSidebar();

      const profileLink = screen.getByRole('link', { name: /Test User - test@example.com/i });
      expect(profileLink).toHaveAttribute('title', expect.stringContaining('Test User'));
    });
  });

  describe('no user logged in', () => {
    it('should not show user profile section when not logged in', () => {
      mockUseSidebar(false, 'full');
      mockUseAuth(null);

      renderSidebar();

      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });
  });
});
