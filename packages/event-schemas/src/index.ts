/**
 * Event schema definitions for uniteDiscord
 *
 * This package contains type definitions for all domain events
 * used in the event-driven architecture.
 */

// Base event types
export * from './base.js';

// Domain event types
export * from './discussion.js';
export * from './ai.js';
export * from './moderation.js';

// Import event type constants
import { DISCUSSION_EVENT_TYPES } from './discussion.js';
import { AI_EVENT_TYPES } from './ai.js';
import { MODERATION_EVENT_TYPES } from './moderation.js';

// Re-export individually
export { DISCUSSION_EVENT_TYPES, AI_EVENT_TYPES, MODERATION_EVENT_TYPES };

/**
 * All event type constants combined
 */
export const EVENT_TYPES = {
  ...DISCUSSION_EVENT_TYPES,
  ...AI_EVENT_TYPES,
  ...MODERATION_EVENT_TYPES,
} as const;
