import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, getThresholds } from '../lib/config.js';

/**
 * 10,000 Concurrent Users Soak Test
 *
 * This test validates system stability under sustained high load.
 * Designed for production capacity testing.
 *
 * WARNING: This test requires significant resources.
 * Only run on dedicated load testing infrastructure.
 *
 * Recommended infrastructure:
 * - Multiple k6 instances (distributed mode)
 * - Staging/production environment
 * - Monitoring dashboards active
 *
 * Usage:
 *   k6 run scenarios/soak-10k.js
 *   k6 run --out influxdb=http://localhost:8086/k6 scenarios/soak-10k.js
 */

export const options = {
  stages: [
    { duration: '5m', target: 1000 }, // Ramp up to 1,000 users
    { duration: '5m', target: 2500 }, // Ramp up to 2,500 users
    { duration: '5m', target: 5000 }, // Ramp up to 5,000 users
    { duration: '10m', target: 10000 }, // Ramp up to 10,000 users
    { duration: '30m', target: 10000 }, // Hold at 10,000 users
    { duration: '10m', target: 5000 }, // Scale down to 5,000
    { duration: '5m', target: 0 }, // Ramp down to 0
  ],
  thresholds: getThresholds({
    // More lenient thresholds for high load
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
    http_req_failed: ['rate<0.05'], // Less than 5% failure rate at scale
    http_reqs: ['rate>500'], // At least 500 requests/second
    'http_req_duration{name:soak-health}': ['p(95)<500'],
    'http_req_duration{name:soak-topics}': ['p(95)<1500'],
  }),

  // Distributed execution settings
  noConnectionReuse: false,
  userAgent: 'k6-soak-test/1.0',

  // Graceful stop
  gracefulStop: '30s',
  gracefulRampDown: '30s',
};

// Lightweight operations to maximize throughput
const operations = [
  { weight: 40, fn: healthCheck }, // 40% health checks
  { weight: 35, fn: listTopics }, // 35% topic listings
  { weight: 15, fn: viewTopic }, // 15% topic details
  { weight: 10, fn: searchTopics }, // 10% searches
];

// Build weighted selection array
const weightedOps = [];
operations.forEach((op) => {
  for (let i = 0; i < op.weight; i++) {
    weightedOps.push(op.fn);
  }
});

export default function () {
  // Select random operation based on weights
  const operation = weightedOps[Math.floor(Math.random() * weightedOps.length)];
  operation();

  // Minimal sleep to maximize load
  sleep(0.1 + Math.random() * 0.4);
}

function healthCheck() {
  const res = http.get(`${config.baseUrl}/health`, {
    tags: { name: 'soak-health' },
    timeout: '10s',
  });

  check(res, {
    'health check ok': (r) => r.status === 200,
  });
}

function listTopics() {
  const page = Math.floor(Math.random() * 10) + 1;
  const res = http.get(`${config.baseUrl}/api/topics?page=${page}&limit=10`, {
    tags: { name: 'soak-topics' },
    timeout: '10s',
  });

  check(res, {
    'topics list ok': (r) => r.status === 200,
  });
}

function viewTopic() {
  // Use known topic IDs or fetch from list
  const topicIds = ['topic-1', 'topic-2', 'topic-3', 'topic-4', 'topic-5'];
  const topicId = topicIds[Math.floor(Math.random() * topicIds.length)];

  const res = http.get(`${config.baseUrl}/api/topics/${topicId}`, {
    tags: { name: 'soak-topic-detail' },
    timeout: '10s',
  });

  check(res, {
    'topic detail ok': (r) => r.status === 200 || r.status === 404,
  });
}

function searchTopics() {
  const terms = ['discussion', 'debate', 'opinion', 'fact', 'analysis'];
  const term = terms[Math.floor(Math.random() * terms.length)];

  const res = http.get(`${config.baseUrl}/api/topics/search?q=${term}`, {
    tags: { name: 'soak-search' },
    timeout: '10s',
  });

  check(res, {
    'search ok': (r) => r.status === 200 || r.status === 404,
  });
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const failedRequests = data.metrics.http_req_failed
    ? data.metrics.http_req_failed.values.passes
    : 0;
  const avgDuration = data.metrics.http_req_duration
    ? data.metrics.http_req_duration.values.avg
    : 0;

  console.log('\n=== Soak Test Summary ===');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Failed Requests: ${failedRequests}`);
  console.log(`Failure Rate: ${((failedRequests / totalRequests) * 100).toFixed(2)}%`);
  console.log(`Average Response Time: ${avgDuration.toFixed(2)}ms`);
  console.log('=========================\n');

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'soak-10k-summary.json': JSON.stringify(data),
    'soak-10k-summary.html': htmlReport(data),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
