/**
 * Navigation state types for hybrid navigation pattern
 * Manages sidebar collapsed/expanded state and mobile drawer state
 */

/**
 * Breadcrumb item for navigation hierarchy
 */
export interface Breadcrumb {
  /** Display label for the breadcrumb */
  label: string;
  /** Path/route for navigation */
  path: string;
}

/**
 * Navigation state interface
 * Tracks sidebar state (desktop), drawer state (mobile), and current route info
 */
export interface NavigationState {
  /** Desktop sidebar collapsed state (persistent via localStorage) */
  isCollapsed: boolean;

  /** Mobile drawer open state (ephemeral, always starts closed) */
  isMobileOpen: boolean;

  /** Current route path */
  currentRoute: string;

  /** Breadcrumb trail for current page */
  breadcrumbs: Breadcrumb[];

  /** Unread notification count for badge display */
  unreadCount: number;
}

/**
 * Sidebar context type for React Context
 */
export interface SidebarContextType {
  /** Whether sidebar is collapsed (desktop) */
  isCollapsed: boolean;

  /** Whether mobile drawer is open */
  isMobileOpen: boolean;

  /** Toggle sidebar collapsed/expanded state */
  toggleCollapsed: () => void;

  /** Toggle mobile drawer open/closed state */
  toggleMobile: () => void;

  /** Close mobile drawer */
  closeMobile: () => void;
}
