import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { Navigation } from '../../../../src/components/layouts/Navigation';

describe('Navigation Component', () => {
  const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
    return render(<MemoryRouter initialEntries={[initialRoute]}>{component}</MemoryRouter>);
  };

  describe('rendering', () => {
    it('should render all navigation links', () => {
      renderWithRouter(<Navigation />);

      expect(screen.getByText('Topics')).toBeInTheDocument();
      expect(screen.getByText('Simulator')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render navigation with proper ARIA label', () => {
      renderWithRouter(<Navigation />);

      const nav = screen.getByRole('navigation', { name: 'Main navigation' });
      expect(nav).toBeInTheDocument();
    });

    it('should render icons for each navigation link', () => {
      renderWithRouter(<Navigation />);

      // Each link should have an SVG icon
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should render data-tour attributes for Topics and Notifications', () => {
      renderWithRouter(<Navigation />);

      const topicsLink = screen.getByText('Topics').closest('a');
      const notificationsLink = screen.getByText('Notifications').closest('a');

      expect(topicsLink).toHaveAttribute('data-tour', 'nav-topics');
      expect(notificationsLink).toHaveAttribute('data-tour', 'nav-notifications');
    });
  });

  describe('active state highlighting', () => {
    it('should highlight active link when on Topics page', () => {
      renderWithRouter(<Navigation />, '/topics');

      const topicsLink = screen.getByText('Topics').closest('a');
      expect(topicsLink).toHaveClass('bg-primary-50');
      expect(topicsLink).toHaveClass('text-primary-700');
      expect(topicsLink).toHaveAttribute('aria-current', 'page');
    });

    it('should highlight active link when on Notifications page', () => {
      renderWithRouter(<Navigation />, '/notifications');

      const notificationsLink = screen.getByText('Notifications').closest('a');
      expect(notificationsLink).toHaveClass('bg-primary-50');
      expect(notificationsLink).toHaveClass('text-primary-700');
      expect(notificationsLink).toHaveAttribute('aria-current', 'page');
    });

    it('should highlight active link when on Settings page', () => {
      renderWithRouter(<Navigation />, '/settings');

      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveClass('bg-primary-50');
      expect(settingsLink).toHaveClass('text-primary-700');
      expect(settingsLink).toHaveAttribute('aria-current', 'page');
    });

    it('should highlight Topics when on nested topic route', () => {
      renderWithRouter(<Navigation />, '/topics/123');

      const topicsLink = screen.getByText('Topics').closest('a');
      expect(topicsLink).toHaveAttribute('aria-current', 'page');
    });

    it('should not highlight inactive links', () => {
      renderWithRouter(<Navigation />, '/topics');

      const notificationsLink = screen.getByText('Notifications').closest('a');
      const settingsLink = screen.getByText('Settings').closest('a');

      expect(notificationsLink).not.toHaveAttribute('aria-current');
      expect(settingsLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('badge counts', () => {
    it('should not show badge when unreadCount is 0', () => {
      renderWithRouter(<Navigation unreadCount={0} />);

      expect(screen.queryByLabelText(/unread/)).not.toBeInTheDocument();
    });

    it('should not show badge when unreadCount is undefined', () => {
      renderWithRouter(<Navigation />);

      expect(screen.queryByLabelText(/unread/)).not.toBeInTheDocument();
    });

    it('should show badge with count when unreadCount > 0', () => {
      renderWithRouter(<Navigation unreadCount={5} />);

      const badge = screen.getByLabelText('5 unread');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
    });

    it('should show "99+" when unreadCount > 99', () => {
      renderWithRouter(<Navigation unreadCount={150} />);

      const badge = screen.getByLabelText('150 unread');
      expect(badge).toHaveTextContent('99+');
    });

    it('should show badge exactly at 99', () => {
      renderWithRouter(<Navigation unreadCount={99} />);

      const badge = screen.getByLabelText('99 unread');
      expect(badge).toHaveTextContent('99');
    });

    it('should show badge exactly at 100', () => {
      renderWithRouter(<Navigation unreadCount={100} />);

      const badge = screen.getByLabelText('100 unread');
      expect(badge).toHaveTextContent('99+');
    });

    it('should have proper badge styling', () => {
      renderWithRouter(<Navigation unreadCount={3} />);

      const badge = screen.getByLabelText('3 unread');
      expect(badge).toHaveClass('bg-primary-600');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('rounded-full');
    });
  });

  describe('onNavigate callback', () => {
    it('should call onNavigate when clicking any navigation link', async () => {
      const onNavigate = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(<Navigation onNavigate={onNavigate} />);

      const topicsLink = screen.getByText('Topics');
      await user.click(topicsLink);

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('should call onNavigate for Notifications link', async () => {
      const onNavigate = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(<Navigation onNavigate={onNavigate} />);

      const notificationsLink = screen.getByText('Notifications');
      await user.click(notificationsLink);

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('should call onNavigate for Settings link', async () => {
      const onNavigate = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(<Navigation onNavigate={onNavigate} />);

      const settingsLink = screen.getByText('Settings');
      await user.click(settingsLink);

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('should not error when onNavigate is not provided', async () => {
      const user = userEvent.setup();

      renderWithRouter(<Navigation />);

      const topicsLink = screen.getByText('Topics');

      // Should not throw error
      await expect(user.click(topicsLink)).resolves.not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have navigation landmark role', () => {
      renderWithRouter(<Navigation />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have descriptive aria-label', () => {
      renderWithRouter(<Navigation />);

      expect(screen.getByLabelText('Main navigation')).toBeInTheDocument();
    });

    it('should set aria-current="page" for active link', () => {
      renderWithRouter(<Navigation />, '/topics');

      const topicsLink = screen.getByText('Topics').closest('a');
      expect(topicsLink).toHaveAttribute('aria-current', 'page');
    });

    it('should have aria-label for badge counts', () => {
      renderWithRouter(<Navigation unreadCount={7} />);

      expect(screen.getByLabelText('7 unread')).toBeInTheDocument();
    });

    it('should have proper link semantics', () => {
      renderWithRouter(<Navigation />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(4); // Topics, Simulator, Notifications, Settings

      links.forEach((link) => {
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('navigation links', () => {
    it('should link to correct routes', () => {
      renderWithRouter(<Navigation />);

      const topicsLink = screen.getByText('Topics').closest('a');
      const simulatorLink = screen.getByText('Simulator').closest('a');
      const notificationsLink = screen.getByText('Notifications').closest('a');
      const settingsLink = screen.getByText('Settings').closest('a');

      expect(topicsLink).toHaveAttribute('href', '/topics');
      expect(simulatorLink).toHaveAttribute('href', '/simulator');
      expect(notificationsLink).toHaveAttribute('href', '/notifications');
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });
  });
});
