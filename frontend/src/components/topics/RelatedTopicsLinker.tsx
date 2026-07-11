/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  LinkedTopic,
  TopicRelationshipType,
  ConfirmationStatus,
  CreateTopicLinkRequest,
} from '../../types/topic-links';
import {
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_TYPE_COLORS,
  RELATIONSHIP_TYPE_ICONS,
  CONFIRMATION_STATUS_COLORS,
} from '../../types/topic-links';
import type { Topic } from '../../types/topic';

/**
 * Props for RelatedTopicsLinker component
 */
export interface RelatedTopicsLinkerProps {
  /**
   * Current topic ID
   */
  topicId: string;

  /**
   * Linked topics data
   */
  linkedTopics: LinkedTopic[];

  /**
   * Whether data is loading
   */
  isLoading?: boolean;

  /**
   * Error message if any
   */
  error?: string | null;

  /**
   * Whether to show pending links
   */
  showPending?: boolean;

  /**
   * Whether the current user can manage links (confirm/reject/delete)
   */
  canManageLinks?: boolean;

  /**
   * Available topics for linking (search results)
   */
  availableTopics?: Topic[];

  /**
   * Whether topic search is loading
   */
  isSearching?: boolean;

  /**
   * Callback when searching for topics
   */
  onSearch?: (query: string) => void;

  /**
   * Callback when creating a new link
   */
  onCreateLink?: (request: CreateTopicLinkRequest) => Promise<void>;

  /**
   * Callback when confirming a link
   */
  onConfirmLink?: (linkId: string) => Promise<void>;

  /**
   * Callback when rejecting a link
   */
  onRejectLink?: (linkId: string) => Promise<void>;

  /**
   * Callback when deleting a link
   */
  onDeleteLink?: (linkId: string) => Promise<void>;

  /**
   * Callback when navigating to a linked topic
   */
  onNavigateToTopic?: (topicId: string, slug: string) => void;

  /**
   * Callback when refreshing linked topics
   */
  onRefresh?: () => void;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Compact display mode
   */
  compact?: boolean;
}

/**
 * Badge component for relationship type
 */
const RelationshipBadge: React.FC<{
  type: TopicRelationshipType;
  compact?: boolean;
}> = ({ type, compact = false }) => {
  const colors = RELATIONSHIP_TYPE_COLORS[type];
  const icon = RELATIONSHIP_TYPE_ICONS[type];
  const label = RELATIONSHIP_TYPE_LABELS[type];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}
      title={label}
    >
      <span aria-hidden="true">{icon}</span>
      {!compact && <span>{label}</span>}
    </span>
  );
};

/**
 * Badge component for confirmation status
 */
const StatusBadge: React.FC<{
  status: ConfirmationStatus;
}> = ({ status }) => {
  const colors = CONFIRMATION_STATUS_COLORS[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}
    >
      {status.toLowerCase()}
    </span>
  );
};

/**
 * Loading skeleton for linked topic item
 */
const LinkedTopicSkeleton: React.FC = () => (
  <div className="flex items-center justify-between p-3 animate-pulse">
    <div className="flex items-center gap-3 flex-1">
      <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
  </div>
);

/**
 * Empty state component
 */
const EmptyState: React.FC<{
  onAddLink?: () => void;
  canManageLinks?: boolean;
}> = ({ onAddLink, canManageLinks }) => (
  <div className="text-center py-8 px-4">
    <svg
      className="mx-auto h-12 w-12 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No related topics</h3>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      This topic is not linked to any other topics yet.
    </p>
    {canManageLinks && onAddLink && (
      <div className="mt-4">
        <button
          type="button"
          onClick={onAddLink}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 dark:text-primary-200 dark:bg-primary-900 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg
            className="-ml-0.5 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Link a topic
        </button>
      </div>
    )}
  </div>
);

/**
 * Error state component
 */
