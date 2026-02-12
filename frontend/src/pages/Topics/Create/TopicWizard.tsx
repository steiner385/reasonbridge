/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Creation Wizard Component
 * Feature 016: Topic Management (T223)
 *
 * A multi-step wizard for creating discussion topics with:
 * - Step 1: Basic Information (title, description)
 * - Step 2: Classification (tags, visibility, evidence standards)
 * - Step 3: Preview and submit
 *
 * Features:
 * - Progressive disclosure of form fields
 * - Step-by-step validation
 * - Duplicate detection integration
 * - Draft persistence to localStorage
 */

import { useState, useCallback, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { useCreateTopic } from '../../../hooks/useCreateTopic';
import type { DuplicateSuggestion } from '../../../services/topicService';
import { WizardProgress } from './components/WizardProgress';
import { BasicInfoStep, ClassificationStep, PreviewStep } from './steps';
import {
  WIZARD_STEPS,
  INITIAL_WIZARD_DATA,
  VALIDATION,
  type TopicWizardData,
  type WizardStep,
} from './types';

const DRAFT_STORAGE_KEY = 'topic-wizard-draft';

export interface TopicWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (topicId: string) => void;
}

/**
 * Validates data for a specific step
 */
function isStepValid(step: WizardStep, data: TopicWizardData): boolean {
  switch (step) {
    case 'basic-info':
      return (
        data.title.length >= VALIDATION.title.min &&
        data.title.length <= VALIDATION.title.max &&
        data.description.length >= VALIDATION.description.min &&
        data.description.length <= VALIDATION.description.max
      );
    case 'classification':
      return data.tags.length >= VALIDATION.tags.min && data.tags.length <= VALIDATION.tags.max;
    case 'preview':
      return true; // Preview step is always valid if we reach it
    default:
      return false;
  }
}

export function TopicWizard({ isOpen, onClose, onSuccess }: TopicWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState<TopicWizardData>(INITIAL_WIZARD_DATA);
  const [duplicates, setDuplicates] = useState<DuplicateSuggestion[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // currentStepIndex is always within bounds due to navigation guards
  const currentStep = WIZARD_STEPS[currentStepIndex]!;

  // Load draft from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setData({ ...INITIAL_WIZARD_DATA, ...parsed });
        } catch {
          // Invalid draft, ignore
        }
      }
    }
  }, [isOpen]);

  // Save draft to localStorage when data changes
  useEffect(() => {
    if (isOpen && (data.title || data.description)) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
    }
  }, [isOpen, data]);

  const {
    mutate: createTopic,
    isPending,
    error,
  } = useCreateTopic({
    onSuccess: (topic) => {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      resetWizard();
      onClose();
      onSuccess?.(topic.id);
    },
    onDuplicateDetected: (suggestions) => {
      setDuplicates(suggestions);
      setShowDuplicateWarning(true);
    },
  });

  const resetWizard = useCallback(() => {
    setCurrentStepIndex(0);
    setData(INITIAL_WIZARD_DATA);
    setDuplicates([]);
    setShowDuplicateWarning(false);
  }, []);

  const handleClose = useCallback(() => {
    resetWizard();
    onClose();
  }, [resetWizard, onClose]);

  const handleDataChange = useCallback((updates: Partial<TopicWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setShowDuplicateWarning(false);
    }
  }, [currentStepIndex]);

  const handleSubmit = useCallback(
    (ignoreWarning = false) => {
      if (duplicates.length > 0 && !ignoreWarning) {
        setShowDuplicateWarning(true);
        return;
      }

      createTopic({
        title: data.title,
        description: data.description,
        tags: data.tags,
        visibility: data.visibility,
        evidenceStandards: data.evidenceStandards,
        isMatureContent: data.isMatureContent,
      });
    },
    [createTopic, data, duplicates],
  );

  const canGoNext = isStepValid(currentStep.id, data);
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Discussion Topic"
      size="lg"
      footer={
        <div className="flex justify-between w-full">
          <div>
            {currentStepIndex > 0 && (
              <Button variant="secondary" onClick={handleBack} disabled={isPending}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            {isLastStep ? (
              <Button
                variant="primary"
                onClick={() => handleSubmit(showDuplicateWarning)}
                disabled={isPending || !canGoNext}
                isLoading={isPending}
              >
                {showDuplicateWarning ? 'Create Anyway' : 'Create Topic'}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleNext} disabled={!canGoNext}>
                Continue
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="min-h-[400px]">
        <WizardProgress steps={WIZARD_STEPS} currentStepIndex={currentStepIndex} />

        {/* Error Message */}
        {error && !showDuplicateWarning && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        {currentStep.id === 'basic-info' && (
          <BasicInfoStep data={data} onChange={handleDataChange} />
        )}
        {currentStep.id === 'classification' && (
          <ClassificationStep data={data} onChange={handleDataChange} />
        )}
        {currentStep.id === 'preview' && (
          <PreviewStep
            data={data}
            duplicates={duplicates}
            showDuplicateWarning={showDuplicateWarning}
          />
        )}
      </div>
    </Modal>
  );
}

export default TopicWizard;
