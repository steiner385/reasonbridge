import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { config, getStages, getThresholds } from '../lib/config.js';
import {
  authenticate,
  authHeaders,
  randomTopicTitle,
  randomContent,
  checkResponse,
} from '../lib/utils.js';

/**
 * Topics API Load Test
 *
 * Tests the topics endpoints including:
 * - Listing topics (paginated)
 * - Getting topic details
 * - Creating new topics (authenticated)
 * - Searching topics
 *
 * Usage:
 *   k6 run scenarios/topics.js
 *   k6 run -e TEST_TYPE=stress scenarios/topics.js
 */

export const options = {
  stages: getStages(),
  thresholds: getThresholds({
    'http_req_duration{name:topics-list}': ['p(95)<300'],
    'http_req_duration{name:topics-detail}': ['p(95)<200'],
    'http_req_duration{name:topics-create}': ['p(95)<500'],
    'http_req_duration{name:topics-search}': ['p(95)<400'],
  }),
};

// Shared state for authenticated tests
let authToken = null;
const createdTopicIds = [];

export function setup() {
  // Authenticate once for all VUs
  const token = authenticate();
  if (!token) {
    console.warn('Authentication failed, some tests will be skipped');
  }
  return { token };
}

export default function (data) {
  authToken = data.token;

  group('Read Operations', function () {
    // List topics (most common operation)
    group('List Topics', function () {
      const listRes = http.get(`${config.baseUrl}/api/topics?page=1&limit=20`, {
        tags: { name: 'topics-list' },
      });
      check(listRes, {
        'topics list status 200': (r) => r.status === 200,
        'topics list has data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.data) || Array.isArray(body.topics) || Array.isArray(body);
          } catch {
            return false;
          }
        },
      });

      // If we got topics, fetch one detail
      try {
        const topics = JSON.parse(listRes.body);
        const topicList = topics.data || topics.topics || topics;
        if (Array.isArray(topicList) && topicList.length > 0) {
          const randomIndex = Math.floor(Math.random() * topicList.length);
          const topicId = topicList[randomIndex].id;

          const detailRes = http.get(`${config.baseUrl}/api/topics/${topicId}`, {
            tags: { name: 'topics-detail' },
          });
          check(detailRes, {
            'topic detail status 200': (r) => r.status === 200,
            'topic detail has id': (r) => {
              try {
                return JSON.parse(r.body).id === topicId;
              } catch {
                return false;
              }
            },
          });
        }
      } catch (e) {
        // Ignore parsing errors
      }

      sleep(0.5);
    });

    // Search topics
    group('Search Topics', function () {
      const searchTerms = ['discussion', 'debate', 'analysis', 'opinion', 'fact'];
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

      const searchRes = http.get(`${config.baseUrl}/api/topics/search?q=${term}`, {
        tags: { name: 'topics-search' },
      });
      check(searchRes, {
        'topics search status 200 or 404': (r) => r.status === 200 || r.status === 404,
      });

      sleep(0.3);
    });
  });

  // Write operations (only if authenticated)
  if (authToken) {
    group('Write Operations', function () {
      // Create topic (less frequent)
      if (Math.random() < 0.1) {
        // 10% of iterations create a topic
        group('Create Topic', function () {
          const topicData = {
            title: randomTopicTitle(),
            description: randomContent(20, 100),
            category: 'general',
          };

          const createRes = http.post(`${config.baseUrl}/api/topics`, JSON.stringify(topicData), {
            headers: authHeaders(authToken),
            tags: { name: 'topics-create' },
          });

          const created = check(createRes, {
            'topic create status 201': (r) => r.status === 201,
            'topic create has id': (r) => {
              try {
                return JSON.parse(r.body).id !== undefined;
              } catch {
                return false;
              }
            },
          });

          if (created) {
            try {
              const newTopic = JSON.parse(createRes.body);
              createdTopicIds.push(newTopic.id);
            } catch {
              // Ignore
            }
          }

          sleep(1);
        });
      }
    });
  }

  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

export function teardown(data) {
  // Clean up created topics if needed
  if (data.token && createdTopicIds.length > 0) {
    console.log(`Cleaning up ${createdTopicIds.length} created topics`);
    // Note: In production, you might want to delete test data
  }
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'topics-summary.json': JSON.stringify(data),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
