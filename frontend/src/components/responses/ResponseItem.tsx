/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T044 [P] [US2] - Response Item Component (Feature 009)
 *
 * Displays an individual response with:
 * - Author info and timestamp
 * - Response content
 * - Citations (if any)
 * - Edit indicator (if edited)
 * - Reply button and nested replies (Phase 5)
 *
 * @remarks
 * **Compact Mode**: When `compact` is true, the component renders in a
 * space-efficient format similar to Discord/Slack messages:
 * - Smaller avatar (24px vs 40px)
 * - Reduced padding
 * - Inline name + timestamp
 * - Hover-only actions on desktop (always visible on mobile for touch)
 *
 * **Message Grouping**: When `isGroupStart` is false, the header (avatar,
 * name, time) is hidden, allowing consecutive messages from the same author
 * to visually flow together.
 */

import { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { ResponseDetail } from '../../services/discussionService';
import type { CreateResponseRequest } from '../../types/response';
import type { PreviewFeedbackItem } from '../../lib/feedback-api';
import { useReactions } from '../../hooks/useReactions';
import { useVotes } from '../../hooks/useVotes';
import { useAuthContext } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
import { InlineTrustBadge } from '../users';
import ResponseComposer from './ResponseComposer';
import { LightweightReplyComposer } from './LightweightReplyComposer';
import ReactionBar from './ReactionBar';
import ShareButton from './ShareButton';
import BookmarkButton from './BookmarkButton';
import { MentionRenderer } from './MentionRenderer';
import VoteButtons from './VoteButtons';
import ResponseMenu from './ResponseMenu';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import ReportDialog, { type ReportReason } from './ReportDialog';

export interface ResponseItemProps {
  response: ResponseDetail;
  discussionId: string;
  showReplies?: boolean;
  depth?: number;
  /** Callback when Reply button is clicked */
  onReply?: (responseId: string, parentId?: string) => void;
  /** Callback when inline reply is submitted */
  onReplySubmit?: (response: CreateResponseRequest) => Promise<void>;
  /** Callback for preview feedback changes (for right panel) */
  onPreviewFeedbackChange?: (
    feedback: PreviewFeedbackItem[],
    readyToPost: boolean,
    summary: string,
    isLoading?: boolean,
    error?: string | null,
  ) => void;
  /** Enable compact display mode with smaller elements and hover actions */
  compact?: boolean;
  /** Whether this response starts a message group (show avatar/name/time) */
  isGroupStart?: boolean;
  /** Whether this response ends a message group (for styling purposes) */
  isGroupEnd?: boolean;
  /** Use lightweight reply composer (auto-enabled in compact mode) */
  useLightweightComposer?: boolean;
  /** Show visual threading lines for nested replies */
  showThreadLines?: boolean;
  /** Whether this is the last reply in its sibling group (affects line termination) */
  isLastReply?: boolean;
  /** Minimum number of replies before showing collapse button (default: 5) */
  collapseThreshold?: number;
  /** Number of replies to show when collapsed (default: 2) */
  collapsedVisibleCount?: number;
  /** Set of thread IDs that are currently expanded */
  expandedThreads?: Set<string>;
  /** Callback when a thread is expanded */
  onThreadExpand?: (threadId: string) => void;
  /** Callback when a thread is collapsed */
  onThreadCollapse?: (threadId: string) => void;
}

export function ResponseItem({
  response,
  discussionId,
  showReplies = false,
  depth = 0,
  onReply,
  onReplySubmit,
  onPreviewFeedbackChange,
  compact = false,
  isGroupStart = true,
  isGroupEnd: _isGroupEnd = true,
  useLightweightComposer,
  showThreadLines = false,
  isLastReply = false,
  collapseThreshold = 5,
  collapsedVisibleCount = 2,
  expandedThreads,
  onThreadExpand,
  onThreadCollapse,
}: ResponseItemProps) {
  // Use lightweight composer by default in compact mode
  const shouldUseLightweightComposer = useLightweightComposer ?? compact;
  const [showReplyForm, setShowReplyForm] = useState(false);

  // Reactions hook for this response
  const { reactions, toggleReaction, isPending: isReactionPending } = useReactions(response.id);

  // Auth context for current user
  const { user: currentUser, isLoading: isAuthLoading } = useAuthContext();

  // Votes hook
  const { voteSummary, upvote, downvote, isPending: isVotePending } = useVotes(response.id);

  // Response menu state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user owns this response
  const isOwnResponse = currentUser?.id === response.author.id;

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/responses/${response.id}`);
      setShowDeleteDialog(false);
    } catch (err) {
      console.error('Failed to delete response:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle report
  const handleReport = async (reason: ReportReason, additionalInfo?: string) => {
    await apiClient.post('/moderation/safety-reports', {
      reporterId: currentUser?.id,
      reason,
      additionalInfo,
      contextResponseId: response.id,
    });
  };

  const handleReplyClick = () => {
    if (onReply) {
      onReply(response.id, response.parentResponseId || undefined);
    }
    setShowReplyForm(!showReplyForm);
  };

  const handleReplySubmit = async (replyContent: CreateResponseRequest) => {
    if (onReplySubmit) {
      await onReplySubmit({ ...replyContent, parentId: response.id });
      setShowReplyForm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Maximum visual nesting depth
  const maxDepth = 5;
  const visualDepth = Math.min(depth, maxDepth);
  const indentClass = visualDepth > 0 ? `ml-${Math.min(visualDepth * 4, 16)}` : '';

  // Compact mode styling - balanced: space-efficient but readable
  const avatarSize = compact ? 'w-6 h-6 text-xs' : 'w-10 h-10';
  const cardPadding = compact ? 'sm' : 'lg';
  const contentMargin = compact ? 'mb-1' : 'mb-4';
  const headerMargin = compact ? 'mb-1' : 'mb-3';

  // Threading line configuration
  const hasReplies = response.replies && response.replies.length > 0;
  const showVerticalLine = showThreadLines && depth > 0;
  const showBranchLine = showThreadLines && depth > 0;

  // Thread collapse logic
  const replyCount = response.replies?.length || 0;
  const shouldShowCollapseButton = replyCount >= collapseThreshold;
  const isThreadExpanded = expandedThreads?.has(response.id) ?? true;

  const visibleReplies = useMemo(() => {
    if (!response.replies || response.replies.length === 0) return [];
    if (!shouldShowCollapseButton || isThreadExpanded) {
      return response.replies;
    }
    // When collapsed, show first N and last reply
    return response.replies.slice(0, collapsedVisibleCount);
  }, [response.replies, shouldShowCollapseButton, isThreadExpanded, collapsedVisibleCount]);

  const hiddenReplyCount = replyCount - visibleReplies.length;

  const handleToggleThread = () => {
    if (isThreadExpanded) {
      onThreadCollapse?.(response.id);
    } else {
      onThreadExpand?.(response.id);
    }
  };

  return (
    <div
      className={`${indentClass} group relative`}
      data-testid="response-item"
      data-response-id={response.id}
      data-parent-id={response.parentResponseId || undefined}
      data-depth={depth}
      data-compact={compact}
    >
      {/* Threading lines for nested replies */}
      {showVerticalLine && (
        <>
          {/* Vertical connector line from parent thread */}
          <div
            className={`absolute left-0 w-0.5 bg-gray-200 dark:bg-gray-700 ${
              isLastReply ? 'top-0 h-5' : 'top-0 bottom-0'
            }`}
            aria-hidden="true"
            data-thread-line="vertical"
          />
          {/* Horizontal branch connecting to this response */}
          {showBranchLine && (
            <div
              className="absolute left-0 top-5 w-4 h-0.5 bg-gray-200 dark:bg-gray-700"
              aria-hidden="true"
              data-thread-line="branch"
            />
          )}
        </>
      )}
      <Card
        variant={compact ? 'ghost' : depth === 0 ? 'elevated' : 'outlined'}
        padding={cardPadding}
        className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
          compact ? 'py-2 px-3 border-b border-gray-100 dark:border-gray-800 rounded-none' : ''
        } ${!isGroupStart && compact ? 'pt-1' : ''}`}
      >
        <div className="flex gap-3">
          {/* Vote buttons - left side (not in compact mode) */}
          {!compact && (
            <div className="flex-shrink-0">
              <VoteButtons
                voteCount={voteSummary?.score ?? 0}
                userVote={
                  voteSummary?.userVote === 'UPVOTE'
                    ? 'up'
                    : voteSummary?.userVote === 'DOWNVOTE'
                      ? 'down'
                      : null
                }
                onUpvote={upvote}
                onDownvote={downvote}
                disabled={isVotePending || !currentUser}
                size="sm"
                orientation="vertical"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {/* Header - only shown at group start or in non-compact mode */}
            {isGroupStart && (
              <div className={`flex items-start ${compact ? 'gap-2' : 'gap-3'} ${headerMargin}`}>
                {/* Avatar */}
                <div
                  className={`${avatarSize} bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
                >
                  {response.author.displayName.charAt(0).toUpperCase()}
                </div>

                {/* Author and Timestamp */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className={`font-semibold text-gray-900 dark:text-gray-100 ${compact ? 'text-sm' : ''}`}
                    >
                      {response.author.displayName}
                    </span>
                    {/* Trust score badge - shows when trust data is available */}
                    <InlineTrustBadge
                      trustScoreAbility={response.author.trustScoreAbility}
                      trustScoreBenevolence={response.author.trustScoreBenevolence}
                      trustScoreIntegrity={response.author.trustScoreIntegrity}
                      verificationLevel={response.author.verificationLevel}
                    />
                    {/* Compact: inline separator, Non-compact: on its own line */}
                    {compact && <span className="text-gray-400">·</span>}
                    <span
                      className={`text-gray-500 dark:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}
                    >
                      <time dateTime={response.createdAt}>{formatDate(response.createdAt)}</time>
                    </span>
                    {/* Edit Indicator */}
                    {response.editCount > 0 && response.editedAt && (
                      <>
                        {compact && <span className="text-gray-400">·</span>}
                        <span
                          className={`text-gray-500 dark:text-gray-400 italic ${compact ? 'text-xs' : 'text-sm'}`}
                        >
                          {compact ? 'edited' : `(edited ${formatDate(response.editedAt)})`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Response menu - visible on hover, only when auth state is known */}
                {!isAuthLoading && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <ResponseMenu
                      isOwnResponse={isOwnResponse}
                      onEdit={() => {
                        // Edit functionality to be implemented later
                      }}
                      onDelete={() => setShowDeleteDialog(true)}
                      onReport={() => setShowReportDialog(true)}
                      size={compact ? 'sm' : 'md'}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Content - indented when not showing header to align with text above */}
            <div
              className={`prose prose-sm max-w-none ${contentMargin} ${
                !isGroupStart && compact ? 'pl-8' : ''
              }`}
            >
              <p
                className={`text-gray-800 dark:text-gray-200 whitespace-pre-wrap ${compact ? 'text-sm' : ''}`}
              >
                <MentionRenderer content={response.content} />
              </p>
            </div>

            {/* Citations */}
            {response.citations && response.citations.length > 0 && (
              <div
                className={`${compact ? 'mb-1.5 p-2' : 'mb-4 p-3'} bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-700 ${
                  !isGroupStart && compact ? 'ml-8' : ''
                }`}
              >
                <p
                  className={`font-medium text-gray-700 dark:text-gray-300 ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`}
                >
                  Sources:
                </p>
                <ul className="space-y-1">
                  {response.citations.map((citation) => (
                    <li key={citation.id} className={compact ? 'text-xs' : 'text-sm'}>
                      <a
                        href={citation.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {citation.title || citation.originalUrl}
                      </a>
                      {citation.validationStatus === 'BROKEN' && (
                        <span className="ml-2 text-xs text-red-700 dark:text-red-400">
                          (broken link)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions - always visible */}
            <div
              className={`flex items-center justify-between ${
                compact ? `${!isGroupStart ? 'pl-8' : ''} gap-1.5 mt-1` : 'gap-2 mt-4'
              }`}
            >
              {/* Left side: Reactions and Reply */}
              <div className={`flex items-center flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
                {/* Reaction Bar */}
                <ReactionBar
                  reactions={reactions}
                  onReactionClick={toggleReaction}
                  disabled={isReactionPending}
                  size={compact ? 'sm' : 'md'}
                  showPicker={true}
                  className="flex-shrink-0"
                />

                {/* Reply Button (Phase 5) */}
                {showReplies && depth < maxDepth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReplyClick}
                    className={`text-gray-600 dark:text-gray-400 hover:text-blue-600 ${compact ? 'text-xs py-0.5 px-1.5' : ''}`}
                  >
                    <svg
                      className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} mr-1`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                    Reply
                    {response.replyCount != null && response.replyCount > 0 && (
                      <span className="ml-1">({response.replyCount})</span>
                    )}
                  </Button>
                )}
              </div>

              {/* Right side: Share, Bookmark, and Flag */}
              <div className="flex items-center gap-1">
                <ShareButton
                  topicId={discussionId}
                  responseId={response.id}
                  className={compact ? 'scale-90' : ''}
                />
                <BookmarkButton responseId={response.id} size={compact ? 'sm' : 'md'} />
                {/* Flag button - only shown for other users' responses */}
                {!isOwnResponse && currentUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReportDialog(true)}
                    className={`text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 ${compact ? 'p-1' : 'p-1.5'}`}
                    aria-label="Report this response"
                    title="Report"
                  >
                    <svg
                      className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                      />
                    </svg>
                  </Button>
                )}
              </div>
            </div>

            {/* Inline Reply Form */}
            {showReplyForm && (
              <div
                className={`${compact ? 'mt-2' : 'mt-4'} ${!isGroupStart && compact ? 'pl-8' : ''}`}
                data-testid="reply-form"
              >
                {shouldUseLightweightComposer ? (
                  <LightweightReplyComposer
                    parentId={response.id}
                    authorName={response.author.displayName}
                    topicId={discussionId}
                    onSubmit={handleReplySubmit}
                    onCancel={() => setShowReplyForm(false)}
                    onPreviewFeedbackChange={onPreviewFeedbackChange}
                    minLength={10}
                    maxLength={10000}
                    autoFocus
                    defaultExpanded
                  />
                ) : (
                  <ResponseComposer
                    inline
                    parentId={response.id}
                    placeholder="Write your reply..."
                    minLength={10}
                    maxLength={10000}
                    onSubmit={handleReplySubmit}
                    onCancel={() => setShowReplyForm(false)}
                    showCancel
                    topicId={discussionId}
                    onPreviewFeedbackChange={onPreviewFeedbackChange}
                    showPreviewFeedbackInline={false}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Nested Replies (Phase 5) */}
      {showReplies && response.replies && response.replies.length > 0 && (
        <div className={`mt-2 space-y-2 ${showThreadLines ? 'relative' : ''}`}>
          {/* Parent thread continuation line (when showing thread lines) */}
          {showThreadLines && hasReplies && (
            <div
              className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"
              aria-hidden="true"
              data-thread-line="parent-continuation"
            />
          )}
          {visibleReplies.map((reply, index) => (
            <ResponseItem
              key={reply.id}
              response={reply}
              discussionId={discussionId}
              showReplies={showReplies}
              depth={depth + 1}
              onReply={onReply}
              onReplySubmit={onReplySubmit}
              onPreviewFeedbackChange={onPreviewFeedbackChange}
              compact={compact}
              isGroupStart={true}
              isGroupEnd={true}
              useLightweightComposer={useLightweightComposer}
              showThreadLines={showThreadLines}
              isLastReply={
                isThreadExpanded ? index === visibleReplies.length - 1 : false // Not last when collapsed (more hidden)
              }
              collapseThreshold={collapseThreshold}
              collapsedVisibleCount={collapsedVisibleCount}
              expandedThreads={expandedThreads}
              onThreadExpand={onThreadExpand}
              onThreadCollapse={onThreadCollapse}
            />
          ))}

          {/* Thread collapse/expand button */}
          {shouldShowCollapseButton && (
            <button
              type="button"
              onClick={handleToggleThread}
              className={`
                flex items-center gap-2 py-2 px-3 ml-4
                text-sm font-medium
                text-blue-600 dark:text-blue-400
                hover:text-blue-800 dark:hover:text-blue-300
                hover:bg-blue-50 dark:hover:bg-blue-900/20
                rounded-md transition-colors
                ${showThreadLines ? 'relative' : ''}
              `}
              aria-expanded={isThreadExpanded}
              data-testid="thread-collapse-button"
            >
              {/* Thread line connector for button */}
              {showThreadLines && !isThreadExpanded && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-gray-200 dark:bg-gray-700"
                  aria-hidden="true"
                />
              )}
              <svg
                className={`w-4 h-4 transition-transform ${isThreadExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {isThreadExpanded ? (
                <>Hide {hiddenReplyCount > 0 ? `${hiddenReplyCount} ` : ''}replies</>
              ) : (
                <>
                  View {hiddenReplyCount} more {hiddenReplyCount === 1 ? 'reply' : 'replies'}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isDeleting={isDeleting}
      />

      {/* Report dialog */}
      <ReportDialog
        isOpen={showReportDialog}
        responseId={response.id}
        onSubmit={handleReport}
        onClose={() => setShowReportDialog(false)}
      />
    </div>
  );
}
