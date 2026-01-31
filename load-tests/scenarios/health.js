import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, getStages, getThresholds } from '../lib/config.js';

/**
 * Health Check Load Test
 *
 * Tests the health endpoints of all services to ensure
 * basic availability under load.
 *
 * Usage:
 *   k6 run scenarios/health.js
 *   k6 run -e TEST_TYPE=load scenarios/health.js
 */

export const options = {
  stages: getStages(),
  thresholds: getThresholds({
    'http_req_duration{name:health-gateway}': ['p(95)<100'],
    'http_req_duration{name:health-user}': ['p(95)<100'],
    'http_req_duration{name:health-discussion}': ['p(95)<100'],
  }),
};

export default function () {
  // API Gateway health check
  const gatewayRes = http.get(`${config.baseUrl}/health`, {
    tags: { name: 'health-gateway' },
  });
  check(gatewayRes, {
    'gateway health status 200': (r) => r.status === 200,
    'gateway health response < 100ms': (r) => r.timings.duration < 100,
  });

  // User service health check
  const userRes = http.get(`${config.userServiceUrl}/health`, {
    tags: { name: 'health-user' },
  });
  check(userRes, {
    'user service health status 200': (r) => r.status === 200,
    'user service health response < 100ms': (r) => r.timings.duration < 100,
  });

  // Discussion service health check
  const discussionRes = http.get(`${config.discussionServiceUrl}/health`, {
    tags: { name: 'health-discussion' },
  });
  check(discussionRes, {
    'discussion service health status 200': (r) => r.status === 200,
    'discussion service health response < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'health-summary.json': JSON.stringify(data),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
