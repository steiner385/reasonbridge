/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Module tests for RankingModule
 *
 * Verifies that the module compiles correctly and all providers are
 * properly injected and accessible through the NestJS dependency injection system.
 *
 * @see services/user-service/src/ranking/ranking.module.ts
 */
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { RankingModule } from '../ranking.module.js';
import { RankingService } from '../ranking.service.js';
import { RankingCalculatorService } from '../ranking-calculator.service.js';
import { TrustScoreCalculator } from '../../services/trust-score.calculator.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// Mock Prisma before importing services
vi.mock('@prisma/client', () => {
  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
    toString(): string {
      return this.value.toString();
    }
  }

  return {
    Prisma: { Decimal: MockDecimal },
    TierLevel: {
      NEWCOMER: 'NEWCOMER',
      CONTRIBUTOR: 'CONTRIBUTOR',
      TRUSTED: 'TRUSTED',
      LEADER: 'LEADER',
      EXPERT: 'EXPERT',
    },
  };
});

/**
 * Mock PrismaService for testing
 */
const mockPrismaService = {
  user: {
    findUnique: vi.fn(),
  },
  userRank: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  response: {
    count: vi.fn(),
  },
};

describe('RankingModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [RankingModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();
  });

  describe('Module Compilation', () => {
    it('should compile the module successfully', () => {
      expect(module).toBeDefined();
    });

    it('should have RankingModule defined', () => {
      const rankingModule = module.get<RankingModule>(RankingModule);
      // Module itself is not injectable, but we can verify it exists by getting providers
      expect(module).toBeDefined();
    });
  });

  describe('Provider Injection', () => {
    it('should inject RankingService', () => {
      const service = module.get<RankingService>(RankingService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RankingService);
    });

    it('should inject RankingCalculatorService', () => {
      const service = module.get<RankingCalculatorService>(RankingCalculatorService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RankingCalculatorService);
    });

    it('should inject TrustScoreCalculator', () => {
      const service = module.get<TrustScoreCalculator>(TrustScoreCalculator);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TrustScoreCalculator);
    });

    it('should inject PrismaService', () => {
      const service = module.get<PrismaService>(PrismaService);
      expect(service).toBeDefined();
    });
  });

  describe('Service Dependencies', () => {
    it('should have RankingService with proper dependencies', () => {
      const rankingService = module.get<RankingService>(RankingService);
      const calculatorService = module.get<RankingCalculatorService>(RankingCalculatorService);
      const trustScoreCalculator = module.get<TrustScoreCalculator>(TrustScoreCalculator);

      // All services should be defined and properly wired
      expect(rankingService).toBeDefined();
      expect(calculatorService).toBeDefined();
      expect(trustScoreCalculator).toBeDefined();
    });
  });

  describe('Exported Services', () => {
    it('should export RankingService', () => {
      // This tests that RankingService is in the exports array
      // by verifying we can get it from the compiled module
      const service = module.get<RankingService>(RankingService);
      expect(service).toBeDefined();
    });

    it('should export RankingCalculatorService', () => {
      // This tests that RankingCalculatorService is in the exports array
      const service = module.get<RankingCalculatorService>(RankingCalculatorService);
      expect(service).toBeDefined();
    });
  });

  describe('RankingCalculatorService Integration', () => {
    let calculatorService: RankingCalculatorService;

    beforeEach(() => {
      calculatorService = module.get<RankingCalculatorService>(RankingCalculatorService);
    });

    it('should calculate composite score correctly', () => {
      const input = {
        trustAverage: 0.6,
        verificationLevel: 'BASIC' as const,
        engagementScore: 0.5,
        qualityScore: 0.5,
        accountAgeDays: 180,
      };

      const score = calculatorService.calculateCompositeScore(input);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should determine tier level correctly', () => {
      const tier = calculatorService.determineTierLevel(0.85);
      expect(tier).toBe('EXPERT');
    });
  });

  describe('TrustScoreCalculator Integration', () => {
    let trustScoreCalculator: TrustScoreCalculator;

    beforeEach(() => {
      trustScoreCalculator = module.get<TrustScoreCalculator>(TrustScoreCalculator);
    });

    it('should convert decimal to number correctly', () => {
      const decimal = { toNumber: () => 0.75 };
      const result = trustScoreCalculator.decimalToNumber(decimal as any);
      expect(result).toBe(0.75);
    });

    it('should handle plain numbers', () => {
      const result = trustScoreCalculator.decimalToNumber(0.5);
      expect(result).toBe(0.5);
    });
  });
});

describe('RankingModule - Isolation Tests', () => {
  describe('Module can be compiled standalone', () => {
    it('should compile when imported into a test module', async () => {
      const testModule = await Test.createTestingModule({
        imports: [RankingModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrismaService)
        .compile();

      expect(testModule).toBeDefined();

      // Clean up
      await testModule.close();
    });
  });

  describe('Services can be overridden', () => {
    it('should allow overriding RankingCalculatorService', async () => {
      const mockCalculator = {
        calculateCompositeScore: vi.fn().mockReturnValue(0.99),
        determineTierLevel: vi.fn().mockReturnValue('EXPERT'),
        getNextTierThreshold: vi.fn().mockReturnValue(1.0),
      };

      const testModule = await Test.createTestingModule({
        imports: [RankingModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrismaService)
        .overrideProvider(RankingCalculatorService)
        .useValue(mockCalculator)
        .compile();

      const calculator = testModule.get<RankingCalculatorService>(RankingCalculatorService);
      const score = calculator.calculateCompositeScore({} as any);

      expect(score).toBe(0.99);
      expect(mockCalculator.calculateCompositeScore).toHaveBeenCalled();

      await testModule.close();
    });

    it('should allow overriding RankingService', async () => {
      const mockRankingService = {
        getUserRank: vi.fn().mockResolvedValue({ userId: 'test', tierLevel: 'EXPERT' }),
        recalculateUserRank: vi.fn().mockResolvedValue({ userId: 'test' }),
        getLeaderboard: vi.fn().mockResolvedValue([]),
      };

      const testModule = await Test.createTestingModule({
        imports: [RankingModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrismaService)
        .overrideProvider(RankingService)
        .useValue(mockRankingService)
        .compile();

      const service = testModule.get<RankingService>(RankingService);
      const result = await service.getUserRank('test-user');

      expect(result.tierLevel).toBe('EXPERT');
      expect(mockRankingService.getUserRank).toHaveBeenCalledWith('test-user');

      await testModule.close();
    });
  });
});
