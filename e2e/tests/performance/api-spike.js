/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * k6 Spike Test Script for reasonBridge API
 *
 * Tests system behavior under sudden extreme load spikes
 * Validates recovery after spike subsides
 *
 * Usage:
 *   k6 run e2e/tests/performance/api-spike.js
 *   k6 run --env BASE_URL=http://localhost:3000 e2e/tests/performance/api-spike.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const spikeLatency = new Trend('spike_latency', true);
const recoveryLatency = new Trend('recovery_latency', true);
const requestCount = new Counter('requests');

// Test configuration - Spike pattern
export const options = {
  stages: [
    // Baseline: normal load (100 users) for 1 minute
    { duration: '1m', target: 100 },

    // Spike 1: sudden jump to 2000 users in 10 seconds
    { duration: '10s', target: 2000 },
    // Hold spike for 30 seconds
    { duration: '30s', target: 2000 },
    // Quick drop back to baseline
    { duration: '10s', target: 100 },

    // Recovery period: hold baseline for 1 minute
    { duration: '1m', target: 100 },

    // Spike 2: extreme spike to 5000 users in 10 seconds
    { duration: '10s', target: 5000 },
    // Hold extreme spike for 30 seconds
    { duration: '30s', target: 5000 },
    // Drop back to baseline
    { duration: '10s', target: 100 },

    // Final recovery period
    { duration: '1m', target: 100 },

    // Ramp down
    { duration: '30s', target: 0 },
  ],

  // Spike test thresholds - more lenient during spikes
  thresholds: {
    // 95th percentile can be higher during spikes
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Allow slightly higher error rate during spikes (2%)
    errors: ['rate<0.02'],
    // Recovery latency should return to normal
    recovery_latency: ['p(95)<200'],
  },

  tags: {
    testType: 'spike',
  },

  // Shorter graceful periods for spike tests
  gracefulStop: '10s',
  gracefulRampDown: '10s',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// Track which phase we're in
let currentPhase = 'baseline';

export function setup() {
  const healthRes = http.get(`${BASE_URL}/health`, { headers });

  if (healthRes.status !== 200) {
    throw new Error('API health check failed - aborting spike test');
  }

  console.log(`Spike test starting against ${BASE_URL}`);

  return {
    baseUrl: BASE_URL,
    startTime: new Date().toISOString(),
  };
}

export default function (data) {
  const baseUrl = data.baseUrl;

  // Determine current phase based on VU count
  const vuCount = __VU;
  if (vuCount > 2000) {
    currentPhase = 'extreme_spike';
  } else if (vuCount > 500) {
    currentPhase = 'spike';
  } else {
    currentPhase = 'baseline';
  }

  // Critical path: Topics listing
  group('Topics Under Spike', () => {
    const start = Date.now();
    const res = http.get(`${baseUrl}/api/topics?page=1&limit=10`, {
      headers,
      tags: { endpoint: 'topics', phase: currentPhase },
    });

    const latency = Date.now() - start;

    // Track latency based on phase
    if (currentPhase === 'baseline') {
      recoveryLatency.add(latency);
    } else {
      spikeLatency.add(latency);
    }

    requestCount.add(1);

    const success = check(
      res,
      {
        'status is 200 or 401 or 429': (r) => [200, 401, 429].includes(r.status),
        'response received': (r) => r.body !== null,
      },
      { phase: currentPhase }
    );

    // 429 (rate limited) during spike is acceptable
    if (res.status === 429) {
      errorRate.add(false); // Not counted as error
    } else {
      errorRate.add(!success);
    }
  });

  sleep(0.1);

  // Health check - should remain responsive even during spike
  group('Health Under Spike', () => {
    const res = http.get(`${baseUrl}/health`, {
      headers,
      tags: { endpoint: 'health', phase: currentPhase },
      timeout: '5s', // Short timeout for health checks
    });

    requestCount.add(1);

    const success = check(
      res,
      {
        'health endpoint responsive': (r) => r.status === 200,
        'health response time < 500ms': (r) => r.timings.duration < 500,
      },
      { phase: currentPhase }
    );

    errorRate.add(!success);
  });

  // Minimal think time during spike tests
  sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds
}

export function teardown(data) {
  console.log(`Spike test completed. Started at: ${data.startTime}`);
  console.log(`Tested against: ${data.baseUrl}`);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testType: 'spike',
    baseUrl: BASE_URL,
    metrics: {
      http_req_duration: {
        avg: data.metrics.http_req_duration?.values?.avg,
        p95: data.metrics.http_req_duration?.values?.['p(95)'],
        p99: data.metrics.http_req_duration?.values?.['p(99)'],
        max: data.metrics.http_req_duration?.values?.max,
      },
      spike_latency: {
        avg: data.metrics.spike_latency?.values?.avg,
        p95: data.metrics.spike_latency?.values?.['p(95)'],
        max: data.metrics.spike_latency?.values?.max,
      },
      recovery_latency: {
        avg: data.metrics.recovery_latency?.values?.avg,
        p95: data.metrics.recovery_latency?.values?.['p(95)'],
        max: data.metrics.recovery_latency?.values?.max,
      },
      errors: {
        rate: data.metrics.errors?.values?.rate,
      },
      requests: {
        total: data.metrics.requests?.values?.count,
      },
    },
    analysis: {
      recoveredFromSpike:
        (data.metrics.recovery_latency?.values?.['p(95)'] || 0) < 200,
      maxLatencyDuringSpike: data.metrics.spike_latency?.values?.max,
    },
  };

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'e2e/tests/performance/results/spike-test-summary.json': JSON.stringify(summary, null, 2),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
