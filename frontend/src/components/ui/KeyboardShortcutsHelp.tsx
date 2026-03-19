/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * KeyboardShortcutsHelp modal displays available keyboard shortcuts
 *
 * @remarks
 * **Features:**
 * - Organized shortcut categories (Navigation, Actions, General)
 * - Visual key display with keyboard styling
 * - Dark mode support
 * - Accessible with ARIA labels
 *
 * @example
 * ```tsx
 * <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
 * ```
 */

import React from 'react';
import Modal from './Modal';

export interface KeyboardShortcut {
  /**
   * The key(s) to display
   */
  keys: string[];

  /**
   * Description of what the shortcut does
   */
  description: string;
}

export interface ShortcutCategory {
  /**
   * Category title
   */
  title: string;

  /**
   * Shortcuts in this category
   */
  shortcuts: KeyboardShortcut[];
}

export interface KeyboardShortcutsHelpProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;

  /**
   * Custom shortcut categories (overrides defaults)
   */
  categories?: ShortcutCategory[];
}

/**
 * Default keyboard shortcuts
 */
const DEFAULT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['j'], description: 'Move to next response' },
      { keys: ['k'], description: 'Move to previous response' },
      { keys: ['Tab'], description: 'Move through interactive elements' },
      { keys: ['Shift', 'Tab'], description: 'Move backwards through elements' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['r'], description: 'Reply to focused response' },
      { keys: ['Enter'], description: 'Open or activate focused item' },
      { keys: ['/'], description: 'Focus search bar' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show this help dialog' },
      { keys: ['Esc'], description: 'Close modal or deselect' },
    ],
  },
];

/**
 * KeyboardKey component for rendering a single key
 */
const KeyboardKey: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
    {children}
  </kbd>
);

/**
 * KeyboardShortcutsHelp modal component
 */
const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  categories = DEFAULT_CATEGORIES,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
      data-testid="keyboard-shortcuts-modal"
    >
      <div className="space-y-6" role="list" aria-label="Keyboard shortcuts categories">
        {categories.map((category) => (
          <div key={category.title} role="listitem">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-3">
              {category.title}
            </h3>
            <ul className="space-y-2">
              {category.shortcuts.map((shortcut, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <span className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        {keyIndex > 0 && <span className="text-xs text-gray-400 mx-0.5">+</span>}
                        <KeyboardKey>{key}</KeyboardKey>
                      </React.Fragment>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Press <KeyboardKey>?</KeyboardKey> anywhere to open this help dialog
        </p>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;
