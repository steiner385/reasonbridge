import { useState, type ReactNode } from 'react';
import Button from './Button';

export interface FilterPanelProps {
  /**
   * Panel title
   */
  title?: string;

  /**
   * Filter content (inputs, checkboxes, etc.)
   */
  children: ReactNode;

  /**
   * Apply filters callback
   */
  onApply?: () => void;

  /**
   * Reset filters callback
   */
  onReset?: () => void;

  /**
   * Whether panel is initially open (desktop only)
   */
  defaultOpen?: boolean;

  /**
   * Show apply/reset buttons
   */
  showActions?: boolean;

  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * FilterPanel - Collapsible panel for filter controls
 *
 * Features:
 * - Collapsible on mobile
 * - Always visible on desktop
 * - Apply and reset actions
 * - Dark mode support
 * - Smooth animations
 *
 * @example
 * <FilterPanel
 *   title="Filter Topics"
 *   onApply={handleApplyFilters}
 *   onReset={handleResetFilters}
 * >
 *   <TagFilter tags={tags} onChange={setSelectedTags} />
 *   <StatusFilter status={status} onChange={setStatus} />
 * </FilterPanel>
 */
function FilterPanel({
  title = 'Filters',
  children,
  onApply,
  onReset,
  defaultOpen = true,
  showActions = true,
  className = '',
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>

        {/* Mobile toggle button */}
        <button
          onClick={toggleOpen}
          className="md:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          aria-label={isOpen ? 'Hide filters' : 'Show filters'}
          aria-expanded={isOpen}
        >
          <svg
            className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 md:max-h-[2000px] md:opacity-100'}
        `}
      >
        <div className="p-4 space-y-4">{children}</div>

        {/* Actions */}
        {showActions && (onApply || onReset) && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            {onReset && (
              <Button variant="outline" size="sm" onClick={onReset} className="flex-1">
                Reset
              </Button>
            )}
            {onApply && (
              <Button variant="primary" size="sm" onClick={onApply} className="flex-1">
                Apply Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterPanel;
