import { Module, Global } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service.js';

/**
 * ResilienceModule provides resilience patterns for the API Gateway:
 *
 * - **Circuit Breaker**: Prevents cascade failures by failing fast
 *   when downstream services are unhealthy
 *
 * - **Retry with Backoff**: Automatically retries failed requests
 *   with exponential backoff and jitter
 *
 * Usage:
 * ```typescript
 * // In a service
 * constructor(private readonly circuitBreaker: CircuitBreakerService) {}
 *
 * async fetchUser(id: string) {
 *   const breaker = this.circuitBreaker.create(
 *     { name: 'user-service', timeout: 5000 },
 *     () => this.httpService.get(`/users/${id}`)
 *   );
 *   return breaker.fire();
 * }
 * ```
 *
 * The module is global, so CircuitBreakerService is available
 * throughout the application without explicit imports.
 */
@Global()
@Module({
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class ResilienceModule {}
