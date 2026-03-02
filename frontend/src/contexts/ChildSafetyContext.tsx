/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useMemo, useEffect, type ReactNode } from 'react';
import { useAuthContext } from './AuthContext';

/**
 * Features that can be restricted for child users
 */
export type RestrictedFeature =
  | 'DM' // Direct messaging
  | 'USER_SEARCH' // Searching for users
  | 'PROFILE_EDIT' // Editing profile details
  | 'SOCIAL_LINKS' // Adding social media links
  | 'EXTERNAL_LINKS' // Posting external links
  | 'FILE_UPLOAD'; // Uploading files

/**
 * Child safety state interface
 */
export interface ChildSafetyState {
  /** Whether the current user is in child mode */
  isChildMode: boolean;
  /** UI theme variant */
  uiTheme: 'standard' | 'child-friendly';
  /** List of features restricted for this user */
  restrictedFeatures: RestrictedFeature[];
  /** Whether to show the panic button */
  showPanicButton: boolean;
  /** Check if a specific feature is restricted */
  isFeatureRestricted: (feature: RestrictedFeature) => boolean;
}

/**
 * All features restricted for minor users
 */
const MINOR_RESTRICTED_FEATURES: RestrictedFeature[] = [
  'DM',
  'USER_SEARCH',
  'PROFILE_EDIT',
  'SOCIAL_LINKS',
  'EXTERNAL_LINKS',
  'FILE_UPLOAD',
];

const ChildSafetyContext = createContext<ChildSafetyState | null>(null);

interface ChildSafetyProviderProps {
  children: ReactNode;
}

/**
 * ChildSafetyProvider - Context provider for child safety features
 *
 * @remarks
 * Manages child safety state across the frontend application:
 * - Detects if user is a minor via `user.isMinor` from AuthContext
 * - Provides list of restricted features for minors
 * - Controls UI theme variant (child-friendly vs standard)
 * - Controls panic button visibility
 *
 * **Key Features:**
 * - All restricted features are determined by minor status
 * - `isFeatureRestricted` helper for conditional feature rendering
 * - Memoized state to prevent unnecessary re-renders
 *
 * @param props - Component props
 * @returns Provider component wrapping children
 *
 * @example
 * ```tsx
 * // In app root
 * <AuthProvider>
 *   <ChildSafetyProvider>
 *     <App />
 *   </ChildSafetyProvider>
 * </AuthProvider>
 *
 * // In a component
 * const { isChildMode, isFeatureRestricted } = useChildSafety();
 * if (isFeatureRestricted('DM')) {
 *   return <RestrictedMessage />;
 * }
 * ```
 */
export function ChildSafetyProvider({ children }: ChildSafetyProviderProps) {
  const { user } = useAuthContext();

  const state: ChildSafetyState = useMemo(() => {
    const isMinor = user?.isMinor ?? false;
    const restrictedFeatures: RestrictedFeature[] = isMinor ? MINOR_RESTRICTED_FEATURES : [];

    return {
      isChildMode: isMinor,
      uiTheme: isMinor ? 'child-friendly' : 'standard',
      restrictedFeatures,
      showPanicButton: isMinor,
      isFeatureRestricted: (feature: RestrictedFeature) => restrictedFeatures.includes(feature),
    };
  }, [user?.isMinor]);

  // Apply/remove 'child-friendly' class to document root for CSS theming
  useEffect(() => {
    const root = document.documentElement;
    if (state.uiTheme === 'child-friendly') {
      root.classList.add('child-friendly');
    } else {
      root.classList.remove('child-friendly');
    }

    // Cleanup on unmount
    return () => {
      root.classList.remove('child-friendly');
    };
  }, [state.uiTheme]);

  return <ChildSafetyContext.Provider value={state}>{children}</ChildSafetyContext.Provider>;
}

/**
 * Hook to access Child Safety context
 *
 * @throws Error if used outside of ChildSafetyProvider
 * @returns ChildSafetyState with child safety configuration
 *
 * @example
 * ```tsx
 * const { isChildMode, isFeatureRestricted, showPanicButton } = useChildSafety();
 *
 * // Check if a specific feature is restricted
 * if (isFeatureRestricted('DM')) {
 *   return <DirectMessagingDisabled />;
 * }
 *
 * // Conditionally render panic button
 * {showPanicButton && <PanicButton />}
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useChildSafety(): ChildSafetyState {
  const context = useContext(ChildSafetyContext);
  if (!context) {
    throw new Error('useChildSafety must be used within ChildSafetyProvider');
  }
  return context;
}
