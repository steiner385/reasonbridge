/**
 * Event schema definitions for reasonBridge
 *
 * This package contains type definitions for all domain events
 * used in the event-driven architecture.
 */

// Base event types
export * from './base';

// Domain event types
export * from './discussion';
export * from './ai';
export * from './moderation';
export * from './user';

// Import event type constants
import { DISCUSSION_EVENT_TYPES } from './discussion';
import { AI_EVENT_TYPES } from './ai';
import { MODERATION_EVENT_TYPES } from './moderation';
import { USER_EVENT_TYPES } from './user';

// Re-export individually
export { DISCUSSION_EVENT_TYPES, AI_EVENT_TYPES, MODERATION_EVENT_TYPES, USER_EVENT_TYPES };

/**
 * All event type constants combined
 */
export const EVENT_TYPES = {
  ...DISCUSSION_EVENT_TYPES,
  ...AI_EVENT_TYPES,
  ...MODERATION_EVENT_TYPES,
  ...USER_EVENT_TYPES,
} as const;
