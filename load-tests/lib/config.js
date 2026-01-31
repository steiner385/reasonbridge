/**
 * k6 Load Test Configuration
 *
 * Centralized configuration for all load test scenarios.
 * Environment variables can override defaults.
 */

export const config = {
  // Base URLs for services
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  userServiceUrl: __ENV.USER_SERVICE_URL || 'http://localhost:3001',
  discussionServiceUrl: __ENV.DISCUSSION_SERVICE_URL || 'http://localhost:3007',
  aiServiceUrl: __ENV.AI_SERVICE_URL || 'http://localhost:3002',

  // Test user credentials (for authenticated endpoints)
  testUser: {
    email: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
    password: __ENV.TEST_USER_PASSWORD || 'LoadTest123!',
  },

  // Default thresholds
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'], // Less than 1% failure rate
    http_reqs: ['rate>100'], // At least 100 requests/second
  },

  // Stage presets for different test types
  stages: {
    smoke: [
      { duration: '1m', target: 5 }, // Ramp up to 5 users
      { duration: '2m', target: 5 }, // Hold at 5 users
      { duration: '1m', target: 0 }, // Ramp down
    ],
    load: [
      { duration: '2m', target: 50 }, // Ramp up to 50 users
      { duration: '5m', target: 50 }, // Hold at 50 users
      { duration: '2m', target: 100 }, // Ramp up to 100 users
      { duration: '5m', target: 100 }, // Hold at 100 users
      { duration: '2m', target: 0 }, // Ramp down
    ],
    stress: [
      { duration: '2m', target: 100 }, // Ramp up to 100 users
      { duration: '5m', target: 100 }, // Hold
      { duration: '2m', target: 200 }, // Ramp up to 200 users
      { duration: '5m', target: 200 }, // Hold
      { duration: '2m', target: 500 }, // Ramp up to 500 users
      { duration: '5m', target: 500 }, // Hold
      { duration: '5m', target: 0 }, // Ramp down
    ],
    spike: [
      { duration: '30s', target: 10 }, // Warm up
      { duration: '1m', target: 500 }, // Spike to 500 users
      { duration: '30s', target: 500 }, // Hold briefly
      { duration: '1m', target: 10 }, // Scale down
      { duration: '2m', target: 10 }, // Recovery period
      { duration: '30s', target: 0 }, // Ramp down
    ],
    soak: [
      { duration: '5m', target: 200 }, // Ramp up
      { duration: '4h', target: 200 }, // Hold for 4 hours
      { duration: '5m', target: 0 }, // Ramp down
    ],
  },
};

/**
 * Get stages based on test type from environment
 */
export function getStages() {
  const testType = __ENV.TEST_TYPE || 'smoke';
  return config.stages[testType] || config.stages.smoke;
}

/**
 * Get thresholds with optional customization
 */
export function getThresholds(customThresholds = {}) {
  return { ...config.thresholds, ...customThresholds };
}
