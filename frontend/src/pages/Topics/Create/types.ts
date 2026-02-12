/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Types for the Topic Creation Wizard
 * Feature 016: Topic Management (T223)
 */

export type TopicVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type EvidenceStandard = 'MINIMAL' | 'STANDARD' | 'RIGOROUS';

export interface TopicWizardData {
  /** Topic title (10-200 characters) */
  title: string;
  /** Topic description (50-5000 characters) */
  description: string;
  /** Topic tags (1-5 tags) */
  tags: string[];
  /** Topic visibility setting */
  visibility: TopicVisibility;
  /** Evidence standard requirements */
  evidenceStandards: EvidenceStandard;
  /** Whether topic contains mature content */
  isMatureContent: boolean;
}

export type WizardStep = 'basic-info' | 'classification' | 'preview';

export interface WizardStepConfig {
  id: WizardStep;
  title: string;
  description: string;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Title and description',
  },
  {
    id: 'classification',
    title: 'Classification',
    description: 'Tags and settings',
  },
  {
    id: 'preview',
    title: 'Preview',
    description: 'Review and create',
  },
];

export const INITIAL_WIZARD_DATA: TopicWizardData = {
  title: '',
  description: '',
  tags: [],
  visibility: 'PUBLIC',
  evidenceStandards: 'STANDARD',
  isMatureContent: false,
};

/** Validation constraints matching backend DTOs */
export const VALIDATION = {
  title: { min: 10, max: 200 },
  description: { min: 50, max: 5000 },
  tags: { min: 1, max: 5, tagMinLength: 2, tagMaxLength: 50 },
} as const;
