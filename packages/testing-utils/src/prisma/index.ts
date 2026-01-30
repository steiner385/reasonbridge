/**
 * Prisma test client factory for integration tests.
 *
 * Provides isolated Prisma clients that connect to the test database
 * (docker-compose.test.yml) with support for transaction-based test isolation.
 *
 * @example Basic usage
 * ```typescript
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
 *   it('should create a user', async () => {
 *     const user = await prisma.user.create({ data: { ... } });
 *     expect(user).toBeDefined();
 *   });
 * });
 * ```
 *
 * @example Transaction-based isolation
 * ```typescript
 * import { withTestTransaction } from '@reason-bridge/testing-utils/prisma';
 *
 * it('should rollback changes', async () => {
 *   await withTestTransaction(async (tx) => {
 *     await tx.user.create({ data: { ... } });
 *     // Changes are automatically rolled back after the test
 *   });
 * });
 * ```
 */

import { PrismaClient } from '@prisma/client';

/**
 * Test database connection URL.
 * Uses the test database from docker-compose.test.yml (port 5433).
 */
export const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ||
  'postgresql://unite_test:unite_test@localhost:5433/unite_test?schema=public';

/**
 * Options for creating a test Prisma client.
 */
export interface TestPrismaClientOptions {
  /**
   * Custom database URL. Defaults to TEST_DATABASE_URL.
   */
  databaseUrl?: string;

  /**
   * Enable query logging for debugging.
   * @default false
   */
  enableLogging?: boolean;

  /**
   * Prisma log levels to enable when logging is on.
   * @default ['query', 'error', 'warn']
   */
  logLevels?: ('query' | 'info' | 'warn' | 'error')[];
}

/**
 * Create an isolated Prisma client for testing.
 * Connects to the test database and verifies the connection.
 *
 * @param options - Configuration options
 * @returns Connected Prisma client instance
 * @throws Error if connection fails
 */
export async function createTestPrismaClient(
  options: TestPrismaClientOptions = {},
): Promise<PrismaClient> {
  const {
    databaseUrl = TEST_DATABASE_URL,
    enableLogging = false,
    logLevels = ['query', 'error', 'warn'],
  } = options;

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: enableLogging ? logLevels : ['error'],
  });

  // Verify connection by running a simple query
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    await prisma.$disconnect();
    throw new Error(
      `Failed to connect to test database at ${databaseUrl}. ` +
        `Ensure docker-compose.test.yml is running (make docker:test-up). ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return prisma;
}

/**
 * Clean up and disconnect a test Prisma client.
 * Should be called in afterAll() or afterEach() hooks.
 *
 * @param prisma - The Prisma client to clean up
 */
export async function cleanupTestPrismaClient(prisma: PrismaClient): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Truncate all tables in the test database.
 * Useful for resetting state between test suites.
 *
 * @param prisma - The Prisma client
 * @param excludeTables - Tables to exclude from truncation (e.g., migrations)
 */
export async function truncateAllTables(
  prisma: PrismaClient,
  excludeTables: string[] = ['_prisma_migrations'],
): Promise<void> {
  // Get all table names from the database
  const tables: { tablename: string }[] = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN (${excludeTables.join("', '")})
  `;

  // Disable foreign key checks and truncate all tables
  await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

  for (const { tablename } of tables) {
    if (!excludeTables.includes(tablename)) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }

  await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
}

/**
 * Transaction context for test isolation.
 */
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Execute a test within a transaction that is automatically rolled back.
 * This provides complete isolation - changes made within the callback
 * are never persisted to the database.
 *
 * @param prisma - The Prisma client
 * @param callback - Test function to execute within the transaction
 * @returns The result of the callback (before rollback)
 * @throws Re-throws any error from the callback after rollback
 *
 * @example
 * ```typescript
 * const result = await withTestTransaction(prisma, async (tx) => {
 *   const user = await tx.user.create({ data: { email: 'test@test.com' } });
 *   return user;
 * });
 * // Transaction is rolled back, user doesn't exist in DB
 * // but result still contains the user object
 * ```
 */
export async function withTestTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  let result: T;
  let callbackError: Error | null = null;

  try {
    await prisma.$transaction(
      async (tx) => {
        try {
          result = await callback(tx);
        } catch (error) {
          callbackError = error instanceof Error ? error : new Error(String(error));
        }
        // Always throw to trigger rollback
        throw new RollbackError();
      },
      {
        isolationLevel: 'Serializable',
        timeout: 30000, // 30 second timeout for test transactions
      },
    );
  } catch (error) {
    // If it's our intentional rollback, ignore it
    if (!(error instanceof RollbackError)) {
      throw error;
    }
  }

  // Re-throw any error from the callback
  if (callbackError) {
    throw callbackError;
  }

  return result!;
}

/**
 * Internal error class used to trigger transaction rollback.
 */
class RollbackError extends Error {
  constructor() {
    super('Intentional rollback for test isolation');
    this.name = 'RollbackError';
  }
}

/**
 * Create a test context that manages Prisma client lifecycle.
 * Useful for setting up beforeAll/afterAll hooks automatically.
 *
 * @param options - Configuration options
 * @returns Object with setup and teardown functions
 *
 * @example
 * ```typescript
 * const testContext = createTestContext();
 *
 * beforeAll(async () => {
 *   await testContext.setup();
 * });
 *
 * afterAll(async () => {
 *   await testContext.teardown();
 * });
 *
 * it('should work', async () => {
 *   const user = await testContext.prisma.user.create({ ... });
 * });
 * ```
 */
export function createTestContext(options: TestPrismaClientOptions = {}): {
  prisma: PrismaClient;
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
  truncate: () => Promise<void>;
} {
  let prisma: PrismaClient;

  return {
    get prisma() {
      if (!prisma) {
        throw new Error('Test context not initialized. Call setup() first.');
      }
      return prisma;
    },
    async setup() {
      prisma = await createTestPrismaClient(options);
    },
    async teardown() {
      if (prisma) {
        await cleanupTestPrismaClient(prisma);
      }
    },
    async truncate() {
      if (prisma) {
        await truncateAllTables(prisma);
      }
    },
  };
}
