# Skipped E2E Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable all 13 currently skipped E2E tests by implementing voting, response menu, and reaction toggle features.

**Architecture:** Add test IDs to existing VoteButtons component, create ResponseMenu dropdown with edit/delete/report actions, add vote proxy routes to API gateway, and update ReactionBar with user-reacted state attribute.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS, NestJS (API Gateway), Playwright (E2E tests)

---

## Task 1: Add Test IDs to VoteButtons Component

**Files:**
- Modify: `frontend/src/components/responses/VoteButtons.tsx:135-194`
- Test: `frontend/e2e/response-voting.spec.ts` (existing, will verify)

**Step 1: Add test IDs to VoteButtons**

Open `frontend/src/components/responses/VoteButtons.tsx` and add `data-testid` attributes:

```tsx
// Line 135-136: Add data-testid to container div
return (
  <div className={containerClasses} data-testid="vote-buttons">
```

```tsx
// Line 138-144: Add data-testid and data-active to upvote button
<button
  onClick={handleUpvote}
  disabled={disabled}
  className={upvoteClasses}
  aria-label="Upvote"
  title="Upvote"
  data-testid="upvote-button"
  data-active={userVote === 'up'}
>
```

```tsx
// Line 159-168: Add data-testid to vote count span
<span
  className={`
    ${currentSize.text}
    font-semibold
    ${voteCountColor}
    min-w-[1.5rem]
    text-center
    select-none
  `}
  data-testid="vote-count"
>
```

```tsx
// Line 174-180: Add data-testid and data-active to downvote button
<button
  onClick={handleDownvote}
  disabled={disabled}
  className={downvoteClasses}
  aria-label="Downvote"
  title="Downvote"
  data-testid="downvote-button"
  data-active={userVote === 'down'}
>
```

**Step 2: Verify the changes compile**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/responses/VoteButtons.tsx
git commit -m "feat(ui): add test IDs to VoteButtons component

Add data-testid attributes for E2E test targeting:
- vote-buttons (container)
- upvote-button with data-active state
- downvote-button with data-active state
- vote-count

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add data-user-reacted Attribute to ReactionBar

**Files:**
- Modify: `frontend/src/components/responses/ReactionBar.tsx:157-182`
- Test: `frontend/e2e/emoji-reactions.spec.ts:244` (skipped test for "remove reaction when clicked again")

**Step 1: Add test ID and data-user-reacted to reaction buttons**

In `frontend/src/components/responses/ReactionBar.tsx`, find the button element around line 157 and add:

```tsx
// Replace the existing button (around lines 157-182) with this updated version:
<button
  onClick={() => onReactionClick(reaction.emoji)}
  disabled={disabled}
  className={`
    ${currentSize.button}
    inline-flex items-center justify-center
    rounded-full
    border
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500
    disabled:opacity-40 disabled:cursor-not-allowed
    ${
      reaction.userReacted
        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50'
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }
  `}
  aria-label={`${reaction.emoji} reaction, ${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}${reaction.userReacted ? ', you reacted' : ''}`}
  aria-pressed={reaction.userReacted}
  title={tooltipText}
  data-testid="reaction-button"
  data-user-reacted={reaction.userReacted}
>
```

**Step 2: Verify the changes compile**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/responses/ReactionBar.tsx
git commit -m "feat(ui): add data-user-reacted attribute to reaction buttons

Add data-testid='reaction-button' and data-user-reacted attribute
for E2E test targeting of reaction toggle behavior.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create useVotes Hook

**Files:**
- Create: `frontend/src/hooks/useVotes.ts`
- Create: `frontend/src/services/voteService.ts`

**Step 1: Create vote service**

Create `frontend/src/services/voteService.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from '../lib/api';

export type VoteType = 'UPVOTE' | 'DOWNVOTE';

export interface VoteSummary {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: VoteType | null;
}

export interface VoteResponse {
  id: string;
  userId: string;
  responseId: string;
  voteType: VoteType;
  createdAt: string;
  updatedAt: string;
}

export const voteService = {
  /**
   * Get vote summary for a response
   */
  async getVoteSummary(responseId: string): Promise<VoteSummary> {
    return apiClient.get<VoteSummary>(`/responses/${responseId}/votes`);
  },

  /**
   * Vote on a response (upvote or downvote)
   * If already voted with same type, removes the vote (toggle)
   * If already voted with different type, changes the vote
   */
  async vote(responseId: string, voteType: VoteType): Promise<VoteResponse | { message: string }> {
    return apiClient.post<VoteResponse | { message: string }>(`/responses/${responseId}/vote`, {
      voteType,
    });
  },

  /**
   * Remove a vote from a response
   */
  async removeVote(responseId: string): Promise<void> {
    return apiClient.delete(`/responses/${responseId}/vote`);
  },
};
```

