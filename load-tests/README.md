# Load Testing with k6

This directory contains load test scenarios for the reasonBridge platform using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Test Scenarios

| Scenario          | Description                  | Use Case                           |
| ----------------- | ---------------------------- | ---------------------------------- |
| `health.js`       | Health endpoint checks       | Verify basic availability          |
| `topics.js`       | Topics CRUD operations       | Test discussion service under load |
| `auth.js`         | Authentication flows         | Test auth service scalability      |
| `user-journey.js` | Full user journey simulation | Realistic usage patterns           |
| `soak-10k.js`     | 10,000 concurrent users      | Production capacity validation     |

## Running Tests

### Quick Start (Smoke Test)

```bash
# Health check smoke test
k6 run scenarios/health.js

# Topics API smoke test
k6 run scenarios/topics.js
```

### Test Types

Control test intensity with the `TEST_TYPE` environment variable:

```bash
# Smoke test (5 users, 4 minutes)
k6 run scenarios/topics.js

# Load test (50-100 users, 16 minutes)
k6 run -e TEST_TYPE=load scenarios/topics.js

# Stress test (100-500 users, 26 minutes)
k6 run -e TEST_TYPE=stress scenarios/topics.js

# Spike test (rapid scale to 500 users)
k6 run -e TEST_TYPE=spike scenarios/topics.js

# Soak test (200 users for 4 hours)
k6 run -e TEST_TYPE=soak scenarios/topics.js
```

### Environment Variables

| Variable                 | Default                 | Description            |
| ------------------------ | ----------------------- | ---------------------- |
| `BASE_URL`               | `http://localhost:3000` | API Gateway URL        |
| `USER_SERVICE_URL`       | `http://localhost:3001` | User service URL       |
| `DISCUSSION_SERVICE_URL` | `http://localhost:3007` | Discussion service URL |
| `TEST_TYPE`              | `smoke`                 | Test intensity level   |
| `TEST_USER_EMAIL`        | `loadtest@example.com`  | Test user email        |
| `TEST_USER_PASSWORD`     | `LoadTest123!`          | Test user password     |

### Production Testing

```bash
# Test against staging
k6 run -e BASE_URL=https://staging.reasonbridge.org scenarios/user-journey.js

# High concurrency soak test
k6 run -e BASE_URL=https://staging.reasonbridge.org scenarios/soak-10k.js
```

## Output Formats

### Console Summary (Default)

```bash
k6 run scenarios/health.js
```

### JSON Output

```bash
k6 run --out json=results.json scenarios/health.js
```

### InfluxDB (for Grafana dashboards)

```bash
k6 run --out influxdb=http://localhost:8086/k6 scenarios/health.js
```

### HTML Report

Tests automatically generate HTML reports via k6-reporter when using `handleSummary`.

## Performance Thresholds

Default thresholds (can be customized per scenario):

| Metric                    | Threshold | Description                   |
| ------------------------- | --------- | ----------------------------- |
| `http_req_duration p(95)` | < 500ms   | 95th percentile response time |
| `http_req_duration p(99)` | < 1000ms  | 99th percentile response time |
| `http_req_failed`         | < 1%      | Request failure rate          |
| `http_reqs`               | > 100/s   | Minimum throughput            |

## Directory Structure

```
load-tests/
├── README.md           # This file
├── lib/
│   ├── config.js       # Shared configuration
│   └── utils.js        # Utility functions
└── scenarios/
    ├── health.js       # Health check tests
    ├── topics.js       # Topics API tests
    ├── auth.js         # Authentication tests
    ├── user-journey.js # Full user journey
    └── soak-10k.js     # High concurrency test
```

## Creating New Scenarios

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, getStages, getThresholds } from '../lib/config.js';

export const options = {
  stages: getStages(),
  thresholds: getThresholds(),
};

export default function () {
  const res = http.get(`${config.baseUrl}/api/your-endpoint`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

## CI/CD Integration

Add to Jenkins pipeline:

```groovy
stage('Load Tests') {
  agent {
    docker { image 'grafana/k6' }
  }
  steps {
    sh 'k6 run -e BASE_URL=$API_GATEWAY_URL load-tests/scenarios/health.js'
  }
}
```

## Monitoring During Tests

- Watch server metrics (CPU, memory, connections)
- Monitor database connection pools
- Check application logs for errors
- Use distributed tracing for bottleneck identification

## Troubleshooting

### Connection Refused

Ensure services are running and accessible from the load test host.

### High Failure Rate

- Check rate limiting configuration
- Verify authentication credentials
- Review server resource utilization

### Memory Issues

For high concurrency tests, run k6 in distributed mode or use cloud k6.
