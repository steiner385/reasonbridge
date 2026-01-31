import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { config, getStages, getThresholds } from '../lib/config.js';
import { authenticate, authHeaders, randomContent, checkResponse } from '../lib/utils.js';

/**
 * Full User Journey Load Test
 *
 * Simulates realistic user behavior including:
 * 1. Browse topics (unauthenticated)
 * 2. Login
 * 3. View topic details
 * 4. Read responses
 * 5. Post a response
 * 6. View profile
 *
 * This test validates the entire user experience under load.
 *
 * Usage:
 *   k6 run scenarios/user-journey.js
 *   k6 run -e TEST_TYPE=soak scenarios/user-journey.js
 */

export const options = {
  stages: getStages(),
  thresholds: getThresholds({
    'group_duration{group:::Browse Topics}': ['p(95)<2000'],
    'group_duration{group:::User Session}': ['p(95)<5000'],
    'http_req_failed': ['rate<0.05'], // Allow 5% failure for full journey
  }),
};

export default function () {
  let authToken = null;

  // Phase 1: Anonymous browsing
  group('Browse Topics', function () {
    // Land on homepage / topics list
    const listRes = http.get(`${config.baseUrl}/api/topics?page=1&limit=10`, {
      tags: { name: 'journey-topics-list' },
    });

    check(listRes, {
      'topics list loaded': (r) => r.status === 200,
    });

    sleep(2 + Math.random() * 3); // User reads the list

    // Click on a topic
    let topicId = null;
    try {
      const topics = JSON.parse(listRes.body);
      const topicList = topics.data || topics.topics || topics;
      if (Array.isArray(topicList) && topicList.length > 0) {
        topicId = topicList[Math.floor(Math.random() * topicList.length)].id;

        const detailRes = http.get(`${config.baseUrl}/api/topics/${topicId}`, {
          tags: { name: 'journey-topic-detail' },
        });

        check(detailRes, {
          'topic detail loaded': (r) => r.status === 200,
        });

        sleep(3 + Math.random() * 5); // User reads the topic
      }
    } catch {
      // Continue without topic
    }

    // View responses on the topic
    if (topicId) {
      const responsesRes = http.get(`${config.baseUrl}/api/topics/${topicId}/responses?page=1&limit=20`, {
        tags: { name: 'journey-responses-list' },
      });

      check(responsesRes, {
        'responses loaded': (r) => r.status === 200 || r.status === 404,
      });

      sleep(2 + Math.random() * 4); // User reads responses
    }
  });

  // Phase 2: User decides to participate (login)
  group('User Session', function () {
    // Login
    const loginRes = http.post(
      `${config.baseUrl}/api/auth/login`,
      JSON.stringify({
        email: config.testUser.email,
        password: config.testUser.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'journey-login' },
      },
    );

    if (loginRes.status === 200) {
      try {
        const tokens = JSON.parse(loginRes.body);
        authToken = tokens.accessToken;
      } catch {
        // Continue without auth
      }
    }

    check(loginRes, {
      'login successful': (r) => r.status === 200,
    });

    sleep(1);

    if (authToken) {
      // View own profile
      const profileRes = http.get(`${config.baseUrl}/api/users/me`, {
        headers: authHeaders(authToken),
        tags: { name: 'journey-profile' },
      });

      check(profileRes, {
        'profile loaded': (r) => r.status === 200,
      });

      sleep(1 + Math.random() * 2);

      // Maybe post a response (30% chance)
      if (Math.random() < 0.3) {
        // Get a topic to respond to
        const topicsRes = http.get(`${config.baseUrl}/api/topics?page=1&limit=5`, {
          headers: authHeaders(authToken),
          tags: { name: 'journey-topics-for-response' },
        });

        try {
          const topics = JSON.parse(topicsRes.body);
          const topicList = topics.data || topics.topics || topics;
          if (Array.isArray(topicList) && topicList.length > 0) {
            const topicId = topicList[0].id;

            sleep(2 + Math.random() * 3); // User thinks about response

            const responseData = {
              content: randomContent(30, 100),
              topicId: topicId,
            };

            const postRes = http.post(
              `${config.baseUrl}/api/topics/${topicId}/responses`,
              JSON.stringify(responseData),
              {
                headers: authHeaders(authToken),
                tags: { name: 'journey-post-response' },
              },
            );

            check(postRes, {
              'response posted': (r) => r.status === 201 || r.status === 200,
            });

            sleep(1);
          }
        } catch {
          // Ignore
        }
      }

      // View notifications (if endpoint exists)
      const notifRes = http.get(`${config.baseUrl}/api/notifications`, {
        headers: authHeaders(authToken),
        tags: { name: 'journey-notifications' },
      });

      check(notifRes, {
        'notifications checked': (r) => r.status === 200 || r.status === 404 || r.status === 401,
      });
    }
  });

  // Phase 3: User browses more before leaving
  group('Final Browse', function () {
    // Search for something
    const searchTerms = ['climate', 'economy', 'health', 'technology', 'politics'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    const searchRes = http.get(`${config.baseUrl}/api/topics/search?q=${term}`, {
      tags: { name: 'journey-search' },
    });

    check(searchRes, {
      'search completed': (r) => r.status === 200 || r.status === 404,
    });

    sleep(2 + Math.random() * 3);

    // View one more topic
    const finalTopicsRes = http.get(`${config.baseUrl}/api/topics?page=2&limit=5`, {
      tags: { name: 'journey-final-browse' },
    });

    check(finalTopicsRes, {
      'final browse completed': (r) => r.status === 200,
    });

    sleep(1 + Math.random() * 2);
  });

  // Think time before next iteration
  sleep(5 + Math.random() * 10);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'user-journey-summary.json': JSON.stringify(data),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
