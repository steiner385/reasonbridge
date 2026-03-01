/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';

export interface ResponseMenuProps {
  isOwnResponse: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  visible?: boolean;
  size?: 'sm' | 'md';
}

const ResponseMenu: React.FC<ResponseMenuProps> = ({
  isOwnResponse,
  onEdit,
  onDelete,
  onReport,
  visible = true,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleEdit = () => {
    setIsOpen(false);
    onEdit?.();
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete?.();
  };

  const handleReport = () => {
    setIsOpen(false);
    onReport?.();
  };

  const sizeClasses = {
    sm: {
      button: 'w-6 h-6',
      icon: 'w-4 h-4',
      menu: 'min-w-[120px] text-sm',
      item: 'px-3 py-1.5',
    },
    md: {
      button: 'w-8 h-8',
      icon: 'w-5 h-5',
      menu: 'min-w-[140px] text-base',
      item: 'px-4 py-2',
    },
  };

  const currentSize = sizeClasses[size];

  if (!visible) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${currentSize.button}
          inline-flex items-center justify-center
          rounded-md
          text-gray-500 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-700
          hover:text-gray-700 dark:hover:text-gray-200
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500
          transition-colors
        `}
        aria-label="More options"
        aria-haspopup="true"
        aria-expanded={isOpen}
        data-testid="response-menu"
      >
        <svg
          className={currentSize.icon}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`
            absolute right-0 top-full mt-1
            ${currentSize.menu}
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-md shadow-lg
            z-50
            py-1
          `}
          role="menu"
          aria-orientation="vertical"
        >
          {isOwnResponse ? (
            <>
              <button
                onClick={handleEdit}
                className={`
                  ${currentSize.item}
                  w-full text-left
                  text-gray-700 dark:text-gray-200
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  flex items-center gap-2
                `}
                role="menuitem"
                data-testid="edit-response"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>

              <button
                onClick={handleDelete}
                className={`
                  ${currentSize.item}
                  w-full text-left
                  text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-900/20
                  flex items-center gap-2
                `}
                role="menuitem"
                data-testid="delete-response"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </>
          ) : (
            <button
              onClick={handleReport}
              className={`
                ${currentSize.item}
                w-full text-left
                text-gray-700 dark:text-gray-200
                hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-2
              `}
              role="menuitem"
              data-testid="report-response"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Report
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponseMenu;
