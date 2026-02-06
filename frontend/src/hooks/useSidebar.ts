import { useSidebarContext } from '../contexts/SidebarContext';
import type { SidebarContextType } from '../types/navigation';

/**
 * Hook to access sidebar state and actions
 * Convenience wrapper around useSidebarContext
 *
 * @returns Sidebar context with state and action methods
 *
 * @example
 * ```tsx
 * const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile, closeMobile } = useSidebar();
 *
 * // Toggle desktop sidebar
 * <button onClick={toggleCollapsed}>Toggle Sidebar</button>
 *
 * // Open mobile drawer
 * <button onClick={toggleMobile}>Menu</button>
 * ```
 */
export function useSidebar(): SidebarContextType {
  return useSidebarContext();
}
