/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Step } from 'react-joyride';

/**
 * Home page onboarding tour steps
 */
export const homeTourSteps: Step[] = [
  {
    target: 'body',
    content: "Welcome to ReasonBridge! Let's take a quick tour to get you started.",
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-topics"]',
    content: 'Browse and participate in discussion topics. Find conversations that interest you.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-notifications"]',
    content: 'Stay updated with notifications about responses to your posts and mentions.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="theme-toggle"]',
    content: 'Switch between light and dark themes to match your preference.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="user-menu"]',
    content: 'Access your profile, settings, and account options from here.',
    placement: 'bottom',
  },
];

/**
 * Topics page onboarding tour steps
 */
export const topicsTourSteps: Step[] = [
  {
    target: 'body',
    content: 'This is the Topics page where you can explore ongoing discussions.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="topic-filters"]',
    content: 'Filter topics by tags, status, and other criteria to find what interests you.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="topic-card"]',
    content:
      'Each card shows key information about a discussion topic including participants, responses, and diversity score.',
    placement: 'right',
  },
  {
    target: '[data-tour="create-topic"]',
    content: 'Ready to start your own discussion? Click here to create a new topic.',
    placement: 'bottom',
  },
];

/**
 * Discussion page onboarding tour steps
 */
export const discussionTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to the discussion! Here you can read and contribute to the conversation.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="topic-stats"]',
    content:
      'View participation metrics including participant count, responses, and diversity score.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="response-composer"]',
    content:
      'Share your perspective by composing a response. Choose your stance (for, against, or neutral).',
    placement: 'top',
  },
  {
    target: '[data-tour="bridging-suggestions"]',
    content:
      'AI-powered bridging suggestions help identify common ground between different viewpoints.',
    placement: 'top',
  },
];

/**
 * Profile page onboarding tour steps
 */
export const profileTourSteps: Step[] = [
  {
    target: 'body',
    content: 'This is your profile page where you can manage your account and view your activity.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="edit-profile"]',
    content: 'Update your display name, bio, and other profile information.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="trust-score"]',
    content: 'Your trust score reflects your participation quality and community standing.',
    placement: 'right',
  },
  {
    target: '[data-tour="activity-history"]',
    content: 'View your recent discussions, responses, and contributions.',
    placement: 'top',
  },
];

/**
 * Default tour configuration options
 */
export const defaultTourOptions = {
  continuous: true,
  showProgress: true,
  showSkipButton: true,
  disableOverlayClose: false,
  disableCloseOnEsc: false,
  spotlightClicks: true,
  styles: {
    options: {
      zIndex: 10000,
    },
  },
};