**Step 2: Create useVotes hook**

Create `frontend/src/hooks/useVotes.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { voteService, type VoteSummary, type VoteType } from '../services/voteService';

export interface UseVotesResult {
  /** Current vote summary */
  voteSummary: VoteSummary | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether a vote mutation is in progress */
  isPending: boolean;
  /** Cast an upvote (toggles if already upvoted) */
  upvote: () => Promise<void>;
  /** Cast a downvote (toggles if already downvoted) */
  downvote: () => Promise<void>;
  /** Remove current vote */
  removeVote: () => Promise<void>;
}

/**
 * Hook for managing vote state on a response
 *
 * @param responseId - The response ID to manage votes for
 * @returns Vote summary, loading state, and vote mutation functions
 *
 * @example
 * ```tsx
 * const { voteSummary, upvote, downvote, isPending } = useVotes(responseId);
 *
 * <VoteButtons
 *   voteCount={voteSummary?.score ?? 0}
 *   userVote={voteSummary?.userVote === 'UPVOTE' ? 'up' : voteSummary?.userVote === 'DOWNVOTE' ? 'down' : null}
 *   onUpvote={upvote}
 *   onDownvote={downvote}
 *   disabled={isPending}
 * />
 * ```
 */
export function useVotes(responseId: string): UseVotesResult {
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Fetch initial vote summary
  useEffect(() => {
    let cancelled = false;

    const fetchVotes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const summary = await voteService.getVoteSummary(responseId);
        if (!cancelled) {
          setVoteSummary(summary);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch votes');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchVotes();

    return () => {
      cancelled = true;
    };
  }, [responseId]);

  // Optimistic vote helper
  const castVote = useCallback(
    async (voteType: VoteType) => {
      if (isPending || !voteSummary) return;

      const previousSummary = voteSummary;
      const currentUserVote = voteSummary.userVote;

      // Optimistic update
      setIsPending(true);
      setVoteSummary((prev) => {
        if (!prev) return prev;

        let newUpvotes = prev.upvotes;
        let newDownvotes = prev.downvotes;
        let newUserVote: VoteType | null = voteType;

        // Remove previous vote effect
        if (currentUserVote === 'UPVOTE') {
          newUpvotes--;
        } else if (currentUserVote === 'DOWNVOTE') {
          newDownvotes--;
        }

        // Apply new vote (or toggle off if same)
        if (currentUserVote === voteType) {
          // Toggle off - don't add new vote
          newUserVote = null;
        } else if (voteType === 'UPVOTE') {
          newUpvotes++;
        } else {
          newDownvotes++;
        }

        return {
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          score: newUpvotes - newDownvotes,
          userVote: newUserVote,
        };
      });

      try {
        await voteService.vote(responseId, voteType);
      } catch (err) {
        // Rollback on error
        setVoteSummary(previousSummary);
        setError(err instanceof Error ? err.message : 'Failed to vote');
      } finally {
        setIsPending(false);
      }
    },
    [responseId, voteSummary, isPending],
  );

  const upvote = useCallback(() => castVote('UPVOTE'), [castVote]);
  const downvote = useCallback(() => castVote('DOWNVOTE'), [castVote]);

  const removeVote = useCallback(async () => {
    if (isPending || !voteSummary) return;

    const previousSummary = voteSummary;

    // Optimistic update
    setIsPending(true);
    setVoteSummary((prev) => {
      if (!prev || !prev.userVote) return prev;

      let newUpvotes = prev.upvotes;
      let newDownvotes = prev.downvotes;

      if (prev.userVote === 'UPVOTE') {
        newUpvotes--;
      } else {
        newDownvotes--;
      }

      return {
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        score: newUpvotes - newDownvotes,
        userVote: null,
      };
    });

    try {
      await voteService.removeVote(responseId);
    } catch (err) {
      // Rollback on error
      setVoteSummary(previousSummary);
      setError(err instanceof Error ? err.message : 'Failed to remove vote');
    } finally {
      setIsPending(false);
    }
  }, [responseId, voteSummary, isPending]);

  return {
    voteSummary,
    isLoading,
    error,
    isPending,
    upvote,
    downvote,
    removeVote,
  };
}
```

