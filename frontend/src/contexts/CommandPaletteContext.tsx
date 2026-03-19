/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * CommandPaletteContext provides global command palette state and Cmd/Ctrl+K handling
 *
 * @remarks
 * Manages the command palette modal state and keyboard shortcut:
 * - Cmd/Ctrl+K to open command palette
 * - Tracks recent items for quick access
 * - Integrates with navigation system
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CommandPalette, { type CommandItem } from '../components/ui/CommandPalette';

/**
 * Maximum number of recent items to track
 */
const MAX_RECENT_ITEMS = 5;

/**
 * Local storage key for recent items
 */
const RECENT_ITEMS_KEY = 'command-palette-recent';

/**
 * Recent item stored in local storage
 */
interface StoredRecentItem {
  id: string;
  label: string;
  description?: string;
  path?: string;
  topicId?: string;
  timestamp: number;
}

/**
 * Command palette context value
 */
interface CommandPaletteContextValue {
  /**
   * Whether the command palette is open
   */
  isOpen: boolean;

  /**
   * Open the command palette
   */
  open: () => void;

  /**
   * Close the command palette
   */
  close: () => void;

  /**
   * Toggle the command palette
   */
  toggle: () => void;

  /**
   * Add a recent item
   */
  addRecentItem: (item: StoredRecentItem) => void;

  /**
   * Clear recent items
   */
  clearRecentItems: () => void;

  /**
   * Available topics for search
   */
  topics: Array<{ id: string; title: string; description?: string }>;

  /**
   * Set the available topics
   */
  setTopics: (topics: Array<{ id: string; title: string; description?: string }>) => void;

  /**
   * Custom actions to add to the palette
   */
  actions: CommandItem[];

  /**
   * Register custom actions
   */
  registerActions: (actions: CommandItem[]) => void;

  /**
   * Unregister custom actions
   */
  unregisterActions: (actionIds: string[]) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export interface CommandPaletteProviderProps {
  children: React.ReactNode;
}

/**
 * Load recent items from local storage
 */
function loadRecentItems(): StoredRecentItem[] {
  try {
    const stored = localStorage.getItem(RECENT_ITEMS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Save recent items to local storage
 */
function saveRecentItems(items: StoredRecentItem[]): void {
  try {
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

/**
 * CommandPaletteProvider wraps the app to provide global command palette functionality
 */
export const CommandPaletteProvider: React.FC<CommandPaletteProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<StoredRecentItem[]>(() => loadRecentItems());
  const [topics, setTopics] = useState<Array<{ id: string; title: string; description?: string }>>(
    [],
  );
  const [customActions, setCustomActions] = useState<CommandItem[]>([]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const addRecentItem = useCallback((item: StoredRecentItem) => {
    setRecentItems((prev) => {
      // Remove existing item with same id
      const filtered = prev.filter((i) => i.id !== item.id);
      // Add new item at the beginning
      const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_ITEMS);
      saveRecentItems(updated);
      return updated;
    });
  }, []);

  const clearRecentItems = useCallback(() => {
    setRecentItems([]);
    saveRecentItems([]);
  }, []);

  const registerActions = useCallback((actions: CommandItem[]) => {
    setCustomActions((prev) => {
      // Remove any existing actions with same ids
      const existingIds = new Set(actions.map((a) => a.id));
      const filtered = prev.filter((a) => !existingIds.has(a.id));
      return [...filtered, ...actions];
    });
  }, []);

  const unregisterActions = useCallback((actionIds: string[]) => {
    const idsToRemove = new Set(actionIds);
    setCustomActions((prev) => prev.filter((a) => !idsToRemove.has(a.id)));
  }, []);

  // Convert recent items to CommandItem format
  const recentCommandItems: CommandItem[] = useMemo(
    () =>
      recentItems.map((item) => ({
        id: `recent-${item.id}`,
        label: item.label,
        description: item.description,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        onSelect: () => {
          if (item.topicId) {
            navigate(`/topics/${item.topicId}`);
          } else if (item.path) {
            navigate(item.path);
          }
          close();
        },
      })),
    [recentItems, navigate, close],
  );

  // Handle topic navigation with recent tracking
  const handleNavigateToTopic = useCallback(
    (topicId: string) => {
      const topic = topics.find((t) => t.id === topicId);
      if (topic) {
        addRecentItem({
          id: `topic-${topicId}`,
          label: topic.title,
          description: topic.description,
          topicId,
          timestamp: Date.now(),
        });
      }
      navigate(`/topics/${topicId}`);
      close();
    },
    [topics, navigate, close, addRecentItem],
  );

  // Handle generic navigation with recent tracking
  const handleNavigate = useCallback(
    (path: string) => {
      // Add to recent for non-topic navigation
      const pathNames: Record<string, string> = {
        '/': 'Home',
        '/topics': 'Browse Topics',
        '/profile': 'Profile',
        '/settings': 'Settings',
        '/topics/new': 'Create New Topic',
      };
      const label = pathNames[path];
      if (label) {
        addRecentItem({
          id: `nav-${path}`,
          label,
          path,
          timestamp: Date.now(),
        });
      }
      navigate(path);
      close();
    },
    [navigate, close, addRecentItem],
  );

  // Global Cmd/Ctrl+K handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  const value: CommandPaletteContextValue = {
    isOpen,
    open,
    close,
    toggle,
    addRecentItem,
    clearRecentItems,
    topics,
    setTopics,
    actions: customActions,
    registerActions,
    unregisterActions,
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette
        isOpen={isOpen}
        onClose={close}
        topics={topics}
        onNavigateToTopic={handleNavigateToTopic}
        onNavigate={handleNavigate}
        recentItems={recentCommandItems}
        actions={customActions}
      />
    </CommandPaletteContext.Provider>
  );
};

/**
 * useCommandPalette hook to access command palette state and controls
 */
export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
}

/**
 * Optional hook that doesn't throw if provider is missing
 */
export function useOptionalCommandPalette(): CommandPaletteContextValue | null {
  return useContext(CommandPaletteContext);
}

export default CommandPaletteContext;
