/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
// ThrottlerStorageRecord is not re-exported from the package root in v6, so it
// is imported from its declaring module (the package has no exports map, so the
// deep import is permitted).
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface.js';
import Redis from 'ioredis';

/**
 * Distributed rate-limit storage backed by Redis.
 *
 * @remarks
 * The default {@link ThrottlerStorage} keeps counters in process memory, so with
 * N gateway replicas behind a load balancer the effective limit becomes N× the
 * configured value and every restart resets the counters. This implementation
 * keeps the counters in Redis so all replicas share a single, durable view.
 *
 * The increment is performed by a single Lua script so the read-modify-write is
 * atomic even under concurrent requests from different replicas.
 *
 * **Failure policy:** by default this storage *fails open* — if Redis is
 * unreachable, requests are allowed through (rate limiting is effectively
 * disabled) rather than rejecting all traffic. This favours availability for an
 * edge gateway; set `failOpen: false` to fail closed instead.
 */
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly redis: Redis;
  private readonly failOpen: boolean;

  /**
   * Atomic increment: bumps the hit counter, (re)applies the TTL on first hit,
   * and sets a block marker once the limit is exceeded.
   *
   * KEYS[1] = hit counter key, KEYS[2] = block marker key
   * ARGV[1] = ttl (ms), ARGV[2] = limit, ARGV[3] = blockDuration (ms)
   * Returns: { totalHits, timeToExpire, isBlocked (0|1), timeToBlockExpire }
   */
  private static readonly INCREMENT_SCRIPT = `
    local hitKey = KEYS[1]
    local blockKey = KEYS[2]
    local ttl = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local blockDuration = tonumber(ARGV[3])

    local totalHits = redis.call('INCR', hitKey)
    local timeToExpire = redis.call('PTTL', hitKey)
    if timeToExpire <= 0 then
      redis.call('PEXPIRE', hitKey, ttl)
      timeToExpire = ttl
    end

    local isBlocked = redis.call('GET', blockKey)
    local timeToBlockExpire = 0
    if isBlocked then
      timeToBlockExpire = redis.call('PTTL', blockKey)
    else
      if totalHits > limit then
        redis.call('SET', blockKey, '1', 'PX', blockDuration)
        isBlocked = '1'
        timeToBlockExpire = blockDuration
      end
    end

    return { totalHits, timeToExpire, isBlocked and 1 or 0, timeToBlockExpire }
  `;

  constructor(redisUrl: string, options: { failOpen?: boolean } = {}) {
    this.failOpen = options.failOpen ?? true;
    this.redis = new Redis(redisUrl, {
      // Don't crash the process on transient connection issues; the increment
      // path already degrades gracefully via the fail-open policy.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
    });

    this.redis.on('error', (err: Error) => {
      // Avoid log spam: connection errors are expected during Redis outages and
      // are handled by the fail-open policy in increment().
      this.logger.warn(`Redis throttler storage connection error: ${err.message}`);
    });
  }

  /**
   * Increment the request counter for a key and report the current throttle state.
   *
   * @param key - Unique tracker key (IP/route combination) supplied by the guard
   * @param ttl - Window length in milliseconds
   * @param limit - Maximum requests allowed within the window
   * @param blockDuration - How long to block once the limit is exceeded (ms)
   * @param throttlerName - Name of the throttler definition (default/strict)
   * @returns The throttle record used by ThrottlerGuard to allow or reject
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:${throttlerName}:${key}:blocked`;

    try {
      const result = (await this.redis.eval(
        RedisThrottlerStorage.INCREMENT_SCRIPT,
        2,
        hitKey,
        blockKey,
        ttl.toString(),
        limit.toString(),
        blockDuration.toString(),
      )) as [number, number, number, number];

      const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = result;
      return {
        totalHits,
        timeToExpire: Math.ceil(timeToExpire / 1000),
        isBlocked: isBlocked === 1,
        timeToBlockExpire: Math.ceil(timeToBlockExpire / 1000),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.failOpen) {
        this.logger.warn(
          `Redis throttler unavailable, failing open (allowing request): ${message}`,
        );
        // Report a fresh window with no hits so the guard lets the request pass.
        return {
          totalHits: 0,
          timeToExpire: Math.ceil(ttl / 1000),
          isBlocked: false,
          timeToBlockExpire: 0,
        };
      }
      this.logger.error(`Redis throttler unavailable, failing closed: ${message}`);
      // Report the request as over-limit and blocked so the guard rejects it.
      return {
        totalHits: limit + 1,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockDuration / 1000),
      };
    }
  }

  /**
   * Close the Redis connection when the module is torn down.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