**Step 3: Verify the changes compile**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/services/voteService.ts frontend/src/hooks/useVotes.ts
git commit -m "feat(hooks): add useVotes hook and voteService

Implements voting functionality with optimistic updates:
- voteService: API client for vote endpoints
- useVotes: Hook with upvote/downvote toggle and rollback

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Vote Proxy Routes to API Gateway

**Files:**
- Modify: `services/api-gateway/src/proxy/responses-proxy.controller.ts`

**Step 1: Add vote proxy endpoints**

Add these methods to `services/api-gateway/src/proxy/responses-proxy.controller.ts` after the existing methods:

```typescript
  /**
   * GET /responses/:responseId/votes - Get vote summary for a response
   *
   * Proxies to discussion-service: GET /responses/:responseId/votes
   */
  @Get(':responseId/votes')
  async getVotes(
    @Param('responseId') responseId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/responses/${responseId}/votes`,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /responses/:responseId/vote - Vote on a response
   *
   * Proxies to discussion-service: POST /responses/:responseId/vote
   */
  @Post(':responseId/vote')
  async vote(
    @Param('responseId') responseId: string,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: `/responses/${responseId}/vote`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * DELETE /responses/:responseId/vote - Remove vote from a response
   *
   * Proxies to discussion-service: DELETE /responses/:responseId/vote
   */
  @Delete(':responseId/vote')
  async removeVote(
    @Param('responseId') responseId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'DELETE',
      path: `/responses/${responseId}/vote`,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }
```

**Step 2: Verify the changes compile**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter api-gateway build`
Expected: Build completes without errors

**Step 3: Commit**

```bash
git add services/api-gateway/src/proxy/responses-proxy.controller.ts
git commit -m "feat(api): add vote proxy routes to API gateway

Add proxy endpoints for voting functionality:
- GET /responses/:responseId/votes
- POST /responses/:responseId/vote
- DELETE /responses/:responseId/vote

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create ResponseMenu Component

**Files:**
- Create: `frontend/src/components/responses/ResponseMenu.tsx`

**Step 1: Create the ResponseMenu component**

Create `frontend/src/components/responses/ResponseMenu.tsx`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';

export interface ResponseMenuProps {
  /** Whether the current user owns this response */
  isOwnResponse: boolean;
  /** Callback when Edit is clicked (only for own responses) */
  onEdit?: () => void;
  /** Callback when Delete is clicked (only for own responses) */
  onDelete?: () => void;
  /** Callback when Report is clicked (only for other users' responses) */
  onReport?: () => void;
  /** Whether to show the menu (controlled by parent hover state) */
  visible?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * ResponseMenu - Three-dot dropdown menu for response actions
 *
 * @remarks
 * Shows different options based on ownership:
 * - Own response: Edit, Delete
 * - Other's response: Report
 *
 * Uses portal-free positioning for simplicity; positioned relative to parent.
 */
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

  // Close menu when clicking outside
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

  // Close menu on Escape key
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
      {/* Three-dot trigger button */}
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

      {/* Dropdown menu */}
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
              {/* Edit option - only for own responses */}
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
                <svg
                  className="w-4 h-4"
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
                Edit
              </button>

              {/* Delete option - only for own responses */}
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
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
            /* Report option - only for other users' responses */
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
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
```

**Step 2: Verify the changes compile**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/responses/ResponseMenu.tsx
git commit -m "feat(ui): create ResponseMenu three-dot dropdown component

Implements dropdown menu for response actions:
- Edit and Delete options for own responses
- Report option for other users' responses
- Keyboard accessible (Escape to close)
- All required data-testid attributes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create DeleteConfirmDialog Component

**Files:**
- Create: `frontend/src/components/responses/DeleteConfirmDialog.tsx`

**Step 1: Create the DeleteConfirmDialog component**

Create `frontend/src/components/responses/DeleteConfirmDialog.tsx`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import Button from '../ui/Button';

export interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when user confirms deletion */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether deletion is in progress */
  isDeleting?: boolean;
}

/**
 * DeleteConfirmDialog - Confirmation dialog before deleting a response
 *
 * @remarks
 * Modal dialog that requires explicit confirmation before deletion.
 * Traps focus within the dialog for accessibility.
 */
