/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

export interface Tag {
  id: string;
  name: string;
  count?: number;
}

export interface TagFilterProps {
  /**
   * Available tags to filter by
   */
  tags: Tag[];

  /**
   * Currently selected tag IDs
   */
  selectedTags: string[];

  /**
   * Callback when selected tags change
   */
  onChange: (tagIds: string[]) => void;

  /**
   * Label for the filter section
   */
  label?: string;

  /**
   * Maximum number of tags to show initially
   */
  maxVisible?: number;

  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * TagFilter - Multi-select tag filter component
 *
 * Features:
 * - Multiple tag selection
 * - Optional tag counts
 * - Show more/less toggle
 * - Dark mode support
 * - Checkbox-style selection
 *
 * @example
 * <TagFilter
 *   tags={availableTags}
 *   selectedTags={selectedTagIds}
 *   onChange={setSelectedTagIds}
 *   label="Filter by Tags"
 * />
 */
function TagFilter({
  tags,
  selectedTags,
  onChange,
  label = 'Tags',
  maxVisible = 5,
  className = '',
}: TagFilterProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleTags = showAll ? tags : tags.slice(0, maxVisible);
  const hasMore = tags.length > maxVisible;

  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {selectedTags.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Tag List */}
      <div className="space-y-2">
        {visibleTags.map((tag) => (
          <label key={tag.id} className="flex items-center gap-2 cursor-pointer group">
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selectedTags.includes(tag.id)}
              onChange={() => handleToggleTag(tag.id)}
              className="
                h-4 w-4 rounded
                text-primary-600 dark:text-primary-500
                border-gray-300 dark:border-gray-600
                focus:ring-2 focus:ring-primary-500 focus:ring-offset-0
                bg-white dark:bg-gray-700
                cursor-pointer
              "
            />

            {/* Tag Name */}
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
              {tag.name}
            </span>

            {/* Count (if provided) */}
            {tag.count !== undefined && (
              <span className="text-xs text-gray-500 dark:text-gray-300">({tag.count})</span>
            )}
          </label>
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          {showAll ? 'Show less' : `Show ${tags.length - maxVisible} more`}
        </button>
      )}
    </div>
  );
}

export default TagFilter;
