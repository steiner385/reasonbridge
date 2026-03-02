/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from 'react';
import type { TourId } from './tourSteps';

/**
 * Tour context value interface
 */
export interface TourContextValue {
  /**
   * Start a specific tour
   */
  startTour: (tourId: TourId) => void;

  /**
   * Stop the current tour
   */
  stopTour: () => void;

  /**
   * Check if a tour has been completed
   */
  isTourCompleted: (tourId: TourId) => boolean;

  /**
   * Reset a specific tour (allows it to run again)
   */
  resetTour: (tourId: TourId) => void;

  /**
   * Reset all tours
   */
  resetAllTours: () => void;

  /**
   * Currently active tour ID
   */
  activeTourId: TourId | null;

  /**
   * Whether a tour is currently running
   */
  isRunning: boolean;
}

export const TourContext = createContext<TourContextValue | null>(null);

/**
 * Custom hook to access tour functionality
 *
 * @returns Tour context value with methods to control tours
 * @throws Error if used outside of TourProvider
 *
 * @example
 * ```tsx
 * function HelpButton() {
 *   const { startTour } = useTour();
 *   return <button onClick={() => startTour('discussion')}>Take a Tour</button>;
 * }
 * ```
 */
export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
