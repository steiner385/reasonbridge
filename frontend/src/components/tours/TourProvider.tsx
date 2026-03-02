/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import Joyride, { STATUS, EVENTS, type CallBackProps, type Step } from 'react-joyride';
import {
  type TourId,
  getTourSteps,
  isTourCompleted,
  markTourCompleted,
  resetTour,
  resetAllTours,
} from './tourSteps';
import { TourContext, type TourContextValue } from './useTour';

/**
 * Props for TourProvider
 */
export interface TourProviderProps {
  children: React.ReactNode;
}

/**
 * TourProvider Component
 *
 * Wraps the application and provides guided tour functionality using React Joyride.
 *
 * @remarks
 * - **Multiple Tours**: Supports separate tours for different pages (home, discussion, profile)
 * - **Persistence**: Tracks tour completion in localStorage
 * - **Customizable**: Tours can be started, stopped, and reset programmatically
 * - **Accessible**: Keyboard navigation support via Joyride
 * - **Dark Mode**: Styled to match the application theme
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { TourProvider } from './components/tours/TourProvider';
 *
 * function App() {
 *   return (
 *     <TourProvider>
 *       <YourApp />
 *     </TourProvider>
 *   );
 * }
 *
 * // In a component
 * import { useTour } from './components/tours/useTour';
 *
 * function HelpButton() {
 *   const { startTour } = useTour();
 *   return <button onClick={() => startTour('discussion')}>Take a Tour</button>;
 * }
 * ```
 */
export function TourProvider({ children }: TourProviderProps) {
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  /**
   * Start a specific tour
   */
  const startTour = useCallback((tourId: TourId) => {
    const tourSteps = getTourSteps(tourId);
    if (tourSteps.length > 0) {
      setSteps(tourSteps);
      setActiveTourId(tourId);
      setIsRunning(true);
    }
  }, []);

  /**
   * Stop the current tour
   */
  const stopTour = useCallback(() => {
    setIsRunning(false);
    setActiveTourId(null);
  }, []);

  /**
   * Handle Joyride callbacks
   */
  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type } = data;

      // Handle tour completion
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        if (activeTourId) {
          markTourCompleted(activeTourId);
        }
        setIsRunning(false);
        setActiveTourId(null);
      }

      // Handle close button click
      if (type === EVENTS.TARGET_NOT_FOUND) {
        // If target element not found, skip to next step or end tour
        console.warn('Tour target not found, element may not be rendered');
      }
    },
    [activeTourId],
  );

  /**
   * Reset a specific tour
   */
  const handleResetTour = useCallback((tourId: TourId) => {
    resetTour(tourId);
  }, []);

  /**
   * Reset all tours
   */
  const handleResetAllTours = useCallback(() => {
    resetAllTours();
  }, []);

  /**
   * Context value
   */
  const contextValue = useMemo<TourContextValue>(
    () => ({
      startTour,
      stopTour,
      isTourCompleted,
      resetTour: handleResetTour,
      resetAllTours: handleResetAllTours,
      activeTourId,
      isRunning,
    }),
    [startTour, stopTour, handleResetTour, handleResetAllTours, activeTourId, isRunning],
  );

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      <Joyride
        steps={steps}
        run={isRunning}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        disableOverlayClose
        callback={handleJoyrideCallback}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip tour',
        }}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#2563eb', // primary-600
            textColor: '#1f2937', // gray-800
            backgroundColor: '#ffffff',
            arrowColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltip: {
            borderRadius: 8,
            padding: 16,
          },
          tooltipTitle: {
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 8,
          },
          tooltipContent: {
            fontSize: 14,
            lineHeight: 1.5,
          },
          buttonNext: {
            backgroundColor: '#2563eb',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 500,
          },
          buttonBack: {
            color: '#4b5563',
            marginRight: 8,
            fontSize: 14,
          },
          buttonSkip: {
            color: '#9ca3af',
            fontSize: 14,
          },
          spotlight: {
            borderRadius: 8,
          },
        }}
      />
    </TourContext.Provider>
  );
}

export default TourProvider;
