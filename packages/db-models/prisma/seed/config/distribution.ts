/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Distribution Configuration for Demo Seed Data
 *
 * Defines scale targets and power-law distribution parameters.
 */

export type ScaleProfile = 'small' | 'medium' | 'large';

export interface ScaleConfig {
  users: { power: number; regular: number; casual: number };
  topicsPerCategory: number;
  discussionsPerTopic: { high: number; medium: number; low: number };
  responsesPerUser: {
    power: [number, number];
    regular: [number, number];
    casual: [number, number];
  };
  votesPerResponse: [number, number];
  reactionsPerResponse: [number, number];
}

export const SCALE_PROFILES: Record<ScaleProfile, ScaleConfig> = {
  small: {
    users: { power: 5, regular: 15, casual: 30 },
    topicsPerCategory: 5,
    discussionsPerTopic: { high: 2, medium: 1, low: 1 },
    responsesPerUser: { power: [20, 50], regular: [5, 20], casual: [1, 5] },
    votesPerResponse: [1, 5],
    reactionsPerResponse: [0, 3],
  },
  medium: {
    users: { power: 10, regular: 30, casual: 60 },
    topicsPerCategory: 10,
    discussionsPerTopic: { high: 3, medium: 2, low: 1 },
    responsesPerUser: { power: [30, 100], regular: [10, 30], casual: [1, 10] },
    votesPerResponse: [2, 8],
    reactionsPerResponse: [1, 5],
  },
  large: {
    users: { power: 20, regular: 60, casual: 120 },
    topicsPerCategory: 20,
    discussionsPerTopic: { high: 4, medium: 2, low: 1 },
    responsesPerUser: { power: [50, 200], regular: [10, 50], casual: [1, 10] },
    votesPerResponse: [3, 10],
    reactionsPerResponse: [1, 8],
  },
};

export const ACTIVITY_TIERS = ['power', 'regular', 'casual'] as const;
export type ActivityTier = (typeof ACTIVITY_TIERS)[number];

export const CATEGORIES = [
  'Technology & Innovation',
  'Environment & Climate',
  'Healthcare & Medicine',
  'Education & Learning',
  'Economics & Business',
  'Politics & Governance',
  'Science & Research',
  'Ethics & Society',
  'Law & Justice',
  'Media & Communication',
  'Arts & Culture',
  'International Relations',
  'Philosophy & Logic',
  'Personal Finance',
  'Sports & Recreation',
] as const;

export type Category = (typeof CATEGORIES)[number];

export function getScaleConfig(profile: ScaleProfile = 'large'): ScaleConfig {
  return SCALE_PROFILES[profile];
}

export function getTotalUsers(config: ScaleConfig): number {
  return config.users.power + config.users.regular + config.users.casual;
}

export function getTotalTopics(config: ScaleConfig): number {
  return CATEGORIES.length * config.topicsPerCategory;
}
