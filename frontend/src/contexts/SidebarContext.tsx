/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { SidebarContextType } from '../types/navigation';

/**
 * Sidebar Context
 * Manages sidebar collapsed/expanded state (desktop) and mobile drawer state
 */

const SidebarContext = createContext<SidebarContextType | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
}

/**
 * Sidebar Provider Component
 * Provides sidebar state management to the application
 * - Desktop: Sidebar can be collapsed/expanded (persistent via localStorage)
 * - Mobile: Drawer can be opened/closed (ephemeral, always starts closed)
 */
export function SidebarProvider({ children }: SidebarProviderProps) {
  // Desktop sidebar collapsed state (persistent)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed');
      return stored === 'true';
    } catch {
      return false; // Default to expanded
    }
  });

  // Mobile drawer open state (ephemeral, always starts closed)
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Persist sidebar collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
    } catch (error) {
      console.error('Failed to save sidebar state to localStorage:', error);
    }
  }, [isCollapsed]);

  // Toggle sidebar collapsed/expanded state
  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Toggle mobile drawer open/closed state
  const toggleMobile = () => {
    setIsMobileOpen((prev) => !prev);
  };

  // Close mobile drawer (used for route changes, backdrop clicks, Escape key)
  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  const value: SidebarContextType = {
    isCollapsed,
    isMobileOpen,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

/**
 * Hook to access Sidebar context
 * Must be used within SidebarProvider
 */
export function useSidebarContext(): SidebarContextType {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within SidebarProvider');
  }
  return context;
}
