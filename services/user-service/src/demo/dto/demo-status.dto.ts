/**
 * DTOs for demo status endpoint
 */

/**
 * Entity counts in the demo environment
 */
export class DemoDataCountsDto {
  /** Number of demo users */
  users: number;

  /** Number of demo topics */
  topics: number;

  /** Number of demo tags */
  tags: number;

  /** Number of demo responses */
  responses: number;

  /** Number of demo propositions */
  propositions: number;

  /** Number of demo alignments */
  alignments: number;

  /** Number of common ground analyses */
  commonGroundAnalyses: number;

  /** Number of AI feedback instances */
  feedback: number;

  /** Total database entries */
  total: number;
}

/**
 * Demo environment health information
 */
export class DemoHealthDto {
  /** Database connectivity */
  database: boolean;

  /** Redis cache connectivity */
  redis: boolean;

  /** AI service availability */
  aiService: boolean;

  /** Last health check timestamp */
  lastChecked: string;
}

/**
 * Full demo environment status response
 */
export class DemoStatusDto {
  /** Whether demo mode is enabled */
  demoModeEnabled: boolean;

  /** Current environment name */
  environment: string;

  /** Counts of demo data */
  dataCounts: DemoDataCountsDto;

  /** System health information */
  health: DemoHealthDto;

  /** Expected data counts (from seed definitions) */
  expectedCounts: DemoDataCountsDto;

  /** Whether data is fully seeded */
  isFullySeeded: boolean;

  /** Last reset timestamp */
  lastResetAt: string | null;

  /** Status message */
  message: string;
}
