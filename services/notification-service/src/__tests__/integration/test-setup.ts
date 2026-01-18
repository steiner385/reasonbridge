/**
 * Common test setup utilities for integration tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Creates a test module for integration testing
 */
export async function createTestModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [AppModule],
  })
    .setLogger(new Logger())
    .compile();
}

/**
 * Creates a test module with mocked Prisma for unit tests
 */
export async function createTestModuleWithMockedPrisma(mockPrismaData: any): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(mockPrismaData)
    .compile();
}

/**
 * Cleans up module and resources after test
 */
export async function cleanupModule(module: TestingModule): Promise<void> {
  const prisma = module.get<PrismaService>(PrismaService);
  if (prisma) {
    await prisma.$disconnect();
  }
  await module.close();
}
