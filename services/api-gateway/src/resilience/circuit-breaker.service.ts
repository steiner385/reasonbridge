import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import type { Options } from 'opossum';

/**
 * Circuit breaker configuration per service
 */
export interface CircuitBreakerConfig {
  /** Service identifier for logging */
  name: string;
  /** Timeout in milliseconds before a request is considered failed */
  timeout?: number;
  /** Error threshold percentage to trip the breaker (0-100) */
  errorThresholdPercentage?: number;
  /** Time in milliseconds before trying again after tripping */
  resetTimeout?: number;
  /** Volume threshold - minimum requests before breaker can trip */
  volumeThreshold?: number;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  name: string;
  state: 'open' | 'closed' | 'half-open';
  successes: number;
  failures: number;
  timeouts: number;
  fallbacks: number;
  rejected: number;
}

const DEFAULT_CONFIG: Partial<Options> = {
  timeout: 5000, // 5 seconds
  errorThresholdPercentage: 50, // Trip after 50% failures
  resetTimeout: 30000, // Try again after 30 seconds
  volumeThreshold: 5, // Minimum 5 requests before tripping
};

/**
 * CircuitBreakerService manages circuit breakers for upstream services.
 *
 * Prevents cascade failures by:
 * - Opening the circuit after repeated failures
 * - Rejecting requests while circuit is open (fail fast)
 * - Attempting recovery in half-open state
 *
 * Usage:
 * ```
 * const breaker = circuitBreakerService.create('user-service', async () => {
 *   return await httpClient.get('/users');
 * });
 * const result = await breaker.fire();
 * ```
 */
@Injectable()
export class CircuitBreakerService implements OnModuleDestroy {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker>();

  /**
   * Create a circuit breaker for a named service
   */
  create<T>(
    config: CircuitBreakerConfig,
    action: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): CircuitBreaker<[], T> {
    const existingBreaker = this.breakers.get(config.name);
    if (existingBreaker) {
      return existingBreaker as CircuitBreaker<[], T>;
    }

    const options: Options = {
      ...DEFAULT_CONFIG,
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
      errorThresholdPercentage:
        config.errorThresholdPercentage ?? DEFAULT_CONFIG.errorThresholdPercentage,
      resetTimeout: config.resetTimeout ?? DEFAULT_CONFIG.resetTimeout,
      volumeThreshold: config.volumeThreshold ?? DEFAULT_CONFIG.volumeThreshold,
    };

    const breaker = new CircuitBreaker(action, options);

    // Set fallback if provided
    if (fallback) {
      breaker.fallback(fallback);
    }

    // Log state changes
    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker OPENED for ${config.name}`);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(`Circuit breaker HALF-OPEN for ${config.name}`);
    });

    breaker.on('close', () => {
      this.logger.log(`Circuit breaker CLOSED for ${config.name}`);
    });

    breaker.on('timeout', () => {
      this.logger.warn(`Request to ${config.name} timed out`);
    });

    breaker.on('reject', () => {
      this.logger.warn(`Request to ${config.name} rejected (circuit open)`);
    });

    this.breakers.set(config.name, breaker);
    return breaker;
  }

  /**
   * Get or create a circuit breaker for a service
   */
  getOrCreate<T>(
    config: CircuitBreakerConfig,
    action: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): CircuitBreaker<[], T> {
    return this.create(config, action, fallback);
  }

  /**
   * Get statistics for all circuit breakers
   */
  getStats(): CircuitBreakerStats[] {
    return Array.from(this.breakers.entries()).map(([name, breaker]) => {
      const stats = breaker.stats;
      return {
        name,
        state: this.getState(breaker),
        successes: stats.successes,
        failures: stats.failures,
        timeouts: stats.timeouts,
        fallbacks: stats.fallbacks,
        rejected: stats.rejects,
      };
    });
  }

  /**
   * Get current state of a circuit breaker
   */
  private getState(breaker: CircuitBreaker): 'open' | 'closed' | 'half-open' {
    if (breaker.opened) return 'open';
    if (breaker.halfOpen) return 'half-open';
    return 'closed';
  }

  /**
   * Shutdown all circuit breakers
   */
  onModuleDestroy(): void {
    for (const [name, breaker] of this.breakers) {
      this.logger.log(`Shutting down circuit breaker for ${name}`);
      breaker.shutdown();
    }
    this.breakers.clear();
  }
}
