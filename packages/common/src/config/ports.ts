/**
 * Single Source of Truth for Service Ports
 *
 * This file defines all service ports for the ReasonBridge platform.
 * ALL configurations (main.ts, docker-compose, proxy.service.ts) should
 * reference this file to prevent port mismatches.
 *
 * When adding a new service:
 * 1. Add its port here
 * 2. Import and use this constant in the service's main.ts
 * 3. Update docker-compose files to use the same port
 */

export const SERVICE_PORTS = {
  // API Gateway - Entry point for all requests
  API_GATEWAY: 3000,

  // Core Services
  USER_SERVICE: 3001,
  AI_SERVICE: 3002,
  MODERATION_SERVICE: 3003,
  RECOMMENDATION_SERVICE: 3004,
  NOTIFICATION_SERVICE: 3005,
  FACT_CHECK_SERVICE: 3006,
  DISCUSSION_SERVICE: 3007,

  // Frontend (Vite dev server)
  FRONTEND_DEV: 5173,
  FRONTEND_PROD: 80,

  // Infrastructure (for reference, managed by docker-compose)
  POSTGRES: 5432,
  REDIS: 6379,
  LOCALSTACK: 4566,
} as const;

/**
 * Get the URL for a service based on its port
 * Uses localhost for local development
 */
export function getServiceUrl(serviceName: keyof typeof SERVICE_PORTS, host = 'localhost'): string {
  const port = SERVICE_PORTS[serviceName];
  return `http://${host}:${port}`;
}

/**
 * Environment variable names for service URLs
 * Used by API Gateway to discover services
 */
export const SERVICE_URL_ENV_VARS = {
  USER_SERVICE: 'USER_SERVICE_URL',
  AI_SERVICE: 'AI_SERVICE_URL',
  DISCUSSION_SERVICE: 'DISCUSSION_SERVICE_URL',
  MODERATION_SERVICE: 'MODERATION_SERVICE_URL',
  NOTIFICATION_SERVICE: 'NOTIFICATION_SERVICE_URL',
  RECOMMENDATION_SERVICE: 'RECOMMENDATION_SERVICE_URL',
  FACT_CHECK_SERVICE: 'FACT_CHECK_SERVICE_URL',
} as const;