const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isDeleting) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDeleting, onCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isDeleting ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        data-testid="confirm-dialog"
        className="
          relative z-10
          bg-white dark:bg-gray-800
          rounded-lg shadow-xl
          p-6 mx-4
          max-w-md w-full
        "
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2"
        >
          Delete Response?
        </h2>

        {/* Description */}
        <p
          id="delete-dialog-description"
          className="text-gray-600 dark:text-gray-400 text-center mb-6"
        >
          This action cannot be undone. The response will be permanently removed.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="confirm-delete-button"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
```

**Step 2: Verify the changes compile**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/responses/DeleteConfirmDialog.tsx
git commit -m "feat(ui): create DeleteConfirmDialog component

Modal confirmation dialog for response deletion:
- Focus trap with Escape key handling
- role=alertdialog for accessibility
- data-testid='confirm-dialog' for E2E tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create ReportDialog Component

**Files:**
- Create: `frontend/src/components/responses/ReportDialog.tsx`

**Step 1: Create the ReportDialog component**

Create `frontend/src/components/responses/ReportDialog.tsx`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Button from '../ui/Button';

export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'MISINFORMATION'
  | 'HATE_SPEECH'
  | 'OTHER';

export interface ReportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Response ID being reported */
  responseId: string;
  /** Callback when report is submitted */
  onSubmit: (reason: ReportReason, additionalInfo?: string) => Promise<void>;
  /** Callback when dialog is closed */
  onClose: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'HARASSMENT', label: 'Harassment or bullying' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'HATE_SPEECH', label: 'Hate speech' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * ReportDialog - Modal dialog for reporting a response
 */
const ReportDialog: React.FC<ReportDialogProps> = ({
  isOpen,
  responseId: _responseId,
  onSubmit,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedReason(null);
      setAdditionalInfo('');
      setError(null);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason for your report');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(selectedReason, additionalInfo || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        data-testid="report-dialog"
        className="
          relative z-10
          bg-white dark:bg-gray-800
          rounded-lg shadow-xl
          p-6 mx-4
          max-w-md w-full
          max-h-[90vh] overflow-y-auto
        "
      >
        {/* Title */}
        <h2
          id="report-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
        >
          Report Response
        </h2>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Reason selection */}
        <fieldset className="mb-4">
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Why are you reporting this response?
          </legend>
          <div className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <label
                key={reason.value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={() => setSelectedReason(reason.value)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{reason.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Additional info */}
        <div className="mb-6">
          <label
            htmlFor="additional-info"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Additional information (optional)
          </label>
          <textarea
            id="additional-info"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Provide any additional context..."
            className="
              w-full px-3 py-2
              border border-gray-300 dark:border-gray-600
              rounded-md
              bg-white dark:bg-gray-700
              text-gray-900 dark:text-gray-100
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-primary-500
              resize-none
            "
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportDialog;
```

**Step 2: Verify the changes compile**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/responses/ReportDialog.tsx
git commit -m "feat(ui): create ReportDialog component

Modal dialog for reporting responses:
- 5 predefined report reasons
- Optional additional info textarea
- Form validation
- data-testid='report-dialog' for E2E tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Integrate VoteButtons and ResponseMenu into ResponseItem

**Files:**
- Modify: `frontend/src/components/responses/ResponseItem.tsx`

**Step 1: Add imports for new components and hooks**

At the top of `frontend/src/components/responses/ResponseItem.tsx`, add these imports:

```typescript
// After existing imports (around line 41)
import VoteButtons from './VoteButtons';
import ResponseMenu from './ResponseMenu';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import ReportDialog, { type ReportReason } from './ReportDialog';
import { useVotes } from '../../hooks/useVotes';
import { useAuthContext } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
```

**Step 2: Add state and hooks inside the component**

Inside the `ResponseItem` function, after the existing hooks (around line 109), add:

```typescript
  // Auth context for current user
  const { user: currentUser } = useAuthContext();

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
      // Parent will handle refresh via WebSocket or refetch
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
```

**Step 3: Add VoteButtons to the layout**

Find the Card component content (around line 210) and add VoteButtons. Wrap the existing header/content in a flex container:

