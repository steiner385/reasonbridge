/**
 * T036 [US3] - Topic Edit History Component (Feature 016)
 *
 * Displays chronological edit history for a topic with diff views:
 * - Timeline of all edits
 * - Visual diffs for title, description, tags changes
 * - Editor information and timestamps
 * - Edit reasons and moderation flags
 */

import { useState } from 'react';
import { useTopicEditHistory, type TopicEdit } from '../../hooks/useTopicEditHistory';
import Button from '../ui/Button';

export interface TopicEditHistoryProps {
  topicId: string;
  limit?: number;
}

function EditDiff({ edit }: { edit: TopicEdit }) {
  const hasChanges =
    edit.newTitle !== undefined || edit.newDescription !== undefined || edit.newTags !== undefined;

  if (!hasChanges) {
    return null;
  }

  return (
    <div className="space-y-3 mt-3">
      {/* Title changes */}
      {edit.newTitle !== undefined && (
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-gray-600 mb-2">Title</h5>
          <div className="space-y-2">
            {edit.previousTitle && (
              <div className="bg-red-50 border-l-4 border-red-400 p-2">
                <p className="text-xs text-red-700">
                  <span className="font-medium">- </span>
                  {edit.previousTitle}
                </p>
              </div>
            )}
            <div className="bg-green-50 border-l-4 border-green-400 p-2">
              <p className="text-xs text-green-700">
                <span className="font-medium">+ </span>
                {edit.newTitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Description changes */}
      {edit.newDescription !== undefined && (
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-gray-600 mb-2">Description</h5>
          <div className="space-y-2">
            {edit.previousDescription && (
              <div className="bg-red-50 border-l-4 border-red-400 p-2">
                <p className="text-xs text-red-700 whitespace-pre-wrap line-clamp-3">
                  <span className="font-medium">- </span>
                  {edit.previousDescription}
                </p>
              </div>
            )}
            <div className="bg-green-50 border-l-4 border-green-400 p-2">
              <p className="text-xs text-green-700 whitespace-pre-wrap line-clamp-3">
                <span className="font-medium">+ </span>
                {edit.newDescription}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tags changes */}
      {edit.newTags !== undefined && (
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-gray-600 mb-2">Tags</h5>
          <div className="space-y-2">
            {edit.previousTags && edit.previousTags.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-2">
                <p className="text-xs text-red-700 mb-1">
                  <span className="font-medium">- Removed:</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {edit.previousTags
                    .filter((tag) => !edit.newTags?.includes(tag))
                    .map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
            )}
            <div className="bg-green-50 border-l-4 border-green-400 p-2">
              <p className="text-xs text-green-700 mb-1">
                <span className="font-medium">+ Added:</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {edit.newTags
                  .filter((tag) => !edit.previousTags?.includes(tag))
                  .map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditHistoryItem({ edit }: { edit: TopicEdit }) {
  const [expanded, setExpanded] = useState(false);

  const editDate = new Date(edit.editedAt);
  const relativeTime = getRelativeTime(editDate);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-900">
              {edit.editor?.name || `User ${edit.editorId}`}
            </p>
            <span className="text-xs text-gray-500">{relativeTime}</span>
          </div>

          {/* Edit reason */}
          {edit.changeReason && (
            <p className="text-sm text-gray-600 mt-1 italic">"{edit.changeReason}"</p>
          )}

          {/* Moderation flag */}
          {edit.flagForReview && (
            <div className="flex items-center gap-1 mt-2">
              <svg
                className="w-4 h-4 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                />
              </svg>
              <span className="text-xs text-yellow-700">Flagged for review</span>
            </div>
          )}
        </div>

        {/* Expand/Collapse button */}
        <Button variant="secondary" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide Changes' : 'Show Changes'}
        </Button>
      </div>

      {/* Edit diff (collapsed by default) */}
      {expanded && <EditDiff edit={edit} />}
    </div>
  );
}

export function TopicEditHistory({ topicId, limit = 50 }: TopicEditHistoryProps) {
  const { data, isLoading, error } = useTopicEditHistory(topicId, limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-red-600 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load edit history</p>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.edits.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No edit history available</p>
        <p className="text-xs text-gray-400 mt-1">This topic has not been edited yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Edit History</h3>
        <span className="text-sm text-gray-500">
          {data.total} {data.total === 1 ? 'edit' : 'edits'}
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {data.edits.map((edit) => (
          <EditHistoryItem key={edit.id} edit={edit} />
        ))}
      </div>

      {/* Load more indicator */}
      {data.total > data.edits.length && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Showing {data.edits.length} of {data.total} edits
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to format relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export default TopicEditHistory;
