/**
 * Orientation Overlay Component
 *
 * Non-modal overlay with 3-step orientation flow.
 * Uses backdrop blur to allow users to see the platform underneath.
 * Includes Next, Skip to End, and Dismiss buttons for navigation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Button from '../ui/Button';
import {
  Step1PropositionBased,
  Step2AIFeedback,
  Step3CommonGround,
} from './OrientationStepContent';

export interface OrientationOverlayProps {
  /**
   * Whether the overlay is visible
   */
  isOpen: boolean;

  /**
   * Callback when orientation is completed (viewed all steps)
   */
  onComplete: () => void;

  /**
   * Callback when orientation is skipped
   */
  onSkip: () => void;

  /**
   * Callback when orientation is dismissed entirely
   */
  onDismiss: () => void;
}

const TOTAL_STEPS = 3;

/**
 * OrientationOverlay component for onboarding
 */
const OrientationOverlay: React.FC<OrientationOverlayProps> = ({
  isOpen,
  onComplete,
  onSkip,
  onDismiss,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const firstFocusable = contentRef.current.querySelector<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }
  }, [isOpen, currentStep]);

  // Navigation handler
  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep((prev) => prev - 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, onDismiss, handleNext]);

  if (!isOpen) return null;

  const handleSkipToEnd = () => {
    onSkip();
  };

  const handleDismiss = () => {
    onDismiss();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1PropositionBased />;
      case 2:
        return <Step2AIFeedback />;
      case 3:
        return <Step3CommonGround />;
      default:
        return null;
    }
  };

  const progressPercentage = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orientation-title"
    >
      {/* Backdrop with blur - allows seeing platform underneath */}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-40 backdrop-blur-sm transition-opacity" />

      {/* Overlay content */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={contentRef}
          className="relative bg-white rounded-xl shadow-2xl transition-all w-full max-w-4xl"
        >
          {/* Header with progress */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 id="orientation-title" className="text-xl font-semibold text-gray-900">
                Platform Orientation
              </h2>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md p-1"
                aria-label="Dismiss orientation"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  Step {currentStep} of {TOTAL_STEPS}
                </span>
                <span className="text-sm font-medium text-primary-600">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progressPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={progressPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>

          {/* Body - Step content */}
          <div className="px-6 py-6 max-h-[calc(100vh-250px)] overflow-y-auto">
            {renderStepContent()}
          </div>

          {/* Footer - Navigation buttons */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              {/* Skip to End button */}
              <Button
                variant="ghost"
                size="md"
                onClick={handleSkipToEnd}
                aria-label="Skip to end of orientation"
              >
                Skip to End
              </Button>

              {/* Dismiss button */}
              <Button
                variant="outline"
                size="md"
                onClick={handleDismiss}
                aria-label="Dismiss orientation entirely"
              >
                Dismiss
              </Button>
            </div>

            <div className="flex gap-3">
              {/* Previous button (only show if not on first step) */}
              {currentStep > 1 && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  leftIcon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  }
                  aria-label="Previous step"
                >
                  Previous
                </Button>
              )}

              {/* Next/Finish button */}
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                rightIcon={
                  currentStep < TOTAL_STEPS ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )
                }
                aria-label={currentStep < TOTAL_STEPS ? 'Next step' : 'Finish orientation'}
              >
                {currentStep < TOTAL_STEPS ? 'Next' : 'Get Started'}
              </Button>
            </div>
          </div>

          {/* Step indicators (dots) */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`w-2 h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  step === currentStep
                    ? 'bg-primary-600 w-6'
                    : step < currentStep
                      ? 'bg-primary-400'
                      : 'bg-gray-300'
                }`}
                aria-label={`Go to step ${step}`}
                aria-current={step === currentStep ? 'step' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrientationOverlay;
