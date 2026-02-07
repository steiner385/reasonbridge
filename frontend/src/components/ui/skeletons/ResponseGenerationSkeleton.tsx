/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Loader2 } from 'lucide-react';
import { Skeleton, SkeletonText } from '../Skeleton';

interface ResponseGenerationSkeletonProps {
  personaName?: string;
}

/**
 * Skeleton loader for AI response generation in discussion simulator
 * Shows "AI is thinking" state with persona context
 */
export function ResponseGenerationSkeleton({ personaName }: ResponseGenerationSkeletonProps) {
  return (
    <div className="space-y-4" aria-label="Generating AI response">
      {/* AI Thinking Header */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {personaName ? `${personaName} is thinking...` : 'AI is thinking...'}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            Generating response based on persona configuration
          </p>
        </div>
      </div>

      {/* Response Content Skeleton */}
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton width="80px" height="20px" />
        </div>
        <SkeletonText lines={4} size="md" />
      </div>

      {/* Reasoning Section Skeleton */}
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton width="100px" height="18px" />
        </div>
        <SkeletonText lines={3} size="sm" />
      </div>
    </div>
  );
}
