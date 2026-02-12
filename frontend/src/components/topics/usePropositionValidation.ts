/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import type { TopicProposition, PropositionInputValidation } from './PropositionInputSection';

/** Validation constants */
const DEFAULT_MIN_PROPOSITIONS = 1;
const DEFAULT_MIN_TEXT_LENGTH = 10;

/**
 * Hook to calculate proposition validation state
 */
export function usePropositionValidation(
  propositions: TopicProposition[],
  minPropositions = DEFAULT_MIN_PROPOSITIONS,
  minTextLength = DEFAULT_MIN_TEXT_LENGTH,
): PropositionInputValidation {
  return useMemo(() => {
    const propositionCount = propositions.length;
    const hasThesis = propositions.some((p) => p.type === 'thesis');

    let error: string | null = null;
    let isValid = true;

    if (propositionCount < minPropositions) {
      error = `At least ${minPropositions} proposition${minPropositions === 1 ? '' : 's'} required`;
      isValid = false;
    } else if (!hasThesis && propositionCount > 0) {
      error = 'At least one thesis proposition is recommended';
      isValid = true; // Warning, not error
    } else {
      // Check if any proposition text is too short
      const shortProposition = propositions.find(
        (p) => p.text.length > 0 && p.text.length < minTextLength,
      );
      if (shortProposition) {
        error = `Proposition text must be at least ${minTextLength} characters`;
        isValid = false;
      }
    }

    return {
      isValid,
      error,
      propositionCount,
      hasThesis,
    };
  }, [propositions, minPropositions, minTextLength]);
}
