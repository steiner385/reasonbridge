/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T013 [P] - Prisma Client Extensions for Soft Delete (Feature 009)
 *
 * Purpose: Conditional soft delete logic for responses
 * - Soft delete (set deletedAt, replace content) if response has replies
 * - Hard delete (permanent removal) if response has no replies
 *
 * Based on research: specs/009-discussion-participation/research.md (Soft Delete section)
 * Prisma Client Extensions: https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions
 */

import { Prisma } from '@prisma/client';

/**
 * NOTE: Prisma Client Extensions use `any` types because:
 * - The `this` context in extension methods refers to internal model delegates
 *   that Prisma doesn't export proper types for
 * - Args like `where` and `args` are dynamic based on model schema
 * - Return types depend on runtime includes/selects
 *
 * See: https://github.com/prisma/prisma/issues/18628
 */

/**
 * Soft delete extension for Response model
 *
 * Adds `softDelete()` method to Prisma Response model
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    response: {
      /**
       * Conditionally deletes a response:
       * - Soft delete if has replies (maintains thread integrity)
       * - Hard delete if no replies (complete removal)
       *
       * @param where - Response identifier
       * @returns Object indicating deletion type and affected response
       *
       * @example
       * ```typescript
       * const result = await prisma.response.softDelete({ where: { id: responseId } });
       * if (result.deletionType === 'SOFT') {
       *   // Response was soft-deleted, thread preserved
       * }
       * ```
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma extension this context and where clause
      async softDelete(
        this: any,
        { where }: { where: any },
      ): Promise<{
        deletionType: 'SOFT' | 'HARD';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma Response with dynamic includes
        response: any;
      }> {
        // Check if response has replies
        const response = await this.findUnique({
          where,
          include: {
            _count: {
              select: {
                replies: true,
              },
            },
          },
        });

        if (!response) {
          throw new Error(`Response with ID ${JSON.stringify(where)} not found`);
        }

        const hasReplies = response._count.replies > 0;

        if (hasReplies) {
          // Soft delete: Set deletedAt and replace content
          const updated = await this.update({
            where,
            data: {
              deletedAt: new Date(),
              content: '[deleted by author]',
              // Optional: Clear other sensitive fields
              citedSources: null,
            },
          });

          return {
            deletionType: 'SOFT',
            response: updated,
          };
        } else {
          // Hard delete: Permanent removal
          const deleted = await this.delete({
            where,
          });

          return {
            deletionType: 'HARD',
            response: deleted,
          };
        }
      },

      /**
       * Finds responses excluding soft-deleted ones
       *
       * @param args - Standard findMany arguments
       * @returns Array of non-deleted responses
       *
       * @example
       * ```typescript
       * const activeResponses = await prisma.response.findManyActive({
       *   where: { discussionId },
       * });
       * ```
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma extension this context and dynamic args
      async findManyActive(this: any, args?: any): Promise<any[]> {
        return this.findMany({
          ...args,
          where: {
            ...args?.where,
            deletedAt: null, // Exclude soft-deleted
          },
        });
      },

      /**
       * Counts responses excluding soft-deleted ones
       *
       * @param args - Standard count arguments
       * @returns Count of non-deleted responses
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma extension this context and dynamic args
      async countActive(this: any, args?: any): Promise<number> {
        return this.count({
          ...args,
          where: {
            ...args?.where,
            deletedAt: null, // Exclude soft-deleted
          },
        });
      },

      /**
       * Checks if a response is soft-deleted
       *
       * @param where - Response identifier
       * @returns True if soft-deleted, false otherwise
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma extension this context and where clause
      async isSoftDeleted(this: any, { where }: { where: any }): Promise<boolean> {
        const response = await this.findUnique({
          where,
          select: {
            deletedAt: true,
          },
        });

        if (!response) {
          throw new Error(`Response with ID ${JSON.stringify(where)} not found`);
        }

        return response.deletedAt !== null;
      },
    },
  },
});

/**
 * Type-safe extended Prisma client with soft delete methods
 */
export type PrismaClientWithSoftDelete = ReturnType<typeof createExtendedPrismaClient>;

/**
 * Helper to create extended Prisma client
 *
 * @param prisma - Base Prisma client
 * @returns Extended Prisma client with soft delete methods
 *
 * @example
 * ```typescript
 * const prisma = new PrismaClient();
 * const extendedPrisma = createExtendedPrismaClient(prisma);
 * await extendedPrisma.response.softDelete({ where: { id: 'uuid' } });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accepts any PrismaClient instance
export function createExtendedPrismaClient(prisma: any) {
  return prisma.$extends(softDeleteExtension);
}