```tsx
      <Card
        variant={compact ? 'ghost' : depth === 0 ? 'elevated' : 'outlined'}
        padding={cardPadding}
        className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
          compact ? 'py-2 px-3 border-b border-gray-100 dark:border-gray-800 rounded-none' : ''
        } ${!isGroupStart && compact ? 'pt-1' : ''}`}
      >
        {/* Vote + Content wrapper */}
        <div className="flex gap-3">
          {/* Vote buttons - left side */}
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

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Existing header code... */}
```

**Step 4: Add ResponseMenu next to header**

Inside the header section (where avatar and author info are), add ResponseMenu at the end of the flex container:

```tsx
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
                  {/* ... existing content ... */}
                </div>

                {/* Response menu - visible on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <ResponseMenu
                    isOwnResponse={isOwnResponse}
                    onEdit={() => {
                      // TODO: Implement edit mode
                    }}
                    onDelete={() => setShowDeleteDialog(true)}
                    onReport={() => setShowReportDialog(true)}
                    size={compact ? 'sm' : 'md'}
                  />
                </div>
              </div>
            )}
```

**Step 5: Add dialogs at the end of the component**

Before the closing `</div>` of the main container (before line 483), add:

```tsx
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
```

**Step 6: Verify the changes compile**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend typecheck`
Expected: No errors

**Step 7: Commit**

```bash
git add frontend/src/components/responses/ResponseItem.tsx
git commit -m "feat(ui): integrate VoteButtons and ResponseMenu into ResponseItem

Complete integration of voting and moderation features:
- VoteButtons with useVotes hook for optimistic updates
- ResponseMenu with Edit/Delete/Report actions
- DeleteConfirmDialog for safe deletion
- ReportDialog for content reporting
- Owner vs non-owner action visibility

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Export New Components from Index

**Files:**
- Modify: `frontend/src/components/responses/index.ts`

**Step 1: Add exports for new components**

Open `frontend/src/components/responses/index.ts` and add exports:

```typescript
export { default as VoteButtons } from './VoteButtons';
export type { VoteButtonsProps } from './VoteButtons';

export { default as ResponseMenu } from './ResponseMenu';
export type { ResponseMenuProps } from './ResponseMenu';

export { default as DeleteConfirmDialog } from './DeleteConfirmDialog';
export type { DeleteConfirmDialogProps } from './DeleteConfirmDialog';

export { default as ReportDialog } from './ReportDialog';
export type { ReportDialogProps, ReportReason } from './ReportDialog';
```

**Step 2: Verify the changes compile**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/responses/index.ts
git commit -m "chore: export new response components from index

Add exports for VoteButtons, ResponseMenu, DeleteConfirmDialog,
and ReportDialog components.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Run E2E Tests to Verify

**Files:**
- Test: `frontend/e2e/response-voting.spec.ts`
- Test: `frontend/e2e/response-moderation.spec.ts`
- Test: `frontend/e2e/emoji-reactions.spec.ts`

**Step 1: Run the previously skipped E2E tests**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend exec playwright test e2e/response-voting.spec.ts e2e/response-moderation.spec.ts e2e/emoji-reactions.spec.ts --reporter=list 2>&1 | tee /tmp/e2e-skipped-tests.log`

Expected: All 13 previously skipped tests should now pass (0 skipped)

**Step 2: Review test output**

Check `/tmp/e2e-skipped-tests.log` for results:
- Expected: 37+ passed, 0 skipped, 0 failed
- If any tests still fail, review error messages and fix

**Step 3: Run full E2E suite to verify no regressions**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm --filter frontend exec playwright test --reporter=list 2>&1 | tee /tmp/e2e-full.log`

Expected: All tests pass with no regressions

**Step 4: Final commit if all tests pass**

```bash
git add -A
git commit -m "test: verify all E2E tests pass after feature implementation

All 13 previously skipped tests now pass:
- response-voting.spec.ts: 8 tests
- response-moderation.spec.ts: 4 tests
- emoji-reactions.spec.ts: 1 test (remove reaction toggle)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add test IDs to VoteButtons | `VoteButtons.tsx` |
| 2 | Add data-user-reacted to ReactionBar | `ReactionBar.tsx` |
| 3 | Create useVotes hook and voteService | `useVotes.ts`, `voteService.ts` |
| 4 | Add vote proxy routes to API gateway | `responses-proxy.controller.ts` |
| 5 | Create ResponseMenu component | `ResponseMenu.tsx` |
| 6 | Create DeleteConfirmDialog | `DeleteConfirmDialog.tsx` |
| 7 | Create ReportDialog | `ReportDialog.tsx` |
| 8 | Integrate into ResponseItem | `ResponseItem.tsx` |
| 9 | Export new components | `index.ts` |
| 10 | Run E2E tests to verify | E2E test files |

**Total: 10 tasks, estimated ~60-90 minutes**

**Success Criteria:** All 13 previously skipped E2E tests pass.
