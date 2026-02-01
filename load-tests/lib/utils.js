import http from 'k6/http';
import { check, fail } from 'k6';
import { config } from './config.js';

/**
 * Shared utility functions for k6 load tests
 */

/**
 * Authenticate and get access token
 */
export function authenticate(email = config.testUser.email, password = config.testUser.password) {
  const loginRes = http.post(
    `${config.baseUrl}/api/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'auth-login' },
    },
  );

  const success = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => {
      try {
        return JSON.parse(r.body).accessToken !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    console.error(`Authentication failed: ${loginRes.status} - ${loginRes.body}`);
    return null;
  }

  try {
    return JSON.parse(loginRes.body).accessToken;
  } catch {
    return null;
  }
}

/**
 * Create headers with authentication
 */
export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Generate random string
 */
export function randomString(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random email
 */
export function randomEmail() {
  return `loadtest_${randomString(8)}@example.com`;
}

/**
 * Generate random topic title
 */
export function randomTopicTitle() {
  const adjectives = ['Important', 'Critical', 'Interesting', 'Controversial', 'Novel'];
  const nouns = ['Discussion', 'Debate', 'Analysis', 'Question', 'Topic'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun} ${randomString(6)}`;
}

/**
 * Generate random response content
 */
export function randomContent(minWords = 10, maxWords = 50) {
  const words = [
    'This',
    'is',
    'a',
    'test',
    'response',
    'with',
    'random',
    'content',
    'for',
    'load',
    'testing',
    'purposes',
    'argument',
    'evidence',
    'claim',
    'reason',
    'analysis',
    'perspective',
    'viewpoint',
    'conclusion',
  ];

  const wordCount = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
  let result = [];
  for (let i = 0; i < wordCount; i++) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  return result.join(' ');
}

/**
 * Standard response check
 */
export function checkResponse(response, name, expectedStatus = 200) {
  return check(response, {
    [`${name} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name} response time < 500ms`]: (r) => r.timings.duration < 500,
  });
}

/**
 * Sleep with random jitter
 */
export function randomSleep(min = 1, max = 3) {
  const duration = min + Math.random() * (max - min);
  return __VU > 0 ? sleep(duration) : null;
}

// Import sleep from k6
import { sleep } from 'k6';
