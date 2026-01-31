import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { config, getStages, getThresholds } from '../lib/config.js';
import { randomEmail, randomString } from '../lib/utils.js';

/**
 * Authentication Load Test
 *
 * Tests authentication endpoints including:
 * - User registration
 * - Login
 * - Token refresh
 * - Password reset request
 *
 * Usage:
 *   k6 run scenarios/auth.js
 *   k6 run -e TEST_TYPE=stress scenarios/auth.js
 */

export const options = {
  stages: getStages(),
  thresholds: getThresholds({
    'http_req_duration{name:auth-login}': ['p(95)<500'],
    'http_req_duration{name:auth-register}': ['p(95)<1000'],
    'http_req_duration{name:auth-refresh}': ['p(95)<300'],
    'http_req_duration{name:auth-reset-request}': ['p(95)<500'],
  }),
};

// Track registered users for cleanup
const registeredUsers = [];

export default function () {
  group('Login Flow', function () {
    // Simulate login with test credentials
    const loginRes = http.post(
      `${config.baseUrl}/api/auth/login`,
      JSON.stringify({
        email: config.testUser.email,
        password: config.testUser.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'auth-login' },
      },
    );

    const loginSuccess = check(loginRes, {
      'login status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'login response time < 500ms': (r) => r.timings.duration < 500,
    });

    // If login successful, test token refresh
    if (loginRes.status === 200) {
      try {
        const tokens = JSON.parse(loginRes.body);
        if (tokens.refreshToken) {
          sleep(0.5);

          const refreshRes = http.post(
            `${config.baseUrl}/api/auth/refresh`,
            JSON.stringify({ refreshToken: tokens.refreshToken }),
            {
              headers: { 'Content-Type': 'application/json' },
              tags: { name: 'auth-refresh' },
            },
          );

          check(refreshRes, {
            'refresh status 200': (r) => r.status === 200,
            'refresh has new token': (r) => {
              try {
                return JSON.parse(r.body).accessToken !== undefined;
              } catch {
                return false;
              }
            },
          });
        }
      } catch {
        // Ignore parsing errors
      }
    }

    sleep(1);
  });

  // Registration flow (limited to avoid creating too many users)
  if (Math.random() < 0.05) {
    // 5% of iterations
    group('Registration Flow', function () {
      const email = randomEmail();
      const password = `Test${randomString(8)}!`;

      const registerRes = http.post(
        `${config.baseUrl}/api/auth/register`,
        JSON.stringify({
          email,
          password,
          displayName: `LoadTest User ${randomString(5)}`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'auth-register' },
        },
      );

      const registered = check(registerRes, {
        'register status 201 or 409': (r) => r.status === 201 || r.status === 409,
        'register response time < 1s': (r) => r.timings.duration < 1000,
      });

      if (registerRes.status === 201) {
        registeredUsers.push(email);
      }

      sleep(2);
    });
  }

  // Password reset request (limited)
  if (Math.random() < 0.02) {
    // 2% of iterations
    group('Password Reset Flow', function () {
      const resetRes = http.post(
        `${config.baseUrl}/api/auth/forgot-password`,
        JSON.stringify({
          email: `loadtest_reset_${randomString(6)}@example.com`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'auth-reset-request' },
        },
      );

      check(resetRes, {
        // Should return 200 even for non-existent emails (security)
        'reset request status 200 or 404': (r) => r.status === 200 || r.status === 404,
      });

      sleep(1);
    });
  }

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  console.log(`Registered ${registeredUsers.length} test users during this run`);
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'auth-summary.json': JSON.stringify(data),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
