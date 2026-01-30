/**
 * Database cleanup utility for integration tests.
 *
 * Provides a `cleanDatabase` function that deletes all data from the database
 * in the correct order to respect foreign key constraints. This is faster than
 * TRUNCATE CASCADE for smaller datasets and provides explicit control over
 * deletion order.
 *
 * @example Basic usage in beforeEach
 * ```typescript
 * import { cleanDatabase } from '@reason-bridge/testing-utils';
 * import { createTestPrismaClient, cleanupTestPrismaClient } from '@reason-bridge/testing-utils/prisma';
 *
 * describe('User Service', () => {
 *   let prisma: PrismaClient;
 *
 *   beforeAll(async () => {
 *     prisma = await createTestPrismaClient();
 *   });
 *
 *   afterAll(async () => {
 *     await cleanupTestPrismaClient(prisma);
 *   });
 *
 *   beforeEach(async () => {
 *     await cleanDatabase(prisma);
 *   });
 *
 *   it('should create a user', async () => {
 *     // Database is clean, test with fresh data
 *   });
 * });
 * ```
 */

import { PrismaClient } from '@reason-bridge/db-models';

/**
 * Tables in FK-safe deletion order (leaf tables first, root tables last).
 *
 * Order is determined by foreign key relationships:
 * 1. Delete tables that reference other tables first
 * 2. Then delete the tables they reference
 * 3. Finally delete root tables (User, Tag, etc.)
 *
 * This order ensures we never try to delete a record that is still
 * being referenced by another table.
 */
const TABLE_DELETION_ORDER = [
  // Leaf tables (no other tables reference these)
  'citation',
  'participant_activities',
  'alignments',
  'votes',
  'response_propositions',
  'feedback',
  'fact_check_results',
  'appeals',

  // Mid-level tables (referenced by leaf tables)
  'responses',
  'discussions',
  'propositions',
  'common_ground_analyses',
  'topic_tags',
  'topic_links',
  'topic_interests',
  'onboarding_progress',
  'visitor_sessions',
  'verification_tokens',

  // Tables referencing User
  'moderation_actions',
  'video_uploads',
  'verification_records',
  'user_follows',

  // Root tables (most referenced)
  'discussion_topics',
  'tags',
  'users',
] as const;

/**
 * Options for database cleanup.
 */
export interface CleanDatabaseOptions {
  /**
   * Tables to exclude from cleanup (e.g., migrations table).
   * @default ['_prisma_migrations']
   */
  excludeTables?: string[];

  /**
   * Enable verbose logging of deletion progress.
   * @default false
   */
  verbose?: boolean;

  /**
   * Only clean specific tables (overrides default order).
   * Tables will still be deleted in FK-safe order.
   */
  onlyTables?: string[];
}

/**
 * Clean all data from the database in FK-safe order.
 *
 * This function deletes all rows from database tables in the correct order
 * to respect foreign key constraints. Unlike TRUNCATE CASCADE, this approach:
 * - Provides explicit control over deletion order
 * - Works well with smaller test datasets
 * - Is compatible with all PostgreSQL configurations
 *
 * @param prisma - The Prisma client instance
 * @param options - Optional configuration
 * @returns Promise that resolves when cleanup is complete
 *
 * @example
 * ```typescript
 * // Clean all tables
 * await cleanDatabase(prisma);
 *
 * // Clean with verbose logging
 * await cleanDatabase(prisma, { verbose: true });
 *
 * // Clean only specific tables
 * await cleanDatabase(prisma, { onlyTables: ['users', 'responses'] });
 * ```
 */
export async function cleanDatabase(
  prisma: PrismaClient,
  options: CleanDatabaseOptions = {},
): Promise<void> {
  const { excludeTables = ['_prisma_migrations'], verbose = false, onlyTables } = options;

  // Determine which tables to clean
  let tablesToClean = [...TABLE_DELETION_ORDER];

  if (onlyTables && onlyTables.length > 0) {
    // Filter to only specified tables, but maintain FK-safe order
    const onlyTablesSet = new Set(onlyTables.map((t) => t.toLowerCase()));
    tablesToClean = tablesToClean.filter((t) => onlyTablesSet.has(t));
  }

  // Remove excluded tables
  const excludeSet = new Set(excludeTables.map((t) => t.toLowerCase()));
  tablesToClean = tablesToClean.filter((t) => !excludeSet.has(t));

  if (verbose) {
    // Using process.stdout to avoid console lint issues in non-test code
    process.stdout.write(`[cleanDatabase] Cleaning ${tablesToClean.length} tables...\n`);
  }

  // Delete from each table in order
  for (const tableName of tablesToClean) {
    try {
      const result = await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);

      if (verbose && result > 0) {
        process.stdout.write(`[cleanDatabase] Deleted ${result} rows from ${tableName}\n`);
      }
    } catch (error) {
      // Table might not exist (e.g., if migrations haven't run)
      // or might have a different name - skip silently unless verbose
      if (verbose) {
        const message = error instanceof Error ? error.message : String(error);
        process.stdout.write(`[cleanDatabase] Warning: Could not clean ${tableName}: ${message}\n`);
      }
    }
  }

  if (verbose) {
    process.stdout.write('[cleanDatabase] Cleanup complete\n');
  }
}

/**
 * Get the FK-safe deletion order for all tables.
 *
 * Useful for debugging or when you need to know the deletion order.
 *
 * @returns Array of table names in FK-safe deletion order
 */
export function getTableDeletionOrder(): readonly string[] {
  return TABLE_DELETION_ORDER;
}

/**
 * Clean specific model data using Prisma's typed deleteMany.
 *
 * This is a type-safe alternative to cleanDatabase for when you only
 * need to clean specific models and want IDE autocompletion.
 *
 * @param prisma - The Prisma client instance
 * @param models - Array of model names to clean (case-insensitive)
 *
 * @example
 * ```typescript
 * // Clean only user-related data
 * await cleanModels(prisma, ['user', 'userFollow', 'verificationRecord']);
 * ```
 */
export async function cleanModels(prisma: PrismaClient, models: string[]): Promise<void> {
  // Map model names to table names for FK-safe ordering
  const modelToTable: Record<string, string> = {
    citation: 'citation',
    participantactivity: 'participant_activities',
    alignment: 'alignments',
    vote: 'votes',
    responseproposition: 'response_propositions',
    feedback: 'feedback',
    factcheckresult: 'fact_check_results',
    appeal: 'appeals',
    response: 'responses',
    discussion: 'discussions',
    proposition: 'propositions',
    commongroundanalysis: 'common_ground_analyses',
    topictag: 'topic_tags',
    topiclink: 'topic_links',
    topicinterest: 'topic_interests',
    onboardingprogress: 'onboarding_progress',
    visitorsession: 'visitor_sessions',
    verificationtoken: 'verification_tokens',
    moderationaction: 'moderation_actions',
    videoupload: 'video_uploads',
    verificationrecord: 'verification_records',
    userfollow: 'user_follows',
    discussiontopic: 'discussion_topics',
    tag: 'tags',
    user: 'users',
  };

  // Convert model names to table names
  const tableNames = models
    .map((m) => modelToTable[m.toLowerCase()])
    .filter((t): t is string => t !== undefined);

  // Use cleanDatabase with the specific tables
  await cleanDatabase(prisma, { onlyTables: tableNames });
}
