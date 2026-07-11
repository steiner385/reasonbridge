/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared structured (JSON) logging built on pino.
 *
 * @remarks
 * Standardises log output across all reasonBridge services so that log
 * aggregation (CloudWatch/Loki) can query by level/context/correlationId
 * without regex-parsing colourised NestJS text lines.
 *
 * - **Production**: single-line JSON per event (machine-parseable).
 * - **Development**: pretty, human-readable output (via pino-pretty).
 * - **Test**: quiet by default (error level) to avoid noisy/slow test runs.
 *
 * Correlation IDs are bound per-log-call via an optional `contextProvider`,
 * which typically reads the request context from AsyncLocalStorage. Services
 * without a request-scoped store simply emit JSON without a correlationId.
 */

import pino from 'pino';
import type { LoggerService } from '@nestjs/common';

/**
 * Options for building the shared pino logger / Nest LoggerService.
 */
export interface PinoLoggerOptions {
  /** Service name, emitted as the `service` field on every log line. */
  name?: string;
  /** pino level (`trace`|`debug`|`info`|`warn`|`error`|`fatal`|`silent`). */
  level?: pino.LevelWithSilent;
  /** Force pretty printing on/off. Defaults to on only in development. */
  pretty?: boolean;
  /**
   * Optional per-log context provider. Its return value is merged into every
   * log line, e.g. `() => ({ correlationId, traceparent })` sourced from an
   * AsyncLocalStorage request context.
   */
  contextProvider?: () => Record<string, unknown> | undefined;
}

/**
 * Resolve the default log level from the environment.
 *
 * @returns `error` under NODE_ENV=test (keeps test output quiet), otherwise the
 *   value of `LOG_LEVEL` or `info`.
 */
function resolveLevel(explicit?: pino.LevelWithSilent): pino.LevelWithSilent {
  if (explicit) return explicit;
  const envLevel = process.env['LOG_LEVEL'] as pino.LevelWithSilent | undefined;
  if (envLevel) return envLevel;
  if (process.env['NODE_ENV'] === 'test') return 'error';
  return 'info';
}

/**
 * Create the underlying pino logger instance.
 *
 * @param options - Logger configuration
 * @returns A configured pino logger
 */
export function createBasePinoLogger(options: PinoLoggerOptions = {}): pino.Logger {
  const level = resolveLevel(options.level);
  const wantPretty = options.pretty ?? process.env['NODE_ENV'] === 'development';

  const base: pino.LoggerOptions = {
    level,
    base: options.name ? { service: options.name } : {},
    // Emit a human ISO timestamp rather than epoch ms for readability in aggregators.
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      // Emit the level name (e.g. "info") instead of the numeric level.
      level: (label) => ({ level: label }),
    },
  };

  if (wantPretty) {
    try {
      return pino({
        ...base,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: false, translateTime: 'SYS:standard' },
        },
      });
    } catch {
      // pino-pretty unavailable (e.g. minimal runtime) — fall back to JSON.
      return pino(base);
    }
  }

  return pino(base);
}

/**
 * NestJS-compatible logger backed by pino.
 *
 * @remarks
 * Pass an instance to `NestFactory.create(AppModule, { logger })` (and to
 * `setupGracefulShutdown`) so both framework and application logs are emitted as
 * structured JSON. Nest's per-message `context` string and any
 * {@link PinoLoggerOptions.contextProvider} fields are merged into each line.
 *
 * @example
 * ```typescript
 * const logger = new PinoLoggerService({ name: 'api-gateway' });
 * const app = await NestFactory.create(AppModule, { logger });
 * ```
 */
export class PinoLoggerService implements LoggerService {
  private readonly logger: pino.Logger;
  private readonly contextProvider?: () => Record<string, unknown> | undefined;

  constructor(options: PinoLoggerOptions = {}) {
    this.logger = createBasePinoLogger(options);
    this.contextProvider = options.contextProvider;
  }

  /**
   * Build the merged binding object (Nest context string + provider fields).
   */
  private bindings(optionalParams: unknown[]): Record<string, unknown> {
    const bindings: Record<string, unknown> = { ...(this.contextProvider?.() ?? {}) };
    // NestJS passes the logger context (e.g. class name) as the last string arg.
    const context = optionalParams.find((p) => typeof p === 'string');
    if (context) bindings['context'] = context;
    return bindings;
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.info(this.bindings(optionalParams), String(message));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const bindings = this.bindings(optionalParams);
    // A stack trace is conventionally the first optional param on error().
    const stack = optionalParams.find((p) => typeof p === 'string' && p !== bindings['context']);
    if (stack) bindings['stack'] = stack;
    this.logger.error(bindings, String(message));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.warn(this.bindings(optionalParams), String(message));
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug(this.bindings(optionalParams), String(message));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.trace(this.bindings(optionalParams), String(message));
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.fatal(this.bindings(optionalParams), String(message));
  }
}

/**
 * Adapter exposing the `{ log, warn, error }` shape expected by
 * {@link setupGracefulShutdown}, backed by the shared JSON logger.
 *
 * @param options - Logger configuration
 * @returns A minimal structured logger for shutdown handling
 */
export function createShutdownLogger(options: PinoLoggerOptions = {}): {
  log: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
} {
  const logger = createBasePinoLogger(options);
  return {
    log: (message: string) => logger.info(message),
    warn: (message: string) => logger.warn(message),
    error: (message: string) => logger.error(message),
  };
}
