/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { INestApplication } from '@nestjs/common';
import { createShutdownLogger } from '../logging/index.js';

/**
 * Configuration for graceful shutdown
 */
export interface GracefulShutdownConfig {
  /** Service name for logging */
  serviceName: string;
  /** Timeout in milliseconds before forcing shutdown (default: 10000) */
  timeoutMs?: number;
  /** Custom logger (default: shared structured JSON logger). */
  logger?: {
    log: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

/**
 * Default shutdown timeout: 10 seconds
 */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;

/**
 * Setup graceful shutdown handlers for a NestJS application.
 *
 * This enables proper cleanup when the application receives shutdown signals:
 * - SIGTERM: Sent by container orchestrators (Docker, Kubernetes) for graceful shutdown
 * - SIGINT: Sent when pressing Ctrl+C in terminal
 *
 * The shutdown process:
 * 1. Stops accepting new connections
 * 2. Waits for in-flight requests to complete
 * 3. Calls OnModuleDestroy hooks on all modules
 * 4. Closes database connections, queues, etc.
 * 5. Exits the process
 *
 * @param app - The NestJS application instance
 * @param config - Shutdown configuration
 *
 * @example
 * ```typescript
 * const app = await NestFactory.create(AppModule);
 * setupGracefulShutdown(app, { serviceName: 'api-gateway' });
 * await app.listen(3000);
 * ```
 */
export function setupGracefulShutdown(app: INestApplication, config: GracefulShutdownConfig): void {
  const { serviceName, timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS } = config;
  // Default to the shared structured JSON logger so shutdown events are
  // machine-parseable in log aggregation rather than raw console text.
  const logger = config.logger ?? createShutdownLogger({ name: serviceName });

  // Enable NestJS shutdown hooks (calls OnModuleDestroy, beforeApplicationShutdown, etc.)
  app.enableShutdownHooks();

  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
      logger.warn(`[${serviceName}] Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    logger.log(`[${serviceName}] Received ${signal}, starting graceful shutdown...`);

    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      logger.error(
        `[${serviceName}] Graceful shutdown timed out after ${timeoutMs}ms, forcing exit`,
      );
      process.exit(1);
    }, timeoutMs);

    try {
      // Close the NestJS application (triggers all cleanup hooks)
      await app.close();
      clearTimeout(forceExitTimeout);
      logger.log(`[${serviceName}] Graceful shutdown completed successfully`);
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimeout);
      logger.error(`[${serviceName}] Error during shutdown: ${error}`);
      process.exit(1);
    }
  };

  // Handle termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error(`[${serviceName}] Uncaught exception: ${error}`);
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error(`[${serviceName}] Unhandled rejection: ${reason}`);
    shutdown('unhandledRejection');
  });
}
