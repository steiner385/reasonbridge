/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Vitest setup file for user-service unit tests.
 *
 * This file is loaded before any tests run and mocks modules that
 * have side effects (like PrismaService which tries to connect to DB).
 *
 * @remarks
 * The mock prevents PrismaService from trying to establish a real database
 * connection when imported. Individual tests should create their own mock
 * instances with the specific methods they need.
 *
 * We use importOriginal() to preserve all enum exports from @prisma/client
 * while only mocking PrismaClient.
 */

import { vi } from 'vitest';

// Mock the PrismaService to prevent actual database connections
vi.mock('../prisma/prisma.service.js', () => ({
  PrismaService: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    userFollow: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    discussion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    verification: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    onboardingProgress: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    parentConsentToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn()),
    onModuleInit: vi.fn(),
    onModuleDestroy: vi.fn(),
  })),
}));

// Mock @prisma/client - preserve actual exports (enums, types) and only mock PrismaClient
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return {
    ...actual,
    PrismaClient: vi.fn().mockImplementation(() => ({
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    })),
  };
});

// Mock @prisma/adapter-pg to prevent pg Pool creation
vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: vi.fn(),
}));

// Mock pg Pool
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    end: vi.fn(),
    query: vi.fn(),
  })),
}));

// Mock @aws-sdk/client-s3 to prevent AWS S3 client initialization
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
}));

// Mock @aws-sdk/s3-request-presigner for video upload pre-signed URLs
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://mock-presigned-url.s3.amazonaws.com/test'),
}));

// Mock @nestjs/throttler to prevent rate limiter initialization
vi.mock('@nestjs/throttler', () => ({
  ThrottlerGuard: vi.fn().mockImplementation(() => ({
    canActivate: vi.fn().mockReturnValue(true),
  })),
  Throttle: vi.fn().mockReturnValue(() => {}),
  SkipThrottle: vi.fn().mockReturnValue(() => {}),
}));

// Mock ioredis for caching
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
  })),
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
  })),
}));

// Mock @aws-sdk/client-ses for email service
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  SendEmailCommand: vi.fn(),
}));

// Mock @nestjs/cache-manager for caching decorators
vi.mock('@nestjs/cache-manager', () => ({
  CACHE_MANAGER: 'CACHE_MANAGER',
  CacheInterceptor: vi.fn().mockImplementation(() => ({
    intercept: vi.fn((context, next) => next.handle()),
  })),
  CacheTTL: vi.fn().mockReturnValue(() => {}),
  CacheKey: vi.fn().mockReturnValue(() => {}),
}));
