import { useState, useCallback } from 'react';

export type TourId = 'home' | 'topics' | 'discussion' | 'profile';

export interface OnboardingState {
  /**
   * Tours that have been completed
   */
  completedTours: TourId[];

  /**
   * Whether onboarding is currently running
   */
  isActive: boolean;

  /**
   * Current step index (for active tour)
   */
  currentStep: number;
}

const STORAGE_KEY = 'reasonbridge_onboarding';

/**
 * useOnboarding - Manages onboarding tour state and persistence
 *
 * Features:
 * - Tracks completed tours in localStorage
 * - Provides methods to start/complete tours
 * - Prevents showing tours multiple times
 * - Supports tour reset for testing
 *
 * @example
 * function HomePage() {
 *   const { shouldShowTour, startTour, completeTour } = useOnboarding('home');
 *
 *   useEffect(() => {
 *     if (shouldShowTour) {
 *       startTour();
 *     }
 *   }, [shouldShowTour, startTour]);
 *
 *   return (
 *     <div>
 *       <Joyride
 *         run={isActive}
 *         callback={handleJoyrideCallback}
 *       />
 *     </div>
 *   );
 * }
 */
export function useOnboarding(tourId: TourId) {
  // Load initial state from localStorage
  const [state, setState] = useState<OnboardingState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          completedTours: parsed.completedTours || [],
          isActive: false,
          currentStep: 0,
        };
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    }

    return {
      completedTours: [],
      isActive: false,
      currentStep: 0,
    };
  });

  // Save state to localStorage
  const saveState = useCallback((newState: OnboardingState) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          completedTours: newState.completedTours,
        }),
      );
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  }, []);

  // Check if this tour should be shown
  const shouldShowTour = !state.completedTours.includes(tourId);

  // Start the tour
  const startTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentStep: 0,
    }));
  }, []);

  // Complete the tour
  const completeTour = useCallback(() => {
    setState((prev) => {
      const newState = {
        ...prev,
        isActive: false,
        completedTours: [...new Set([...prev.completedTours, tourId])],
      };
      saveState(newState);
      return newState;
    });
  }, [tourId, saveState]);

  // Skip the tour (mark as completed without finishing)
  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  // Reset tour (for testing or user request)
  const resetTour = useCallback(() => {
    setState((prev) => {
      const newState = {
        ...prev,
        isActive: false,
        completedTours: prev.completedTours.filter((id) => id !== tourId),
      };
      saveState(newState);
      return newState;
    });
  }, [tourId, saveState]);

  // Reset all tours
  const resetAllTours = useCallback(() => {
    const newState: OnboardingState = {
      completedTours: [],
      isActive: false,
      currentStep: 0,
    };
    setState(newState);
    saveState(newState);
  }, [saveState]);

  // Update current step
  const setStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  return {
    // State
    isActive: state.isActive,
    currentStep: state.currentStep,
    shouldShowTour,
    completedTours: state.completedTours,

    // Actions
    startTour,
    completeTour,
    skipTour,
    resetTour,
    resetAllTours,
    setStep,
  };
}
