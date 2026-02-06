/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FastifyHelmetOptions } from '@fastify/helmet';

/**
 * Security configuration for the API Gateway
 *
 * Implements OWASP security headers and CORS policies
 * based on environment (development vs production)
 */

const isProduction = process.env['NODE_ENV'] === 'production';
const isTest = process.env['NODE_ENV'] === 'test';

/**
 * Allowed origins for CORS
 * In production, only allow specific domains
 * In development, allow localhost variants
 */
export function getAllowedOrigins(): string[] | boolean {
  if (isTest) {
    return true; // Allow all origins in test
  }

  if (isProduction) {
    const origins = process.env['ALLOWED_ORIGINS'];
    if (origins) {
      return origins.split(',').map((o) => o.trim());
    }
    // Default production origins
    return [
      'https://reasonbridge.org',
      'https://www.reasonbridge.org',
      'https://app.reasonbridge.org',
    ];
  }

  // Development - allow localhost on common ports
  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  origin: string[] | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export function getCorsConfig(): CorsConfig {
  return {
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Request-ID',
      'Accept',
      'Origin',
    ],
    exposedHeaders: [
      'X-Correlation-ID',
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
    ],
    maxAge: 86400, // 24 hours
  };
}

/**
 * Helmet security headers configuration
 *
 * Implements OWASP security headers:
 * - Content-Security-Policy (CSP)
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - X-XSS-Protection (legacy)
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 */
export function getHelmetConfig(): FastifyHelmetOptions {
  return {
    // Content Security Policy
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false, // Disable CSP in development for easier debugging

    // Prevent MIME type sniffing
    // X-Content-Type-Options: nosniff
    noSniff: true,

    // Prevent clickjacking
    // X-Frame-Options: DENY
    frameguard: {
      action: 'deny',
    },

    // HTTP Strict Transport Security (HSTS)
    // Only in production with HTTPS
    hsts: isProduction
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false,
    },

    // X-Download-Options (IE specific)
    ieNoOpen: true,

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },

    // Hide X-Powered-By header (NestJS/Fastify)
    hidePoweredBy: true,

    // Origin-Agent-Cluster header
    originAgentCluster: true,

    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Can break legitimate embeds
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  };
}

/**
 * Rate limiting tiers for different endpoints
 */
export interface RateLimitTier {
  ttl: number; // Time window in milliseconds
  limit: number; // Max requests in window
}

export const rateLimitTiers: Record<string, RateLimitTier> = {
  // Default: 100 requests per minute
  default: { ttl: 60000, limit: 100 },

  // Strict: 10 requests per minute (expensive operations)
  strict: { ttl: 60000, limit: 10 },

  // Auth: 5 login attempts per minute (brute force protection)
  auth: { ttl: 60000, limit: 5 },

  // API: 1000 requests per minute (authenticated API users)
  api: { ttl: 60000, limit: 1000 },
};
