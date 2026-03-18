/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bookmarks Page
 *
 * Displays a list of user's bookmarked responses.
 * Each bookmark shows response content, author, topic link, and date.
 * Users can remove bookmarks directly from this page.
 *
 * @remarks
 * **Features:**
 * - Paginated list of bookmarked responses with React Query caching
 * - Response content with mention rendering
 * - Links to topics and author profiles
 * - Remove bookmark functionality with optimistic updates
 * - Loading skeleton states
 * - Empty state for no bookmarks
 * - Full dark mode support
 * - Responsive layout for all screen sizes
 *
 * @example
 * ```tsx
 * // Used in router configuration
 * <Route path="/bookmarks" element={<BookmarksPage />} />
 * ```
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBookmarks, useBookmarkStatus } from '../../hooks/useBookmarks';
import { MentionRenderer } from '../../components/responses/MentionRenderer';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import type { Bookmark } from '../../services/bookmarkService';

/**
 * Format a date string to a human-readable relative time
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

interface BookmarkCardProps {
  bookmark: Bookmark;
  onRemove: () => void;
  isRemoving: boolean;
}

/**
 * Individual bookmark card displaying response details with remove action
 */
function BookmarkCard({ bookmark, onRemove, isRemoving }: BookmarkCardProps) {
  const response = bookmark.response;

  if (!response) {
    return null;
  }

  return (
    <article
      className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      data-testid="bookmark-card"
    >
      <div className="flex items-start gap-4">
        {/* Bookmark icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          {/* Topic link */}
          <div className="mb-2">
            <Link
              to={`/discussions?topic=${response.topicId}`}
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {response.topicTitle}
            </Link>
          </div>

          {/* Response content with mention support */}
          <div className="mb-3">
            <MentionRenderer
              content={response.content}
              className="text-gray-900 dark:text-white line-clamp-3"
            />
          </div>

          {/* Author and date */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              to={`/profile/${response.authorDisplayName}`}
              className="font-medium text-gray-700 hover:underline dark:text-gray-300"
            >
              {response.authorDisplayName}
            </Link>
            <span aria-hidden="true">-</span>
            <time dateTime={response.createdAt}>{formatTimeAgo(response.createdAt)}</time>
          </div>
        </div>

        {/* Remove bookmark button */}
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 disabled:opacity-50 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-red-400"
          aria-label="Remove bookmark"
          title="Remove bookmark"
        >
          {isRemoving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      </div>
    </article>
  );
}

/**
 * Wrapper component to manage bookmark removal state
 */
function BookmarkCardWithState({ bookmark }: { bookmark: Bookmark }) {
  const { removeBookmark, isPending } = useBookmarkStatus(bookmark.responseId);

  return <BookmarkCard bookmark={bookmark} onRemove={removeBookmark} isRemoving={isPending} />;
}

/**
 * Loading skeleton for bookmark cards
 */
function BookmarkSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width="100%" height={14} />
          <Skeleton variant="text" width="80%" height={14} />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton variant="text" width="20%" height={12} />
            <Skeleton variant="text" width="15%" height={12} />
          </div>
        </div>
        <Skeleton variant="rectangular" width={40} height={40} className="rounded-md" />
      </div>
    </div>
  );
}

/**
 * Empty state when user has no bookmarks
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="mb-4 h-12 w-12 text-gray-400"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No bookmarks yet</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-300">
        Save responses you find valuable for easy access later. Click the bookmark icon on any
        response to save it here.
      </p>
      <Link
        to="/topics"
        className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Explore Topics
      </Link>
    </div>
  );
}

/**
 * Error state with retry action
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
      <p className="text-red-700 dark:text-red-300">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 text-sm font-medium text-red-700 hover:underline dark:text-red-400"
      >
        Try again
      </button>
    </div>
  );
}

const ITEMS_PER_PAGE = 20;

/**
 * Bookmarks page component displaying saved responses
 */
export default function BookmarksPage() {
  const [page, setPage] = useState(0);
  const offset = page * ITEMS_PER_PAGE;

  const { bookmarks, total, isLoading, isError, error, refetch } = useBookmarks(
    ITEMS_PER_PAGE,
    offset,
  );

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const hasMultiplePages = totalPages > 1;

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bookmarks</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Your saved responses</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <BookmarkSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bookmarks</h1>
        </div>
        <ErrorState
          message={error?.message ?? 'Failed to load bookmarks'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bookmarks</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {total > 0 ? `${total} saved response${total === 1 ? '' : 's'}` : 'Your saved responses'}
        </p>
      </div>

      {/* Bookmarks List or Empty State */}
      {bookmarks.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="space-y-3">
            {bookmarks.map((bookmark) => (
              <BookmarkCardWithState key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>

          {/* Pagination */}
          {hasMultiplePages && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Previous page"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
              </button>

              <span className="px-3 text-sm text-gray-600 dark:text-gray-400">
                Page {page + 1} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Next page"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
