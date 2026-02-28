/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * LightweightReplyComposer
 *
 * A compact, two-state reply composer for inline replies.
 * Collapsed state shows a placeholder, expanded state shows
 * full composer with auto-grow textarea and toolbar.
 *
 * @example
 * ```tsx
 * <LightweightReplyComposer
 *   parentId={response.id}
 *   authorName={response.author.displayName}
 *   topicId={discussionId}
 *   onSubmit={handleReplySubmit}
 *   onCancel={() => setShowReplyForm(false)}
 *   autoFocus
 * />
 * ```
 */

export {
  LightweightReplyComposer,
  type LightweightReplyComposerProps,
} from './LightweightReplyComposer';

// Internal components (exported for testing)
export { CollapsedPlaceholder, type CollapsedPlaceholderProps } from './CollapsedPlaceholder';
export { ExpandedComposer, type ExpandedComposerProps } from './ExpandedComposer';
export { ComposerToolbar, type ComposerToolbarProps } from './ComposerToolbar';
export { OptionsPopover, type OptionsPopoverProps } from './OptionsPopover';
export { CitationInput, type CitationInputProps } from './CitationInput';
