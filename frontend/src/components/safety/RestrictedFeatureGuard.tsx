/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useChildSafety, type RestrictedFeature } from '../../contexts/ChildSafetyContext';

export interface RestrictedFeatureGuardProps {
  /** The feature being guarded */
  feature: RestrictedFeature;
  /** Content to render when feature is allowed */
  children: React.ReactNode;
  /** How to handle restricted state */
  fallback?: 'hide' | 'disabled' | 'message' | React.ReactNode;
  /** Custom message to show when feature is restricted */
  restrictedMessage?: string;
}

/**
 * RestrictedFeatureGuard - Guards features that are restricted for child users
 *
 * @remarks
 * Wraps content that should be hidden or disabled for minor users based on
 * the ChildSafetyContext's restricted features list.
 *
 * **Fallback Modes:**
 * - `hide`: Completely hides the content (default)
 * - `disabled`: Renders content but disabled/greyed out
 * - `message`: Shows a friendly message explaining why feature is unavailable
 * - `ReactNode`: Custom fallback content
 *
 * @param props - Component props
 * @returns Guarded content or fallback
 *
 * @example
 * ```tsx
 * // Hide DM button for children
 * <RestrictedFeatureGuard feature="DM">
 *   <DirectMessageButton userId={userId} />
 * </RestrictedFeatureGuard>
 *
 * // Show disabled state with message
 * <RestrictedFeatureGuard feature="FILE_UPLOAD" fallback="message">
 *   <FileUploadForm />
 * </RestrictedFeatureGuard>
 *
 * // Custom fallback
 * <RestrictedFeatureGuard feature="EXTERNAL_LINKS" fallback={<ComingSoonBadge />}>
 *   <ExternalLinkButton />
 * </RestrictedFeatureGuard>
 * ```
 */
export function RestrictedFeatureGuard({
  feature,
  children,
  fallback = 'hide',
  restrictedMessage,
}: RestrictedFeatureGuardProps): React.ReactElement | null {
  const { isFeatureRestricted, isChildMode } = useChildSafety();

  const isRestricted = isFeatureRestricted(feature);

  // Feature is allowed, render children
  if (!isRestricted) {
    return <>{children}</>;
  }

  // Feature is restricted - handle based on fallback type
  if (fallback === 'hide') {
    return null;
  }

  if (fallback === 'disabled') {
    return (
      <div
        className="opacity-50 pointer-events-none select-none"
        aria-disabled="true"
        data-testid={`restricted-${feature}-disabled`}
      >
        {children}
      </div>
    );
  }

  if (fallback === 'message') {
    const defaultMessages: Record<RestrictedFeature, string> = {
      DM: 'Private messaging is not available for your account.',
      USER_SEARCH: 'User search is not available for your account.',
      PROFILE_EDIT: 'Profile editing is not available for your account.',
      SOCIAL_LINKS: 'Adding social links is not available for your account.',
      EXTERNAL_LINKS: 'Posting external links is not available for your account.',
      FILE_UPLOAD: 'File uploads are not available for your account.',
    };

    const message = restrictedMessage || defaultMessages[feature];

    return (
      <div
        className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-center"
        data-testid={`restricted-${feature}-message`}
      >
        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <span className="text-sm">{message}</span>
        </div>
        {isChildMode && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Ask a parent or guardian if you need access to this feature.
          </p>
        )}
      </div>
    );
  }

  // Custom fallback ReactNode
  return <>{fallback}</>;
}

export default RestrictedFeatureGuard;
