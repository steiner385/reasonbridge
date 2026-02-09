/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

interface DropdownProps {
  /** Trigger element (button, icon, etc.) */
  trigger: React.ReactNode;
  /** Dropdown content */
  children: React.ReactNode;
  /** Alignment relative to trigger */
  align?: 'left' | 'right';
  /** Whether dropdown is open (controlled) */
  isOpen?: boolean;
  /** Callback when open state changes (controlled) */
  onOpenChange?: (open: boolean) => void;
  /** Additional CSS classes for dropdown panel */
  className?: string;
  /** Whether to close on click outside */
  closeOnClickOutside?: boolean;
}

/**
 * Reusable dropdown/popover component
 *
 * Supports both controlled and uncontrolled modes.
 * Handles click outside, escape key, and positioning.
 */
export function Dropdown({
  trigger,
  children,
  align = 'right',
  isOpen: controlledIsOpen,
  onOpenChange,
  className = '',
  closeOnClickOutside = true,
}: DropdownProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : uncontrolledIsOpen;
  const setIsOpen = onOpenChange || setUncontrolledIsOpen;

  // Handle click outside
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeOnClickOutside, setIsOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, setIsOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={toggleDropdown}
        type="button"
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {trigger}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
            absolute z-50 mt-2 w-80 max-h-96 overflow-y-auto
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            ${align === 'right' ? 'right-0' : 'left-0'}
            ${className}
          `}
          role="menu"
          aria-orientation="vertical"
        >
          {children}
        </div>
      )}
    </div>
  );
}
