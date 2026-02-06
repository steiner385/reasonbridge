/**
 * Onboarding progress types for interactive tour
 * Tracks user progress through onboarding tour
 */

/**
 * Onboarding progress state
 * Stored in localStorage and synced to backend
 */
export interface OnboardingProgressState {
  /** Whether tour has been completed */
  completed: boolean;

  /** Whether tour has been skipped */
  skipped: boolean;

  /** Whether tour is currently running */
  isRunning: boolean;

  /** Current step index (0-based) */
  currentStepIndex: number;

  /** Total number of steps in the tour */
  totalSteps: number;

  /** Array of step indices that have been completed */
  completedSteps: number[];

  /** Array of tooltip IDs that have been dismissed (contextual tooltips separate from main tour) */
  dismissedTooltips: string[];

  /** ISO 8601 timestamp when tour was started */
  tourStartedAt: string | null;

  /** ISO 8601 timestamp when tour was completed */
  tourCompletedAt: string | null;

  /** ISO 8601 timestamp when tour was skipped */
  tourSkippedAt: string | null;

  /** Number of times user has skipped the tour (for re-prompting logic) */
  skipCount: number;

  /** ISO 8601 timestamp of last prompt to restart tour */
  lastPromptDate: string | null;
}

/**
 * Onboarding tour context type for React Context
 */
export interface OnboardingTourContextType {
  /** Current progress state */
  progress: OnboardingProgressState;

  /** Start the onboarding tour */
  startTour: () => void;

  /** Skip the onboarding tour */
  skipTour: () => void;

  /** Move to next step */
  nextStep: () => void;

  /** Move to previous step */
  prevStep: () => void;

  /** Restart the tour from beginning */
  restartTour: () => void;

  /** Mark tour as completed */
  completeTour: () => void;

  /** Dismiss a contextual tooltip */
  dismissTooltip: (tooltipId: string) => void;

  /** Check if a tooltip has been dismissed */
  isTooltipDismissed: (tooltipId: string) => boolean;
}

/**
 * Tour step definition for React Joyride
 */
export interface TourStep {
  /** Target element selector or data-tour-id */
  target: string;

  /** Content to display in the tooltip */
  content: string | React.ReactNode;

  /** Optional title for the step */
  title?: string;

  /** Placement of the tooltip relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';

  /** Whether to disable interaction with the target element */
  disableBeacon?: boolean;

  /** Whether this step should be skipped if target is not found */
  skipIfMissing?: boolean;
}
