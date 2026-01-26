/// <reference types="vitest" />

import { config } from 'dotenv';
import { createMockPrisma } from './prisma-mock.js';

// Load environment variables for tests
config({ path: '.env.test' });

// Mock Prisma globally to avoid database connections in unit tests
vi.mock('@reason-bridge/db-models', async () => {
  const actual = await vi.importActual('@reason-bridge/db-models');
  return {
    ...actual,
    PrismaClient: class MockPrismaClient {
      constructor() {
        return createMockPrisma();
      }
    },
  };
});

// Mock other external dependencies that might cause issues
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(),
}));

vi.mock('pdfkit', () => ({
  default: vi.fn(),
}));
