/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ModerationAction Fixtures for Testing
 *
 * T292: Predefined moderation action data for testing scenarios
 *
 * Scenarios:
 * - Pending actions awaiting approval
 * - Approved actions ready for execution
 * - Executed actions completed
 * - Appealed actions under review
 * - Reversed actions (successful appeals)
 * - Various action types and severities
 */

import { generateId } from '@reason-bridge/common';
import { nextSequence } from './index.js';

/**
 * Target types for moderation actions
 */
export type ModerationTargetType = 'response' | 'user' | 'topic';

/**
 * Action types with escalating severity
 */
export type ModerationActionType = 'educate' | 'warn' | 'hide' | 'remove' | 'suspend' | 'ban';

/**
 * Severity levels
 */
export type ModerationSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Status of a moderation action
 */
export type ModerationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'appealed'
  | 'reversed';

/**
 * Appeal status
 */
export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

/**
 * Moderator information
 */
export interface Moderator {
  id: string;
  displayName: string;
}

/**
 * Appeal information
 */
export interface Appeal {
  id: string;
  actionId: string;
  userId: string;
  reason: string;
  status: AppealStatus;
  reviewedBy: Moderator | null;
  reviewedAt: Date | null;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Moderation action
 */
export interface ModerationAction {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  actionType: ModerationActionType;
  severity: ModerationSeverity;
  reasoning: string;
  aiRecommended: boolean;
  aiConfidence: number | null;
  approvedBy: Moderator | null;
  approvedAt: Date | null;
  status: ModerationStatus;
  createdAt: Date;
  executedAt: Date | null;
  isTemporary: boolean;
  banDurationDays: number | null;
  expiresAt: Date | null;
  liftedAt: Date | null;
  appeal: Appeal | null;
}

/**
 * Predefined moderators for testing
 */
export const mockModerators: Record<string, Moderator> = {
  alice: {
    id: 'mod-alice-001',
    displayName: 'Alice (Senior Moderator)',
  },
  bob: {
    id: 'mod-bob-002',
    displayName: 'Bob (Community Moderator)',
  },
  system: {
    id: 'mod-system-000',
    displayName: 'System (Automated)',
  },
};

/**
 * Map action types to severities
 */
const actionSeverityMap: Record<ModerationActionType, ModerationSeverity> = {
  educate: 'low',
  warn: 'low',
  hide: 'medium',
  remove: 'medium',
  suspend: 'high',
  ban: 'critical',
};

/**
 * Create a moderation action with default or custom values
 */
export function createModerationAction(
  overrides: Partial<ModerationAction> = {},
): ModerationAction {
  const seq = nextSequence();
  const actionType = overrides.actionType ?? 'warn';

  return {
    id: overrides.id ?? generateId('mod'),
    targetType: overrides.targetType ?? 'response',
    targetId: overrides.targetId ?? generateId('resp'),
    actionType,
    severity: overrides.severity ?? actionSeverityMap[actionType],
    reasoning: overrides.reasoning ?? `Test moderation action ${seq}`,
    aiRecommended: overrides.aiRecommended ?? false,
    aiConfidence: overrides.aiConfidence ?? null,
    approvedBy: overrides.approvedBy ?? null,
    approvedAt: overrides.approvedAt ?? null,
    status: overrides.status ?? 'pending',
    createdAt: overrides.createdAt ?? new Date(),
    executedAt: overrides.executedAt ?? null,
    isTemporary: overrides.isTemporary ?? false,
    banDurationDays: overrides.banDurationDays ?? null,
    expiresAt: overrides.expiresAt ?? null,
    liftedAt: overrides.liftedAt ?? null,
    appeal: overrides.appeal ?? null,
  };
}

/**
 * Create an appeal with default or custom values
 */
export function createAppeal(overrides: Partial<Appeal> = {}): Appeal {
  const seq = nextSequence();
  return {
    id: overrides.id ?? generateId('appeal'),
    actionId: overrides.actionId ?? generateId('mod'),
    userId: overrides.userId ?? generateId('usr'),
    reason: overrides.reason ?? `Appeal reason ${seq}`,
    status: overrides.status ?? 'pending',
    reviewedBy: overrides.reviewedBy ?? null,
    reviewedAt: overrides.reviewedAt ?? null,
    resolution: overrides.resolution ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

/**
 * Create a pending moderation action
 */
export function createPendingAction(overrides: Partial<ModerationAction> = {}): ModerationAction {
  return createModerationAction({
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
    executedAt: null,
    ...overrides,
  });
}

/**
 * Create an approved moderation action
 */
export function createApprovedAction(overrides: Partial<ModerationAction> = {}): ModerationAction {
  const now = new Date();
  return createModerationAction({
    status: 'approved',
    approvedBy: overrides.approvedBy ?? mockModerators['alice'] ?? null,
    approvedAt: overrides.approvedAt ?? now,
    executedAt: null,
    ...overrides,
  });
}

/**
 * Create an executed moderation action
 */
export function createExecutedAction(overrides: Partial<ModerationAction> = {}): ModerationAction {
  const now = new Date();
  const approvedAt = new Date(now.getTime() - 60000); // 1 minute ago
  return createModerationAction({
    status: 'executed',
    approvedBy: overrides.approvedBy ?? mockModerators['alice'] ?? null,
    approvedAt: overrides.approvedAt ?? approvedAt,
    executedAt: overrides.executedAt ?? now,
    ...overrides,
  });
}

/**
 * Create an appealed moderation action
 */
export function createAppealedAction(overrides: Partial<ModerationAction> = {}): ModerationAction {
  const now = new Date();
  const executedAction = createExecutedAction(overrides);
  const appeal = createAppeal({
    actionId: executedAction.id,
    status: 'pending',
    createdAt: now,
  });

  return {
    ...executedAction,
    status: 'appealed',
    appeal,
    ...overrides,
  };
}

/**
 * Create a reversed moderation action (successful appeal)
 */
export function createReversedAction(overrides: Partial<ModerationAction> = {}): ModerationAction {
  const now = new Date();
  const executedAction = createExecutedAction(overrides);
  const appeal = createAppeal({
    actionId: executedAction.id,
    status: 'approved',
    reviewedBy: mockModerators['bob'] ?? null,
    reviewedAt: now,
    resolution: 'Action reversed due to insufficient evidence',
    createdAt: new Date(now.getTime() - 86400000), // 1 day ago
  });

  return {
    ...executedAction,
    status: 'reversed',
    appeal,
    liftedAt: now,
    ...overrides,
  };
}

/**
 * Create an AI-recommended action
 */
export function createAIRecommendedAction(
  overrides: Partial<ModerationAction> = {},
): ModerationAction {
  return createPendingAction({
    aiRecommended: true,
    aiConfidence: overrides.aiConfidence ?? 0.85,
    reasoning:
      overrides.reasoning ?? 'AI detected potential policy violation based on content analysis',
    ...overrides,
  });
}

/**
 * Create a temporary ban action
 */
export function createTemporaryBanAction(
  durationDays: number = 7,
  overrides: Partial<ModerationAction> = {},
): ModerationAction {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  return createExecutedAction({
    targetType: 'user',
    actionType: 'suspend',
    severity: 'high',
    isTemporary: true,
    banDurationDays: durationDays,
    expiresAt,
    reasoning: `Temporary ${durationDays}-day suspension for repeated policy violations`,
    ...overrides,
  });
}

/**
 * Create a permanent ban action
 */
export function createPermanentBanAction(
  overrides: Partial<ModerationAction> = {},
): ModerationAction {
  return createExecutedAction({
    targetType: 'user',
    actionType: 'ban',
    severity: 'critical',
    isTemporary: false,
    banDurationDays: null,
    expiresAt: null,
    reasoning: 'Permanent ban for severe or repeated policy violations',
    ...overrides,
  });
}

/**
 * Create a batch of moderation actions
 */
export function createModerationActionBatch(
  count: number,
  statusDistribution?: Partial<Record<ModerationStatus, number>>,
): ModerationAction[] {
  const actions: ModerationAction[] = [];
  const distribution = statusDistribution ?? {
    pending: Math.floor(count * 0.3),
    approved: Math.floor(count * 0.1),
    executed: Math.floor(count * 0.4),
    appealed: Math.floor(count * 0.1),
    reversed: Math.floor(count * 0.1),
  };

  const creators: Record<ModerationStatus, () => ModerationAction> = {
    pending: createPendingAction,
    approved: createApprovedAction,
    rejected: () => createModerationAction({ status: 'rejected' }),
    executed: createExecutedAction,
    appealed: createAppealedAction,
    reversed: createReversedAction,
  };

  for (const [status, statusCount] of Object.entries(distribution)) {
    const creator = creators[status as ModerationStatus];
    for (let i = 0; i < (statusCount ?? 0); i++) {
      actions.push(creator());
    }
  }

  return actions.slice(0, count);
}

/**
 * Moderation scenario presets for common testing needs
 */
export const moderationScenarios = {
  /**
   * Empty moderation queue
   */
  emptyQueue: (): ModerationAction[] => [],

  /**
   * Queue with pending actions awaiting review
   */
  pendingQueue: (count: number = 5): ModerationAction[] =>
    Array.from({ length: count }, () => createPendingAction()),

  /**
   * Mix of AI and human-initiated actions
   */
  mixedOrigins: (): ModerationAction[] => [
    createAIRecommendedAction({ aiConfidence: 0.92 }),
    createAIRecommendedAction({ aiConfidence: 0.78 }),
    createPendingAction({ aiRecommended: false }),
    createPendingAction({ aiRecommended: false }),
  ],

  /**
   * Actions at various stages of the workflow
   */
  fullWorkflow: (): ModerationAction[] => [
    createPendingAction(),
    createApprovedAction(),
    createExecutedAction(),
    createAppealedAction(),
    createReversedAction(),
  ],

  /**
   * User with escalating violations
   */
  escalatingViolations: (userId: string): ModerationAction[] => {
    const now = new Date();
    return [
      createExecutedAction({
        targetType: 'user',
        targetId: userId,
        actionType: 'educate',
        severity: 'low',
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      }),
      createExecutedAction({
        targetType: 'user',
        targetId: userId,
        actionType: 'warn',
        severity: 'low',
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      }),
      createTemporaryBanAction(3, {
        targetId: userId,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      }),
      createPendingAction({
        targetType: 'user',
        targetId: userId,
        actionType: 'suspend',
        severity: 'high',
      }),
    ];
  },

  /**
   * Actions related to a single response
   */
  responseModeration: (responseId: string): ModerationAction[] => [
    createExecutedAction({
      targetType: 'response',
      targetId: responseId,
      actionType: 'hide',
      reasoning: 'Content hidden pending review',
    }),
  ],

  /**
   * Successful appeal scenario
   */
  successfulAppeal: (): ModerationAction[] => [createReversedAction()],

  /**
   * Rejected appeal scenario
   */
  rejectedAppeal: (): ModerationAction[] => {
    const action = createAppealedAction();
    if (action.appeal) {
      action.appeal.status = 'rejected';
      action.appeal.reviewedBy = mockModerators['alice'] ?? null;
      action.appeal.reviewedAt = new Date();
      action.appeal.resolution = 'Appeal rejected - original action upheld';
    }
    return [action];
  },
};

/**
 * Appeal scenario presets
 */
export const appealScenarios = {
  /**
   * New appeal awaiting review
   */
  pending: (actionId: string): Appeal =>
    createAppeal({
      actionId,
      status: 'pending',
    }),

  /**
   * Appeal under review
   */
  underReview: (actionId: string): Appeal =>
    createAppeal({
      actionId,
      status: 'under_review',
      reviewedBy: mockModerators['bob'] ?? null,
    }),

  /**
   * Approved appeal
   */
  approved: (actionId: string): Appeal =>
    createAppeal({
      actionId,
      status: 'approved',
      reviewedBy: mockModerators['alice'] ?? null,
      reviewedAt: new Date(),
      resolution: 'Appeal granted - action reversed',
    }),

  /**
   * Rejected appeal
   */
  rejected: (actionId: string): Appeal =>
    createAppeal({
      actionId,
      status: 'rejected',
      reviewedBy: mockModerators['alice'] ?? null,
      reviewedAt: new Date(),
      resolution: 'Appeal denied - original decision stands',
    }),
};
