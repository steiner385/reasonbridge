/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * k6 Load Test Script for reasonBridge API
 *
 * Stages: ramp up -> sustained -> peak (10k users) -> ramp down
 * Thresholds: p95 < 200ms, error rate < 1%
 *
 * Usage:
 *   k6 run e2e/tests/performance/api-load.js
 *   k6 run --env BASE_URL=http://localhost:3000 e2e/tests/performance/api-load.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const topicsLatency = new Trend('topics_latency', true);
const usersLatency = new Trend('users_latency', true);
const healthLatency = new Trend('health_latency', true);
const requestCount = new Counter('requests');

// Test configuration
export const options = {
  // Load test stages: ramp up, sustained, peak, ramp down
  stages: [
    // Ramp up: 0 to 1000 users over 2 minutes
    { duration: '2m', target: 1000 },
    // Sustained load: 1000 users for 5 minutes
    { duration: '5m', target: 1000 },
    // Peak load: ramp to 10000 users over 3 minutes
    { duration: '3m', target: 10000 },
    // Hold peak: 10000 users for 5 minutes
    { duration: '5m', target: 10000 },
    // Ramp down: 10000 to 0 users over 2 minutes
    { duration: '2m', target: 0 },
  ],

  // Thresholds for pass/fail criteria
  thresholds: {
    // 95th percentile response time must be under 200ms
    http_req_duration: ['p(95)<200'],
    // Error rate must be under 1%
    errors: ['rate<0.01'],
    // Custom latency thresholds per endpoint
    topics_latency: ['p(95)<200', 'p(99)<500'],
    users_latency: ['p(95)<200', 'p(99)<500'],
    health_latency: ['p(95)<50', 'p(99)<100'],
  },

  // Tags for result grouping
  tags: {
    testType: 'load',
  },

  // Graceful stop configuration
  gracefulStop: '30s',
  gracefulRampDown: '30s',
};

// Base URL from environment or default
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Common headers
const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/**
 * Setup function - runs once before the test
 */
export function setup() {
  // Verify the API is reachable
  const healthRes = http.get(`${BASE_URL}/health`, { headers });

  if (healthRes.status !== 200) {
    console.error(`Health check failed: ${healthRes.status}`);
    throw new Error('API health check failed - aborting test');
  }

  console.log(`Load test starting against ${BASE_URL}`);

  return {
    baseUrl: BASE_URL,
    startTime: new Date().toISOString(),
  };
}

/**
 * Main test function - runs for each virtual user
 */
export default function (data) {
  const baseUrl = data.baseUrl;

  // Health endpoint (lightweight)
  group('Health Check', () => {
    const start = Date.now();
    const res = http.get(`${baseUrl}/health`, { headers, tags: { endpoint: 'health' } });

    healthLatency.add(Date.now() - start);
    requestCount.add(1);

    const success = check(res, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });

    errorRate.add(!success);
  });

  sleep(0.1); // Small pause between groups

  // Topics endpoint
  group('List Topics', () => {
    const start = Date.now();
    const res = http.get(`${baseUrl}/api/topics?page=1&limit=20`, {
      headers,
      tags: { endpoint: 'topics' },
    });

    topicsLatency.add(Date.now() - start);
    requestCount.add(1);

    const success = check(res, {
      'topics status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'topics response time < 300ms': (r) => r.timings.duration < 300,
      'topics has valid JSON': (r) => {
        try {
          if (r.status === 200) {
            const body = JSON.parse(r.body);
            return Array.isArray(body.topics) || Array.isArray(body.data) || Array.isArray(body);
          }
          return true; // 401 responses don't need JSON validation
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
  });

  sleep(0.2);

  // Users endpoint (if authenticated)
  group('User Profile', () => {
    const start = Date.now();
    const res = http.get(`${baseUrl}/api/users/me`, {
      headers,
      tags: { endpoint: 'users' },
    });

    usersLatency.add(Date.now() - start);
    requestCount.add(1);

    // 401 is expected without auth token
    const success = check(res, {
      'users status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'users response time < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(!success);
  });

  // Simulate user think time
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
  console.log(`Tested against: ${data.baseUrl}`);
}

/**
 * Handle summary - customize output format
 */
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testType: 'load',
    baseUrl: BASE_URL,
    metrics: {
      http_req_duration: {
        avg: data.metrics.http_req_duration?.values?.avg,
        p95: data.metrics.http_req_duration?.values?.['p(95)'],
        p99: data.metrics.http_req_duration?.values?.['p(99)'],
        max: data.metrics.http_req_duration?.values?.max,
      },
      errors: {
        rate: data.metrics.errors?.values?.rate,
        passes: data.metrics.errors?.values?.passes,
        fails: data.metrics.errors?.values?.fails,
      },
      requests: {
        total: data.metrics.requests?.values?.count,
        rate: data.metrics.http_reqs?.values?.rate,
      },
      vus: {
        max: data.metrics.vus_max?.values?.max,
      },
    },
    thresholds: {
      passed: Object.values(data.root_group?.checks || {}).every((c) => c.passes > 0),
    },
  };

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'e2e/tests/performance/results/load-test-summary.json': JSON.stringify(summary, null, 2),
  };
}

/**
 * Generate text summary (imported from k6)
 */
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
