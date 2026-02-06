/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T014 [P] - Optimistic Locking Error Handler (Feature 009)
 *
 * Purpose: Detect and handle version conflicts when editing responses
 * Uses version field for optimistic locking without database locks
 *
 * Research: specs/009-discussion-participation/research.md (Optimistic Locking section)
 */

import { ConflictException } from '@nestjs/common';

/**
 * Exception thrown when optimistic lock version mismatch occurs
 */
export class OptimisticLockException extends ConflictException {
  constructor(
    public readonly currentVersion: number,
    public readonly providedVersion: number,
    message?: string,
  ) {
    super({
      statusCode: 409,
      message:
        message || 'Response was modified by another operation. Please refresh and try again.',
      error: 'Conflict',
      currentVersion,
      providedVersion,
    });
  }
}

/**
 * Validates that the provided version matches the current version
 *
 * @param currentVersion - Version from database
 * @param providedVersion - Version from client request
 * @throws OptimisticLockException if versions don't match
 *
 * @example
 * ```typescript
 * const response = await prisma.response.findUnique({ where: { id } });
 * validateVersion(response.version, dto.version); // Throws if mismatch
 * ```
 */
export function validateVersion(currentVersion: number, providedVersion: number): void {
  if (currentVersion !== providedVersion) {
    throw new OptimisticLockException(
      currentVersion,
      providedVersion,
      `Version conflict: expected ${providedVersion}, current is ${currentVersion}`,
    );
  }
}

/**
 * Performs optimistic update with version check
 *
 * @param getCurrentVersion - Async function to fetch current version
 * @param providedVersion - Version from client request
 * @param updateFn - Async function to perform update with incremented version
 * @returns Updated entity
 *
 * @example
 * ```typescript
 * const updated = await performOptimisticUpdate(
 *   async () => {
 *     const response = await prisma.response.findUnique({ where: { id } });
 *     return response.version;
 *   },
 *   dto.version,
 *   async (newVersion) => {
 *     return prisma.response.update({
 *       where: { id },
 *       data: {
 *         content: dto.content,
 *         version: newVersion,
 *         editedAt: new Date(),
 *       },
 *     });
 *   },
 * );
 * ```
 */
export async function performOptimisticUpdate<T>(
  getCurrentVersion: () => Promise<number>,
  providedVersion: number,
  updateFn: (newVersion: number) => Promise<T>,
): Promise<T> {
  // Fetch current version
  const currentVersion = await getCurrentVersion();

  // Validate version
  validateVersion(currentVersion, providedVersion);

  // Perform update with incremented version
  const newVersion = currentVersion + 1;
  return updateFn(newVersion);
}

/**
 * Retry logic for optimistic lock conflicts
 *
 * @param operation - Async operation to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 100)
 * @returns Result of successful operation
 * @throws Last encountered error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await retryOnOptimisticLock(
 *   async () => {
 *     const response = await prisma.response.findUnique({ where: { id } });
 *     validateVersion(response.version, expectedVersion);
 *     return prisma.response.update({ where: { id }, data: {...} });
 *   },
 *   maxRetries: 5,
 * );
 * ```
 */
export async function retryOnOptimisticLock<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof OptimisticLockException && attempt < maxRetries) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        lastError = error;
        continue;
      }
      // Non-retryable error or max retries reached
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('Optimistic lock retry failed');
}

/**
 * Checks if an error is an optimistic lock conflict
 *
 * @param error - Error to check
 * @returns True if error is OptimisticLockException
 */
export function isOptimisticLockError(error: unknown): error is OptimisticLockException {
  return error instanceof OptimisticLockException;
}

/**
 * Wraps an update operation with automatic version management
 *
 * @param entity - Entity with version field
 * @param providedVersion - Version from client request
 * @param updateData - Data to update
 * @returns Update data with incremented version
 *
 * @example
 * ```typescript
 * const response = await prisma.response.findUnique({ where: { id } });
 * const updateData = withVersionIncrement(response, dto.version, {
 *   content: dto.content,
 *   editedAt: new Date(),
 * });
 * await prisma.response.update({ where: { id }, data: updateData });
 * ```
 */
export function withVersionIncrement<T extends Record<string, any>>(
  entity: { version: number },
  providedVersion: number,
  updateData: T,
): T & { version: number } {
  validateVersion(entity.version, providedVersion);
  return {
    ...updateData,
    version: entity.version + 1,
  };
}