const ErrorState: React.FC<{
  error: string;
  onRetry?: () => void;
}> = ({ error, onRetry }) => (
  <div className="text-center py-8 px-4">
    <svg
      className="mx-auto h-12 w-12 text-red-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
      Failed to load related topics
    </h3>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
    {onRetry && (
      <div className="mt-4">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg
            className="-ml-0.5 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Try again
        </button>
      </div>
    )}
  </div>
);

/**
 * Linked topic item component
 */
const LinkedTopicItem: React.FC<{
  topic: LinkedTopic;
  canManageLinks?: boolean;
  compact?: boolean;
  onNavigate?: (topicId: string, slug: string) => void;
  onConfirm?: (linkId: string) => Promise<void>;
  onReject?: (linkId: string) => Promise<void>;
  onDelete?: (linkId: string) => Promise<void>;
}> = ({ topic, canManageLinks, compact, onNavigate, onConfirm, onReject, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleNavigate = useCallback(() => {
    onNavigate?.(topic.id, topic.slug);
  }, [onNavigate, topic.id, topic.slug]);

  const handleConfirm = useCallback(async () => {
    if (!onConfirm) return;
    setIsUpdating(true);
    try {
      await onConfirm(topic.linkId);
    } finally {
      setIsUpdating(false);
    }
  }, [onConfirm, topic.linkId]);

  const handleReject = useCallback(async () => {
    if (!onReject) return;
    setIsUpdating(true);
    try {
      await onReject(topic.linkId);
    } finally {
      setIsUpdating(false);
    }
  }, [onReject, topic.linkId]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(topic.linkId);
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, topic.linkId]);

  const isPending = topic.confirmationStatus === 'PENDING';

  return (
    <div
      className={`group flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        isDeleting ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <RelationshipBadge type={topic.relationshipType} compact={compact} />
        <button
          type="button"
          onClick={handleNavigate}
          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 truncate text-left"
          title={topic.title}
        >
          {topic.title}
        </button>
        {isPending && <StatusBadge status={topic.confirmationStatus} />}
      </div>

      {canManageLinks && (
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {isPending && onConfirm && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isUpdating}
              className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
              title="Confirm link"
              aria-label="Confirm link"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          )}
          {isPending && onReject && (
            <button
              type="button"
              onClick={handleReject}
              disabled={isUpdating}
              className="p-1.5 text-red-700 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
              title="Reject link"
              aria-label="Reject link"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-red-700 dark:text-gray-500 dark:hover:text-red-400 disabled:opacity-50"
              title="Remove link"
              aria-label="Remove link"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Add link modal component
 */
const AddLinkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  availableTopics?: Topic[];
  isSearching?: boolean;
  onSearch: (query: string) => void;
  onCreateLink: (request: CreateTopicLinkRequest) => Promise<void>;
  currentTopicId: string;
}> = ({
  isOpen,
  onClose,
  availableTopics = [],
  isSearching,
  onSearch,
  onCreateLink,
  currentTopicId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedRelationship, setSelectedRelationship] =
    useState<TopicRelationshipType>('RELATED');
  const [isCreating, setIsCreating] = useState(false);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      onSearch(query);
    },
    [onSearch],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTopicId) return;

      setIsCreating(true);
      try {
        await onCreateLink({
          targetTopicId: selectedTopicId,
          relationshipType: selectedRelationship,
          linkSource: 'USER_PROPOSED',
        });
        onClose();
        setSearchQuery('');
        setSelectedTopicId(null);
        setSelectedRelationship('RELATED');
      } finally {
        setIsCreating(false);
      }
    },
    [selectedTopicId, selectedRelationship, onCreateLink, onClose],
  );

  const filteredTopics = useMemo(() => {
    return availableTopics.filter((topic) => topic.id !== currentTopicId);
  }, [availableTopics, currentTopicId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 id="modal-title" className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Link Related Topic
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Search */}
              <div>
                <label
                  htmlFor="topic-search"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Search for a topic
                </label>
                <div className="relative">
                  <input
                    id="topic-search"
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Type to search topics..."
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg
                        className="animate-spin h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Topic selection */}
              {filteredTopics.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md">
                  {filteredTopics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                        selectedTopicId === topic.id
                          ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Relationship type */}
              <div>
                <label
                  htmlFor="relationship-type"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Relationship type
                </label>
                <select
                  id="relationship-type"
                  value={selectedRelationship}
                  onChange={(e) => setSelectedRelationship(e.target.value as TopicRelationshipType)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {(Object.keys(RELATIONSHIP_TYPE_LABELS) as TopicRelationshipType[]).map(
                    (type) => (
                      <option key={type} value={type}>
                        {RELATIONSHIP_TYPE_ICONS[type]} {RELATIONSHIP_TYPE_LABELS[type]}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedTopicId || isCreating}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/**
 * RelatedTopicsLinker - Component for displaying and managing related topic links
 *
 * @remarks
 * This component provides a complete interface for:
 * - Viewing linked topics with relationship type badges
 * - Creating new links to related topics via search
 * - Confirming or rejecting pending links
 * - Deleting existing links
 *
 * @example
 * ```tsx
 * <RelatedTopicsLinker
 *   topicId="topic-123"
 *   linkedTopics={linkedTopics}
 *   canManageLinks={isTopicOwner}
 *   onCreateLink={handleCreateLink}
 *   onNavigateToTopic={(id, slug) => navigate(`/topics/${slug}`)}
 * />
 * ```
 */
const RelatedTopicsLinker: React.FC<RelatedTopicsLinkerProps> = ({
  topicId,
  linkedTopics,
  isLoading = false,
  error = null,
  showPending = true,
  canManageLinks = false,
  availableTopics = [],
  isSearching = false,
  onSearch,
  onCreateLink,
  onConfirmLink,
  onRejectLink,
  onDeleteLink,
  onNavigateToTopic,
  onRefresh,
  className = '',
  compact = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredTopics = useMemo(() => {
    if (showPending) return linkedTopics;
    return linkedTopics.filter((t) => t.confirmationStatus !== 'PENDING');
  }, [linkedTopics, showPending]);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      onSearch?.(query);
    },
    [onSearch],
  );

  const handleCreateLink = useCallback(
    async (request: CreateTopicLinkRequest) => {
      await onCreateLink?.(request);
    },
    [onCreateLink],
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Related Topics</h3>
        </div>
        <div>
          <LinkedTopicSkeleton />
          <LinkedTopicSkeleton />
          <LinkedTopicSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
      >
        <ErrorState error={error} onRetry={onRefresh} />
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Related Topics
          {filteredTopics.length > 0 && (
            <span className="ml-2 text-gray-500 dark:text-gray-400">({filteredTopics.length})</span>
          )}
        </h3>
        {canManageLinks && onCreateLink && onSearch && (
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Link
          </button>
        )}
      </div>

      {/* Content */}
      {filteredTopics.length === 0 ? (
        <EmptyState
          onAddLink={onCreateLink && onSearch ? handleOpenModal : undefined}
          canManageLinks={canManageLinks}
        />
      ) : (
        <div>
          {filteredTopics.map((topic) => (
            <LinkedTopicItem
              key={topic.linkId}
              topic={topic}
              canManageLinks={canManageLinks}
              compact={compact}
              onNavigate={onNavigateToTopic}
              onConfirm={onConfirmLink}
              onReject={onRejectLink}
              onDelete={onDeleteLink}
            />
          ))}
        </div>
      )}

      {/* Add Link Modal */}
      {onCreateLink && onSearch && (
        <AddLinkModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          availableTopics={availableTopics}
          isSearching={isSearching}
          onSearch={handleSearch}
          onCreateLink={handleCreateLink}
          currentTopicId={topicId}
        />
      )}
    </div>
  );
};

export default RelatedTopicsLinker;
