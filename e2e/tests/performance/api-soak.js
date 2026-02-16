/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * k6 Soak Test Script for reasonBridge API
 *
 * Extended duration test to detect:
 * - Memory leaks
 * - Resource exhaustion
 * - Performance degradation over time
 * - Connection pool issues
 *
 * Usage:
 *   k6 run e2e/tests/performance/api-soak.js
 *   k6 run --env BASE_URL=http://localhost:3000 --env DURATION=4h e2e/tests/performance/api-soak.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics for soak test analysis
const errorRate = new Rate('errors');
const latencyTrend = new Trend('latency_over_time', true);
const memoryIndicator = new Gauge('memory_pressure_indicator');
const requestCount = new Counter('requests');
const degradationCounter = new Counter('degradation_events');

// Configurable duration via environment variable
const SOAK_DURATION = __ENV.DURATION || '1h';

// Test configuration - Sustained load over extended period
export const options = {
  stages: [
    // Ramp up to target load over 5 minutes
    { duration: '5m', target: 500 },
    // Sustained load for configured duration (default 1 hour)
    { duration: SOAK_DURATION, target: 500 },
    // Ramp down over 5 minutes
    { duration: '5m', target: 0 },
  ],

  // Soak test thresholds - focus on consistency over time
  thresholds: {
    // Response times should remain consistent
    http_req_duration: ['p(95)<200', 'p(99)<400', 'avg<100'],
    // Very low error rate for soak tests
    errors: ['rate<0.001'], // Less than 0.1%
    // No significant degradation events
    degradation_events: ['count<10'],
    // Latency should not increase significantly over time
    latency_over_time: ['p(95)<250'],
  },

  tags: {
    testType: 'soak',
  },

  // Longer graceful periods for soak tests
  gracefulStop: '60s',
  gracefulRampDown: '60s',

  // Batch requests to reduce overhead
  batch: 10,
  batchPerHost: 5,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// Track baseline latency for degradation detection
let baselineLatency = null;
let sampleCount = 0;
const BASELINE_SAMPLES = 100;
const DEGRADATION_THRESHOLD = 1.5; // 50% increase triggers degradation event

export function setup() {
  const healthRes = http.get(`${BASE_URL}/health`, { headers });

  if (healthRes.status !== 200) {
    throw new Error('API health check failed - aborting soak test');
  }

  console.log(`Soak test starting against ${BASE_URL}`);
  console.log(`Duration: ${SOAK_DURATION}`);

  return {
    baseUrl: BASE_URL,
    startTime: new Date().toISOString(),
    duration: SOAK_DURATION,
  };
}

export default function (data) {
  const baseUrl = data.baseUrl;
  const iteration = __ITER;

  // Primary endpoint: Topics listing
  group('Topics Soak', () => {
    const start = Date.now();
    const res = http.get(`${baseUrl}/api/topics?page=1&limit=20`, {
      headers,
      tags: { endpoint: 'topics' },
    });

    const latency = Date.now() - start;
    latencyTrend.add(latency);
    requestCount.add(1);

    // Establish baseline from first N samples
    if (sampleCount < BASELINE_SAMPLES) {
      if (baselineLatency === null) {
        baselineLatency = latency;
      } else {
        baselineLatency = (baselineLatency * sampleCount + latency) / (sampleCount + 1);
      }
      sampleCount++;
    } else if (baselineLatency !== null) {
      // Check for degradation after baseline is established
      if (latency > baselineLatency * DEGRADATION_THRESHOLD) {
        degradationCounter.add(1);
      }
    }

    const success = check(res, {
      'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'response time acceptable': (r) => r.timings.duration < 400,
      'no timeout': (r) => r.timings.duration < 10000,
    });

    errorRate.add(!success);
  });

  sleep(0.5);

  // Secondary endpoint: User profile
  group('Users Soak', () => {
    const start = Date.now();
    const res = http.get(`${baseUrl}/api/users/me`, {
      headers,
      tags: { endpoint: 'users' },
    });

    const latency = Date.now() - start;
    latencyTrend.add(latency);
    requestCount.add(1);

    const success = check(res, {
      'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'response time acceptable': (r) => r.timings.duration < 400,
    });

    errorRate.add(!success);
  });

  sleep(0.5);

  // Health check - monitor system health during soak
  if (iteration % 10 === 0) {
    // Every 10th iteration
    group('Health Monitoring', () => {
      const res = http.get(`${baseUrl}/health`, {
        headers,
        tags: { endpoint: 'health' },
      });

      requestCount.add(1);

      // Use response time as a proxy for system health
      // Higher health check times may indicate memory pressure
      const healthLatency = res.timings.duration;
      if (healthLatency > 100) {
        memoryIndicator.add(healthLatency / 100); // Normalized indicator
      } else {
        memoryIndicator.add(1); // Healthy baseline
      }

      const success = check(res, {
        'health endpoint healthy': (r) => r.status === 200,
        'health response fast': (r) => r.timings.duration < 100,
      });

      errorRate.add(!success);
    });
  }

  // Simulate realistic user behavior with think time
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

export function teardown(data) {
  console.log(`Soak test completed. Started at: ${data.startTime}`);
  console.log(`Duration: ${data.duration}`);
  console.log(`Baseline latency established: ${baselineLatency?.toFixed(2)}ms`);
}

export function handleSummary(data) {
  // Calculate latency trend over time
  const latencyStart = data.metrics.latency_over_time?.values?.min || 0;
  const latencyEnd = data.metrics.latency_over_time?.values?.max || 0;
  const latencyIncrease = latencyEnd > 0 ? ((latencyEnd - latencyStart) / latencyStart) * 100 : 0;

  const summary = {
    timestamp: new Date().toISOString(),
    testType: 'soak',
    baseUrl: BASE_URL,
    duration: SOAK_DURATION,
    metrics: {
      http_req_duration: {
        avg: data.metrics.http_req_duration?.values?.avg,
        p95: data.metrics.http_req_duration?.values?.['p(95)'],
        p99: data.metrics.http_req_duration?.values?.['p(99)'],
        max: data.metrics.http_req_duration?.values?.max,
        min: data.metrics.http_req_duration?.values?.min,
      },
      errors: {
        rate: data.metrics.errors?.values?.rate,
        total: data.metrics.errors?.values?.fails,
      },
      requests: {
        total: data.metrics.requests?.values?.count,
        rate: data.metrics.http_reqs?.values?.rate,
      },
      degradation: {
        events: data.metrics.degradation_events?.values?.count || 0,
        latencyIncreasePercent: latencyIncrease.toFixed(2),
      },
    },
    analysis: {
      memoryLeakIndicator: latencyIncrease > 50, // >50% increase suggests leak
      performanceDegraded: (data.metrics.degradation_events?.values?.count || 0) > 10,
      stablePerformance:
        (data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 200 &&
        (data.metrics.errors?.values?.rate || 0) < 0.001,
    },
    recommendations: [],
  };

  // Add recommendations based on results
  if (summary.analysis.memoryLeakIndicator) {
    summary.recommendations.push(
      'Potential memory leak detected: latency increased significantly over time'
    );
  }
  if (summary.analysis.performanceDegraded) {
    summary.recommendations.push(
      'Performance degradation detected: multiple degradation events recorded'
    );
  }
  if (!summary.analysis.stablePerformance) {
    summary.recommendations.push(
      'System did not maintain stable performance during soak test'
    );
  }
  if (summary.recommendations.length === 0) {
    summary.recommendations.push('System performed well during extended load test');
  }

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'e2e/tests/performance/results/soak-test-summary.json': JSON.stringify(summary, null, 2),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
