/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import type { Claim } from '../../types/factCheck';

export interface ClaimHighlighterProps {
  /** Response content to render */
  content: string;
  /** Claims to highlight (null = no highlights) */
  claims: Claim[] | null;
  /** Callback when a claim is clicked */
  onClaimClick?: (claim: Claim) => void;
}

/**
 * Renders response content with highlighted claims
 *
 * @remarks
 * Claims are shown with dotted underlines to indicate
 * related context is available. Hover shows tooltip.
 *
 * **Key Features:**
 * - Dotted blue underlines on claims with related context
 * - Merges overlapping claims into single highlight regions
 * - Keyboard accessible (Enter/Space to click)
 * - Dark mode support
 *
 * @param props - Component props
 * @returns Rendered component with highlighted claims
 *
 * @example
 * ```tsx
 * <ClaimHighlighter
 *   content="The sky is blue and grass is green."
 *   claims={[{ text: 'sky is blue', startOffset: 4, endOffset: 15 }]}
 *   onClaimClick={(claim) => console.log('Clicked:', claim)}
 * />
 * ```
 */
const ClaimHighlighter: React.FC<ClaimHighlighterProps> = ({ content, claims, onClaimClick }) => {
  const segments = useMemo(() => {
    if (!claims || claims.length === 0) {
      return [{ type: 'text' as const, content }];
    }

    // Validate claims - filter out invalid offsets
    const validClaims = claims.filter(
      (claim) =>
        claim.startOffset >= 0 &&
        claim.endOffset <= content.length &&
        claim.startOffset < claim.endOffset,
    );

    if (validClaims.length === 0) {
      return [{ type: 'text' as const, content }];
    }

    // Sort claims by start offset
    const sortedClaims = [...validClaims].sort((a, b) => a.startOffset - b.startOffset);

    // Merge overlapping claims
    const mergedClaims: Claim[] = [];
    for (const claim of sortedClaims) {
      const last = mergedClaims[mergedClaims.length - 1];
      if (last && claim.startOffset <= last.endOffset) {
        // Overlapping or adjacent - extend the previous claim
        last.endOffset = Math.max(last.endOffset, claim.endOffset);
        last.text = content.substring(last.startOffset, last.endOffset);
      } else {
        mergedClaims.push({ ...claim });
      }
    }

    // Build segments
    const result: Array<{ type: 'text' | 'claim'; content: string; claim?: Claim }> = [];
    let lastEnd = 0;

    for (const claim of mergedClaims) {
      // Text before this claim
      if (claim.startOffset > lastEnd) {
        result.push({
          type: 'text',
          content: content.substring(lastEnd, claim.startOffset),
        });
      }

      // The claim itself
      result.push({
        type: 'claim',
        content: content.substring(claim.startOffset, claim.endOffset),
        claim,
      });

      lastEnd = claim.endOffset;
    }

    // Text after last claim
    if (lastEnd < content.length) {
      result.push({
        type: 'text',
        content: content.substring(lastEnd),
      });
    }

    return result;
  }, [content, claims]);

  return (
    <span data-testid="claim-highlighter">
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>;
        }

        return (
          <span
            key={index}
            className="border-b-2 border-dotted border-blue-500 cursor-pointer
                       hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Related Context available"
            onClick={() => segment.claim && onClaimClick?.(segment.claim)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent Space from scrolling page
                if (segment.claim) {
                  onClaimClick?.(segment.claim);
                }
              }
            }}
            data-testid="highlighted-claim"
          >
            {segment.content}
          </span>
        );
      })}
    </span>
  );
};

export default ClaimHighlighter;
