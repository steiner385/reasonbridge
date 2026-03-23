/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Step } from 'react-joyride';

/**
 * Tour IDs for different pages/features
 */
export type TourId = 'home' | 'discussion' | 'profile';

/**
 * Home/Topics page tour steps
 * Guides new users through the topic list and basic navigation
 */
export const homePageTourSteps: Step[] = [
  {
    target: '[data-tour="topic-list"]',
    content:
      'Welcome to ReasonBridge! This is the topic list where you can find discussions on various subjects. Click any topic to join the conversation.',
    title: 'Browse Topics',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="search-input"]',
    content:
      'Use the search bar to find specific topics. You can search by title, tags, or keywords.',
    title: 'Search Topics',
    placement: 'bottom',
  },
  {
    target: '[data-tour="topic-filters"]',
    content:
      'Filter topics by status (active, archived) or tags to narrow down what you want to discuss.',
    title: 'Filter Topics',
    placement: 'bottom',
  },
  {
    target: '[data-tour="create-topic"]',
    content:
      'Ready to start a new discussion? Click here to create your own topic and invite others to participate.',
    title: 'Create a Topic',
    placement: 'left',
  },
  {
    target: '[data-tour="sidebar"]',
    content:
      'The sidebar shows your recent topics, bookmarks, and quick navigation. You can collapse it for more space.',
    title: 'Quick Navigation',
    placement: 'right',
  },
];

/**
 * Discussion page tour steps
 * Guides users through the discussion interface and interaction options
 */
export const discussionTourSteps: Step[] = [
  {
    target: '[data-tour="discussion-header"]',
    content:
      'This is the discussion view. Here you can read responses, share your thoughts, and find common ground with others.',
    title: 'Welcome to the Discussion',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="response-composer"]',
    content:
      'Share your perspective by writing a response. Be thoughtful and cite sources when making factual claims.',
    title: 'Write a Response',
    placement: 'top',
  },
  {
    target: '[data-tour="vote-buttons"]',
    content:
      'Vote on responses to show what you find helpful. Upvote well-reasoned arguments, downvote unhelpful ones.',
    title: 'Vote on Responses',
    placement: 'left',
  },
  {
    target: '[data-tour="reaction-bar"]',
    content:
      'Add emoji reactions to express how you feel about a response without writing a full reply.',
    title: 'React to Responses',
    placement: 'top',
  },
  {
    target: '[data-tour="bookmark-button"]',
    content:
      'Bookmark responses you want to revisit later. Find all your bookmarks in your profile.',
    title: 'Save for Later',
    placement: 'left',
  },
  {
    target: '[data-tour="share-button"]',
    content: 'Share a direct link to any response with others outside the platform.',
    title: 'Share Responses',
    placement: 'left',
  },
  {
    target: '[data-tour="common-ground"]',
    content:
      'AI analyzes the discussion to find shared values and potential areas of agreement between participants.',
    title: 'Common Ground',
    placement: 'left',
  },
  {
    target: '[data-tour="propositions"]',
    content:
      'Key claims are extracted as propositions. Vote on individual claims to show agreement or disagreement.',
    title: 'Propositions',
    placement: 'left',
  },
];

/**
 * Profile page tour steps
 * Guides users through their profile, trust scores, and settings
 */
export const profileTourSteps: Step[] = [
  {
    target: '[data-tour="profile-header"]',
    content:
      'This is your profile page. Here you can see your contribution history, trust score, and settings.',
    title: 'Your Profile',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="trust-score"]',
    content:
      'Your Trust Score reflects your reputation in the community. It is based on three dimensions: Ability (expertise), Benevolence (helpfulness), and Integrity (consistency).',
    title: 'Trust Score',
    placement: 'right',
  },
  {
    target: '[data-tour="tier-badge"]',
    content:
      'Your tier shows your overall contribution level. Progress through Newcomer, Contributor, Trusted, Leader, and Expert as you participate.',
    title: 'Your Tier',
    placement: 'left',
  },
  {
    target: '[data-tour="verification-status"]',
    content:
      'Verification badges show how much of your identity has been confirmed. Higher verification unlocks more features.',
    title: 'Verification Status',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-settings"]',
    content: 'Customize your profile, notification preferences, and privacy settings here.',
    title: 'Settings',
    placement: 'left',
  },
];

/**
 * Get tour steps by tour ID
 */
export function getTourSteps(tourId: TourId): Step[] {
  switch (tourId) {
    case 'home':
      return homePageTourSteps;
    case 'discussion':
      return discussionTourSteps;
    case 'profile':
      return profileTourSteps;
    default:
      return [];
  }
}

/**
 * LocalStorage keys for tour completion tracking
 */
export const TOUR_STORAGE_KEYS = {
  home: 'tour_home_completed',
  discussion: 'tour_discussion_completed',
  profile: 'tour_profile_completed',
} as const;

/**
 * Check if a tour has been completed
 */
export function isTourCompleted(tourId: TourId): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TOUR_STORAGE_KEYS[tourId]) === 'true';
}

/**
 * Mark a tour as completed
 */
export function markTourCompleted(tourId: TourId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOUR_STORAGE_KEYS[tourId], 'true');
}

/**
 * Reset a tour (mark as not completed)
 */
export function resetTour(tourId: TourId): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOUR_STORAGE_KEYS[tourId]);
}

/**
 * Reset all tours
 */
export function resetAllTours(): void {
  if (typeof window === 'undefined') return;
  Object.values(TOUR_STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}
