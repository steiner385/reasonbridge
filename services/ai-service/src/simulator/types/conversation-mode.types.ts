/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export type ConversationMode = 'socratic' | 'debate' | 'steelman' | 'common_ground';

export type DifficultyLevel = 'novice' | 'intermediate' | 'expert';

export type PersonaTone = 'measured' | 'analytical' | 'passionate' | 'confrontational';

export interface PresetPersona {
  id: string;
  name: string;
  description: string;
  position: string;
  tone: PersonaTone;
  modeAffinity: ConversationMode;
  systemPromptTemplate: string;
}

export interface CustomPersonaConfig {
  name: string;
  position: string;
  background: string;
  tone: PersonaTone;
  receptiveness: number;
  argumentation: {
    usesEmotionalAppeals: boolean;
    citesData: boolean;
    asksQuestions: boolean;
  };
  exampleArguments?: string[];
}

export interface Fallacy {
  type: string;
  description: string;
  excerpt: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface ArgumentAnalysis {
  fallacies: Fallacy[];
  unsupportedClaims: string[];
  toneScore: number;
  evidenceScore: number;
  coherenceScore: number;
  suggestions: string[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'persona';
  content: string;
  timestamp: string;
  analysis?: ArgumentAnalysis;
}

export interface LearningInsights {
  strengths: string[];
  improvements: string[];
  fallaciesCommitted: { type: string; exchange: number; excerpt: string }[];
  recommendedReadings: { title: string; reason: string }[];
  overallAssessment: string;
}
