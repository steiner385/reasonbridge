/**
 * T015 [P] - Structured Logging Utility (Feature 009)
 *
 * Purpose: Consistent logging for discussion operations with correlation IDs
 * Supports different log levels per environment (DEBUG, INFO, WARN, ERROR)
 *
 * Integrates with Feature 008 (Analytics & Observability) when available
 */

import { Logger as NestLogger } from '@nestjs/common';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Log context for structured logging
 */
export interface LogContext {
  /** Correlation ID for tracing requests */
  correlationId?: string;
  /** User ID performing the action */
  userId?: string;
  /** Discussion ID being operated on */
  discussionId?: string;
  /** Response ID being operated on */
  responseId?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Log event types for Feature 009
 */
export enum DiscussionEventType {
  DISCUSSION_CREATED = 'discussion_created',
  DISCUSSION_LISTED = 'discussion_listed',
  DISCUSSION_VIEWED = 'discussion_viewed',
  DISCUSSION_DELETED = 'discussion_deleted',
  RESPONSE_POSTED = 'response_posted',
  RESPONSE_EDITED = 'response_edited',
  RESPONSE_DELETED = 'response_deleted',
  REPLY_POSTED = 'reply_posted',
  CITATION_VALIDATED = 'citation_validated',
  SSRF_BLOCKED = 'ssrf_blocked',
  OPTIMISTIC_LOCK_CONFLICT = 'optimistic_lock_conflict',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

/**
 * Structured logger for discussion operations
 */
export class DiscussionLogger {
  private readonly logger: NestLogger;

  constructor(context: string = 'DiscussionService') {
    this.logger = new NestLogger(context);
  }

  /**
   * Logs a structured event
   */
  private logEvent(
    level: LogLevel,
    eventType: DiscussionEventType | string,
    message: string,
    context?: LogContext,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      eventType,
      message,
      ...context,
    };

    switch (level) {
      case LogLevel.DEBUG:
        this.logger.debug(JSON.stringify(logData));
        break;
      case LogLevel.INFO:
        this.logger.log(JSON.stringify(logData));
        break;
      case LogLevel.WARN:
        this.logger.warn(JSON.stringify(logData));
        break;
      case LogLevel.ERROR:
        this.logger.error(JSON.stringify(logData));
        break;
    }
  }

  /**
   * Log discussion creation
   */
  discussionCreated(discussionId: string, userId: string, context?: LogContext): void {
    this.logEvent(
      LogLevel.INFO,
      DiscussionEventType.DISCUSSION_CREATED,
      `Discussion ${discussionId} created by user ${userId}`,
      { ...context, discussionId, userId },
    );
  }

  /**
   * Log discussion listing
   */
  discussionListed(topicId: string, count: number, context?: LogContext): void {
    this.logEvent(
      LogLevel.DEBUG,
      DiscussionEventType.DISCUSSION_LISTED,
      `Listed ${count} discussions for topic ${topicId}`,
      { ...context, metadata: { topicId, count } },
    );
  }

  /**
   * Log response posting
   */
  responsePosted(
    responseId: string,
    discussionId: string,
    userId: string,
    parentId?: string,
    context?: LogContext,
  ): void {
    this.logEvent(
      LogLevel.INFO,
      parentId ? DiscussionEventType.REPLY_POSTED : DiscussionEventType.RESPONSE_POSTED,
      `Response ${responseId} posted by user ${userId} in discussion ${discussionId}${parentId ? ` (reply to ${parentId})` : ''}`,
      { ...context, responseId, discussionId, userId, metadata: { parentId } },
    );
  }

  /**
   * Log response editing
   */
  responseEdited(responseId: string, userId: string, version: number, context?: LogContext): void {
    this.logEvent(
      LogLevel.INFO,
      DiscussionEventType.RESPONSE_EDITED,
      `Response ${responseId} edited by user ${userId} (version ${version})`,
      { ...context, responseId, userId, metadata: { version } },
    );
  }

  /**
   * Log response deletion
   */
  responseDeleted(
    responseId: string,
    userId: string,
    deletionType: 'SOFT' | 'HARD',
    context?: LogContext,
  ): void {
    this.logEvent(
      LogLevel.INFO,
      DiscussionEventType.RESPONSE_DELETED,
      `Response ${responseId} ${deletionType.toLowerCase()}-deleted by user ${userId}`,
      { ...context, responseId, userId, metadata: { deletionType } },
    );
  }

  /**
   * Log citation validation
   */
  citationValidated(url: string, safe: boolean, threat?: string, context?: LogContext): void {
    this.logEvent(
      safe ? LogLevel.DEBUG : LogLevel.WARN,
      safe ? DiscussionEventType.CITATION_VALIDATED : DiscussionEventType.SSRF_BLOCKED,
      `Citation ${url} validation: ${safe ? 'SAFE' : `BLOCKED (${threat})`}`,
      { ...context, metadata: { url, safe, threat } },
    );
  }

  /**
   * Log SSRF attack blocked
   */
  ssrfBlocked(url: string, threat: string, userId?: string, context?: LogContext): void {
    this.logEvent(
      LogLevel.WARN,
      DiscussionEventType.SSRF_BLOCKED,
      `SSRF attack blocked: ${url} (${threat})`,
      { ...context, userId, metadata: { url, threat } },
    );
  }

  /**
   * Log optimistic lock conflict
   */
  optimisticLockConflict(
    responseId: string,
    currentVersion: number,
    providedVersion: number,
    userId?: string,
    context?: LogContext,
  ): void {
    this.logEvent(
      LogLevel.WARN,
      DiscussionEventType.OPTIMISTIC_LOCK_CONFLICT,
      `Optimistic lock conflict on response ${responseId}: current=${currentVersion}, provided=${providedVersion}`,
      { ...context, responseId, userId, metadata: { currentVersion, providedVersion } },
    );
  }

  /**
   * Log rate limit exceeded
   */
  rateLimitExceeded(userId: string, operation: string, context?: LogContext): void {
    this.logEvent(
      LogLevel.WARN,
      DiscussionEventType.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded for user ${userId} on ${operation}`,
      { ...context, userId, metadata: { operation } },
    );
  }

  /**
   * Log error with stack trace
   */
  error(message: string, error: Error, context?: LogContext): void {
    this.logEvent(LogLevel.ERROR, 'error', message, {
      ...context,
      metadata: { ...context?.metadata, error: error.message, stack: error.stack },
    });
  }

  /**
   * Log warning
   */
  warn(message: string, context?: LogContext): void {
    this.logEvent(LogLevel.WARN, 'warning', message, context);
  }

  /**
   * Log info
   */
  info(message: string, context?: LogContext): void {
    this.logEvent(LogLevel.INFO, 'info', message, context);
  }

  /**
   * Log debug
   */
  debug(message: string, context?: LogContext): void {
    this.logEvent(LogLevel.DEBUG, 'debug', message, context);
  }
}

/**
 * Global logger instance for discussion operations
 */
export const discussionLogger = new DiscussionLogger('DiscussionService');

/**
 * Logger for response operations
 */
export const responseLogger = new DiscussionLogger('ResponseService');
