/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * CommandPalette component provides a quick switcher / command palette
 *
 * @remarks
 * **Features:**
 * - Cmd/Ctrl+K to open
 * - Fuzzy search across topics, actions, and navigation
 * - Recent items shown by default
 * - Keyboard navigation with arrow keys and Enter
 * - Dark mode support
 * - Accessible with ARIA
 *
 * @example
 * ```tsx
 * <CommandPalette
 *   isOpen={showPalette}
 *   onClose={() => setShowPalette(false)}
 *   topics={topics}
 *   onNavigate={(path) => navigate(path)}
 * />
 * ```
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Command } from 'cmdk';

export interface CommandItem {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Display label
   */
  label: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Icon component or element
   */
  icon?: React.ReactNode;

  /**
   * Keyboard shortcut hint
   */
  shortcut?: string[];

  /**
   * Callback when item is selected
   */
  onSelect: () => void;

  /**
   * Category for grouping
   */
  category?: string;

  /**
   * Search keywords (in addition to label)
   */
  keywords?: string[];
}

export interface CommandPaletteProps {
  /**
   * Whether the palette is open
   */
  isOpen: boolean;

  /**
   * Callback when palette should close
   */
  onClose: () => void;

  /**
   * Static actions (navigation, settings, etc.)
   */
  actions?: CommandItem[];

  /**
   * Dynamic topics for search
   */
  topics?: Array<{
    id: string;
    title: string;
    description?: string;
  }>;

  /**
   * Callback when navigating to a topic
   */
  onNavigateToTopic?: (topicId: string) => void;

  /**
   * Callback for generic navigation
   */
  onNavigate?: (path: string) => void;

  /**
   * Recently accessed items (shown by default)
   */
  recentItems?: CommandItem[];

  /**
   * Placeholder text for search input
   */
  placeholder?: string;
}

/**
 * Default navigation actions
 */
const getDefaultActions = (
  onNavigate?: (path: string) => void,
  onClose?: () => void,
): CommandItem[] => {
  if (!onNavigate) return [];

  return [
    {
      id: 'nav-home',
      label: 'Go to Home',
      description: 'Navigate to the home page',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      category: 'Navigation',
      onSelect: () => {
        onNavigate('/');
        onClose?.();
      },
    },
    {
      id: 'nav-topics',
      label: 'Browse Topics',
      description: 'View all discussion topics',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
      category: 'Navigation',
      onSelect: () => {
        onNavigate('/topics');
        onClose?.();
      },
    },
    {
      id: 'nav-profile',
      label: 'Go to Profile',
      description: 'View your profile',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      category: 'Navigation',
      onSelect: () => {
        onNavigate('/profile');
        onClose?.();
      },
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      description: 'Manage your preferences',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      shortcut: ['⌘', ','],
      category: 'Navigation',
      onSelect: () => {
        onNavigate('/settings');
        onClose?.();
      },
    },
    {
      id: 'action-new-topic',
      label: 'Create New Topic',
      description: 'Start a new discussion',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      shortcut: ['⌘', 'N'],
      category: 'Actions',
      onSelect: () => {
        onNavigate('/topics/new');
        onClose?.();
      },
    },
  ];
};

/**
 * CommandPalette component
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  actions = [],
  topics = [],
  onNavigateToTopic,
  onNavigate,
  recentItems = [],
  placeholder = 'Search topics, actions, or navigation...',
}) => {
  const [search, setSearch] = useState('');

  // Reset search when palette opens
  // This is intentional state synchronization based on prop changes
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional reset on open
      setSearch('');
    }
  }, [isOpen]);

  // Get default actions
  const defaultActions = useMemo(
    () => getDefaultActions(onNavigate, onClose),
    [onNavigate, onClose],
  );

  // Combine all actions
  const allActions = useMemo(() => [...defaultActions, ...actions], [defaultActions, actions]);

  // Convert topics to command items
  const topicItems: CommandItem[] = useMemo(
    () =>
      topics.map((topic) => ({
        id: `topic-${topic.id}`,
        label: topic.title,
        description: topic.description,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        ),
        category: 'Topics',
        onSelect: () => {
          onNavigateToTopic?.(topic.id);
          onClose();
        },
      })),
    [topics, onNavigateToTopic, onClose],
  );

  // Handle item selection
  const handleSelect = useCallback((item: CommandItem) => {
    item.onSelect();
  }, []);

  // Group items by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const action of allActions) {
      const category = action.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(action);
    }
    return groups;
  }, [allActions]);

  if (!isOpen) return null;

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      label="Command Palette"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg">
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          data-testid="command-palette"
        >
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <svg
              className="w-5 h-5 text-gray-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={placeholder}
              className="flex-1 px-3 py-4 text-base bg-transparent border-0 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              data-testid="command-palette-input"
            />
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </Command.Empty>

            {/* Recent Items */}
            {recentItems.length > 0 && !search && (
              <Command.Group heading="Recent" className="mb-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Recent
                </div>
                {recentItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 data-[selected=true]:bg-primary-50 dark:data-[selected=true]:bg-primary-900/30"
                  >
                    {item.icon && (
                      <span className="text-gray-400 dark:text-gray-500">{item.icon}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 truncate">{item.description}</div>
                      )}
                    </div>
                    {item.shortcut && (
                      <div className="flex items-center gap-1">
                        {item.shortcut.map((key, i) => (
                          <kbd
                            key={i}
                            className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Topics */}
            {topicItems.length > 0 && (
              <Command.Group heading="Topics" className="mb-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Topics
                </div>
                {topicItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.description || ''}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 data-[selected=true]:bg-primary-50 dark:data-[selected=true]:bg-primary-900/30"
                  >
                    {item.icon && (
                      <span className="text-gray-400 dark:text-gray-500">{item.icon}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 truncate">{item.description}</div>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Actions by Category */}
            {Object.entries(groupedActions).map(([category, items]) => (
              <Command.Group key={category} heading={category} className="mb-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {category}
                </div>
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.description || ''} ${(item.keywords || []).join(' ')}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 data-[selected=true]:bg-primary-50 dark:data-[selected=true]:bg-primary-900/30"
                  >
                    {item.icon && (
                      <span className="text-gray-400 dark:text-gray-500">{item.icon}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 truncate">{item.description}</div>
                      )}
                    </div>
                    {item.shortcut && (
                      <div className="flex items-center gap-1">
                        {item.shortcut.map((key, i) => (
                          <kbd
                            key={i}
                            className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">esc</kbd>
                to close
              </span>
            </div>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
};

export default CommandPalette;
