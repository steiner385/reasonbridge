import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreakerService } from '../circuit-breaker.service.js';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create a circuit breaker', () => {
      const action = vi.fn().mockResolvedValue('result');
      const breaker = service.create({ name: 'test-service' }, action);

      expect(breaker).toBeDefined();
      expect(typeof breaker.fire).toBe('function');
    });

    it('should return existing breaker for same name', () => {
      const action1 = vi.fn().mockResolvedValue('result1');
      const action2 = vi.fn().mockResolvedValue('result2');

      const breaker1 = service.create({ name: 'same-service' }, action1);
      const breaker2 = service.create({ name: 'same-service' }, action2);

      expect(breaker1).toBe(breaker2);
    });

    it('should create different breakers for different names', () => {
      const action = vi.fn().mockResolvedValue('result');

      const breaker1 = service.create({ name: 'service-1' }, action);
      const breaker2 = service.create({ name: 'service-2' }, action);

      expect(breaker1).not.toBe(breaker2);
    });
  });

  describe('getOrCreate', () => {
    it('should behave like create', () => {
      const action = vi.fn().mockResolvedValue('result');

      const breaker1 = service.getOrCreate({ name: 'test' }, action);
      const breaker2 = service.getOrCreate({ name: 'test' }, action);

      expect(breaker1).toBe(breaker2);
    });
  });

  describe('fire', () => {
    it('should execute the action and return result', async () => {
      const action = vi.fn().mockResolvedValue('success');
      const breaker = service.create({ name: 'test' }, action);

      const result = await breaker.fire();

      expect(result).toBe('success');
      expect(action).toHaveBeenCalled();
    });

    it('should throw when action fails', async () => {
      const action = vi.fn().mockRejectedValue(new Error('fail'));
      const breaker = service.create({ name: 'test', volumeThreshold: 1 }, action);

      await expect(breaker.fire()).rejects.toThrow('fail');
    });

    it('should use fallback when provided', async () => {
      const action = vi.fn().mockRejectedValue(new Error('fail'));
      const fallback = vi.fn().mockReturnValue('fallback-result');
      const breaker = service.create(
        { name: 'test-fallback', volumeThreshold: 1 },
        action,
        fallback,
      );

      // Trip the circuit with failures
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.fire();
        } catch {
          // Expected
        }
      }

      // Circuit should be open now, fallback should be used
      const result = await breaker.fire();
      expect(result).toBe('fallback-result');
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return empty array when no breakers exist', () => {
      const stats = service.getStats();
      expect(stats).toEqual([]);
    });

    it('should return stats for all breakers', async () => {
      const action1 = vi.fn().mockResolvedValue('result1');
      const action2 = vi.fn().mockResolvedValue('result2');

      service.create({ name: 'service-1' }, action1);
      service.create({ name: 'service-2' }, action2);

      const stats = service.getStats();

      expect(stats).toHaveLength(2);
      expect(stats.map((s) => s.name).sort()).toEqual(['service-1', 'service-2']);
    });

    it('should track success counts', async () => {
      const action = vi.fn().mockResolvedValue('result');
      const breaker = service.create({ name: 'counted-service' }, action);

      await breaker.fire();
      await breaker.fire();
      await breaker.fire();

      const stats = service.getStats();
      const stat = stats.find((s) => s.name === 'counted-service');

      expect(stat?.successes).toBe(3);
      expect(stat?.failures).toBe(0);
      expect(stat?.state).toBe('closed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should shutdown all breakers', () => {
      const action = vi.fn().mockResolvedValue('result');

      service.create({ name: 'service-1' }, action);
      service.create({ name: 'service-2' }, action);

      expect(service.getStats()).toHaveLength(2);

      service.onModuleDestroy();

      expect(service.getStats()).toHaveLength(0);
    });
  });
});
