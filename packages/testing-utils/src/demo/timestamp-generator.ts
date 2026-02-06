/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo Timestamp Generator
 *
 * Generates deterministic timestamps for demo data.
 * Uses a hash-based algorithm to ensure consistent timestamps across resets.
 *
 * Features:
 * - 30-day span backward from current time
 * - Weighted distribution favoring recent activity (70% in last 7 days)
 * - Peak hours simulation (9am, 12pm, 5pm, 9pm)
 */

const DEFAULT_MAX_AGE_DAYS = 30;
const DEFAULT_RECENT_WEIGHT = 0.7;
const RECENT_WINDOW_DAYS = 7;
const PEAK_HOURS = [9, 12, 17, 21];

/**
 * Generate a deterministic hash from a string seed
 */
function deterministicHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a weighted day offset favoring recent dates
 *
 * @param hash - Deterministic hash value
 * @param maxDays - Maximum days in the past
 * @param recentWeight - Weight for recent window (0-1)
 * @returns Number of days in the past
 */
function weightedDayOffset(hash: number, maxDays: number, recentWeight: number): number {
  // Use hash to determine if we're in the recent window
  const normalized = (hash % 1000) / 1000; // 0-1

  if (normalized < recentWeight) {
    // Recent window (weighted portion)
    const recentHash = (hash % RECENT_WINDOW_DAYS) + 1;
    return recentHash;
  } else {
    // Older window
    const olderHash = (hash % (maxDays - RECENT_WINDOW_DAYS)) + RECENT_WINDOW_DAYS;
    return olderHash;
  }
}

/**
 * Select a peak activity hour based on hash
 */
function selectPeakHour(hash: number): number {
  const index = hash % PEAK_HOURS.length;
  // Index is always within bounds due to modulo
  return PEAK_HOURS[index] ?? PEAK_HOURS[0] ?? 9;
}

/**
 * Generate a deterministic minute offset
 */
function selectMinuteOffset(hash: number): number {
  return hash % 60;
}

export interface TimestampConfig {
  maxAgeDays?: number;
  recentWeight?: number;
  baseDate?: Date;
}

/**
 * Generate a deterministic timestamp for demo data
 *
 * @param seedId - Unique identifier for deterministic generation
 * @param config - Optional configuration
 * @returns Date object representing the timestamp
 *
 * @example
 * ```typescript
 * // Generate timestamp for a response
 * const timestamp = generateDemoTimestamp('response-101-001');
 *
 * // Generate timestamp with custom config
 * const timestamp = generateDemoTimestamp('topic-101', {
 *   maxAgeDays: 14,
 *   recentWeight: 0.8,
 * });
 * ```
 */
export function generateDemoTimestamp(seedId: string, config: TimestampConfig = {}): Date {
  const {
    maxAgeDays = DEFAULT_MAX_AGE_DAYS,
    recentWeight = DEFAULT_RECENT_WEIGHT,
    baseDate = new Date(),
  } = config;

  const hash = deterministicHash(seedId);
  const dayOffset = weightedDayOffset(hash, maxAgeDays, recentWeight);
  const hour = selectPeakHour(hash >> 4); // Shift to get different bits
  const minute = selectMinuteOffset(hash >> 8);

  const result = new Date(baseDate);
  result.setDate(result.getDate() - dayOffset);
  result.setHours(hour, minute, 0, 0);

  return result;
}

/**
 * Generate a sequence of timestamps for a conversation thread
 * Ensures replies come after parent posts with natural delays
 *
 * @param baseId - Base identifier for the thread
 * @param count - Number of timestamps to generate
 * @param config - Optional configuration
 * @returns Array of Date objects in chronological order
 */
export function generateThreadTimestamps(
  baseId: string,
  count: number,
  config: TimestampConfig = {},
): Date[] {
  const timestamps: Date[] = [];
  let previousTimestamp = generateDemoTimestamp(baseId, config);

  for (let i = 0; i < count; i++) {
    const seedId = `${baseId}-${i}`;
    const hash = deterministicHash(seedId);

    // Add 1-24 hours between posts
    const hoursDelay = (hash % 24) + 1;
    const minutesDelay = hash % 60;

    const nextTimestamp = new Date(previousTimestamp);
    nextTimestamp.setHours(nextTimestamp.getHours() + hoursDelay);
    nextTimestamp.setMinutes(nextTimestamp.getMinutes() + minutesDelay);

    timestamps.push(nextTimestamp);
    previousTimestamp = nextTimestamp;
  }

  return timestamps;
}

/**
 * Generate an "updated at" timestamp that's slightly after "created at"
 *
 * @param createdAt - The creation timestamp
 * @param seedId - Unique identifier for deterministic generation
 * @returns Date object representing the update timestamp
 */
export function generateUpdatedAtTimestamp(createdAt: Date, seedId: string): Date {
  const hash = deterministicHash(seedId + '-updated');
  const minutesAfter = (hash % 60) + 1; // 1-60 minutes after creation

  const updatedAt = new Date(createdAt);
  updatedAt.setMinutes(updatedAt.getMinutes() + minutesAfter);

  return updatedAt;
}

export default {
  generateDemoTimestamp,
  generateThreadTimestamps,
  generateUpdatedAtTimestamp,
};
