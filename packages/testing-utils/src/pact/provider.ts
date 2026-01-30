/**
 * Pact Provider Configuration
 *
 * Configures provider verification for consumer-driven contract testing.
 * Supports local pact files, pact broker integration, and state handlers.
 *
 * @example
 * ```ts
 * import { createProviderVerifier, ProviderVerifierOptions } from '@reason-bridge/testing-utils/pact';
 *
 * const verifier = createProviderVerifier({
 *   provider: 'user-service',
 *   providerBaseUrl: 'http://localhost:3000',
 *   pactUrls: ['./pacts/consumer-user-service.json'],
 * });
 *
 * await verifier.verifyProvider();
 * ```
 */

import { Verifier } from '@pact-foundation/pact';
import type { VerifierOptions, LogLevel } from '@pact-foundation/pact';

/**
 * State handler function type for setting up provider state
 */
export type StateHandler = (
  providerState: string,
  params?: Record<string, unknown>,
) => Promise<unknown>;

/**
 * Map of state names to handler functions
 */
export type StateHandlers = Record<string, StateHandler>;

/**
 * Configuration options for the Pact provider verifier
 */
export interface ProviderVerifierOptions {
  /**
   * Name of the provider service being verified
   */
  provider: string;

  /**
   * Base URL where the provider is running
   */
  providerBaseUrl: string;

  /**
   * Local pact file URLs to verify against
   */
  pactUrls?: string[];

  /**
   * Pact broker URL for fetching pacts
   */
  pactBrokerUrl?: string;

  /**
   * Authentication token for pact broker
   */
  pactBrokerToken?: string;

  /**
   * Username for pact broker basic auth
   */
  pactBrokerUsername?: string;

  /**
   * Password for pact broker basic auth
   */
  pactBrokerPassword?: string;

  /**
   * Consumer version selectors for pact broker
   */
  consumerVersionSelectors?: ConsumerVersionSelector[];

  /**
   * Whether to enable pending pacts
   * @default false
   */
  enablePending?: boolean;

  /**
   * WIP pacts since date (ISO 8601 format)
   */
  includeWipPactsSince?: string;

  /**
   * Provider version for publishing verification results
   */
  providerVersion?: string;

  /**
   * Provider version branch for publishing
   */
  providerVersionBranch?: string;

  /**
   * Whether to publish verification results to broker
   * @default false
   */
  publishVerificationResult?: boolean;

  /**
   * State handlers for setting up provider state
   */
  stateHandlers?: StateHandlers;

  /**
   * Log level for Pact output
   * @default 'info'
   */
  logLevel?: LogLevel;

  /**
   * Timeout for provider verification in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Request filter for modifying outgoing requests
   */
  requestFilter?: (req: unknown, res: unknown, next: () => void) => void;

  /**
   * Custom headers to add to verification requests
   */
  customProviderHeaders?: Record<string, string>;

  /**
   * Disable SSL certificate verification
   * @default false
   */
  disableSslVerification?: boolean;
}

/**
 * Consumer version selector for fetching pacts from broker
 */
export interface ConsumerVersionSelector {
  /**
   * Consumer name (optional, all consumers if not specified)
   */
  consumer?: string;

  /**
   * Branch name to get pacts for
   */
  branch?: string;

  /**
   * Specific tag to match
   */
  tag?: string;

  /**
   * Whether to fetch latest pact
   * @default true
   */
  latest?: boolean;

  /**
   * Whether to match deployed or released versions
   */
  deployedOrReleased?: boolean;

  /**
   * Match pacts for specific environment
   */
  environment?: string;

  /**
   * Whether this is a main branch
   */
  mainBranch?: boolean;

  /**
   * Fallback tag if main selector doesn't match
   */
  fallbackTag?: string;
}

/**
 * Result of provider verification
 */
export interface VerificationResult {
  /**
   * Whether verification passed
   */
  success: boolean;

  /**
   * Verification output/logs
   */
  output?: string;

  /**
   * Error message if verification failed
   */
  error?: string;
}

/**
 * Creates a configured Pact provider verifier
 *
 * @param options - Provider verification configuration
 * @returns Object with verifyProvider method
 *
 * @example Basic local pact verification
 * ```ts
 * const verifier = createProviderVerifier({
 *   provider: 'user-service',
 *   providerBaseUrl: 'http://localhost:3000',
 *   pactUrls: ['./pacts/frontend-user-service.json'],
 * });
 *
 * const result = await verifier.verifyProvider();
 * expect(result.success).toBe(true);
 * ```
 *
 * @example Verification with pact broker
 * ```ts
 * const verifier = createProviderVerifier({
 *   provider: 'user-service',
 *   providerBaseUrl: 'http://localhost:3000',
 *   pactBrokerUrl: 'https://pact-broker.example.com',
 *   pactBrokerToken: process.env.PACT_BROKER_TOKEN,
 *   publishVerificationResult: true,
 *   providerVersion: '1.0.0',
 *   providerVersionBranch: 'main',
 *   consumerVersionSelectors: [
 *     { mainBranch: true },
 *     { deployedOrReleased: true },
 *   ],
 * });
 * ```
 *
 * @example With state handlers
 * ```ts
 * const verifier = createProviderVerifier({
 *   provider: 'user-service',
 *   providerBaseUrl: 'http://localhost:3000',
 *   pactUrls: ['./pacts/consumer-user-service.json'],
 *   stateHandlers: {
 *     'user exists': async () => {
 *       await db.user.create({ data: { id: 'test-user', name: 'Test' } });
 *     },
 *     'user does not exist': async () => {
 *       await db.user.deleteMany();
 *     },
 *   },
 * });
 * ```
 */
export function createProviderVerifier(options: ProviderVerifierOptions): {
  verifyProvider: () => Promise<VerificationResult>;
  getVerifierOptions: () => VerifierOptions;
} {
  const {
    provider,
    providerBaseUrl,
    pactUrls,
    pactBrokerUrl,
    pactBrokerToken,
    pactBrokerUsername,
    pactBrokerPassword,
    consumerVersionSelectors,
    enablePending = false,
    includeWipPactsSince,
    providerVersion,
    providerVersionBranch,
    publishVerificationResult = false,
    stateHandlers,
    logLevel = 'info',
    timeout = 30000,
    requestFilter,
    customProviderHeaders,
    disableSslVerification = false,
  } = options;

  // Validate configuration
  if (!pactUrls?.length && !pactBrokerUrl) {
    throw new Error('Either pactUrls or pactBrokerUrl must be provided for provider verification');
  }

  if (publishVerificationResult && !providerVersion) {
    throw new Error('providerVersion is required when publishVerificationResult is true');
  }

  // Build verifier options
  const verifierOptions: VerifierOptions = {
    provider,
    providerBaseUrl,
    logLevel,
    timeout,
    disableSslVerification,
  };

  // Add local pact files if provided
  if (pactUrls?.length) {
    verifierOptions.pactUrls = pactUrls;
  }

  // Add broker configuration if provided
  if (pactBrokerUrl) {
    verifierOptions.pactBrokerUrl = pactBrokerUrl;

    if (pactBrokerToken) {
      verifierOptions.pactBrokerToken = pactBrokerToken;
    } else if (pactBrokerUsername && pactBrokerPassword) {
      verifierOptions.pactBrokerUsername = pactBrokerUsername;
      verifierOptions.pactBrokerPassword = pactBrokerPassword;
    }

    if (consumerVersionSelectors?.length) {
      verifierOptions.consumerVersionSelectors = consumerVersionSelectors;
    }

    verifierOptions.enablePending = enablePending;

    if (includeWipPactsSince) {
      verifierOptions.includeWipPactsSince = includeWipPactsSince;
    }
  }

  // Add publishing configuration
  if (publishVerificationResult) {
    verifierOptions.publishVerificationResult = true;
    verifierOptions.providerVersion = providerVersion;

    if (providerVersionBranch) {
      verifierOptions.providerVersionBranch = providerVersionBranch;
    }
  }

  // Add state handlers
  if (stateHandlers) {
    verifierOptions.stateHandlers = stateHandlers;
  }

  // Add request filter
  if (requestFilter) {
    verifierOptions.requestFilter = requestFilter;
  }

  // Add custom headers
  if (customProviderHeaders) {
    verifierOptions.customProviderHeaders = Object.entries(customProviderHeaders).map(
      ([name, value]) => `${name}: ${value}`,
    );
  }

  return {
    /**
     * Run provider verification
     */
    async verifyProvider(): Promise<VerificationResult> {
      const verifier = new Verifier(verifierOptions);

      try {
        const output = await verifier.verifyProvider();
        return {
          success: true,
          output: typeof output === 'string' ? output : JSON.stringify(output),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get the configured verifier options (useful for debugging)
     */
    getVerifierOptions(): VerifierOptions {
      return { ...verifierOptions };
    },
  };
}

/**
 * Default consumer version selectors for common scenarios
 */
export const defaultConsumerVersionSelectors: Record<string, ConsumerVersionSelector[]> = {
  /**
   * Verify against main branch and deployed/released versions
   * Recommended for production provider verification
   */
  production: [{ mainBranch: true }, { deployedOrReleased: true }],

  /**
   * Verify against feature branches and main
   * Recommended for PR/feature branch verification
   */
  development: [{ mainBranch: true }, { branch: process.env['GIT_BRANCH'] || 'main' }],

  /**
   * Verify only against matching branch
   * Useful for feature branch testing
   */
  matchingBranch: [{ branch: process.env['GIT_BRANCH'] || 'main' }],

  /**
   * Verify against all consumer versions
   * Useful for comprehensive testing
   */
  all: [{ latest: true }],
};

/**
 * Creates provider verifier options from environment variables
 *
 * Environment variables:
 * - PACT_PROVIDER_NAME: Provider name
 * - PACT_PROVIDER_URL: Provider base URL
 * - PACT_BROKER_URL: Pact broker URL
 * - PACT_BROKER_TOKEN: Broker authentication token
 * - PACT_PROVIDER_VERSION: Provider version for publishing
 * - PACT_PROVIDER_BRANCH: Provider branch name
 * - PACT_PUBLISH_RESULTS: Whether to publish results ('true'/'false')
 * - PACT_LOG_LEVEL: Log level (trace/debug/info/warn/error)
 *
 * @param overrides - Options to override environment configuration
 * @returns Provider verifier options
 */
export function createProviderVerifierFromEnv(
  overrides: Partial<ProviderVerifierOptions> = {},
): ProviderVerifierOptions {
  const env = process.env;

  return {
    provider: env['PACT_PROVIDER_NAME'] || 'unknown-provider',
    providerBaseUrl: env['PACT_PROVIDER_URL'] || 'http://localhost:3000',
    pactBrokerUrl: env['PACT_BROKER_URL'],
    pactBrokerToken: env['PACT_BROKER_TOKEN'],
    providerVersion: env['PACT_PROVIDER_VERSION'] || env['GIT_COMMIT'] || 'unknown',
    providerVersionBranch: env['PACT_PROVIDER_BRANCH'] || env['GIT_BRANCH'],
    publishVerificationResult: env['PACT_PUBLISH_RESULTS'] === 'true',
    logLevel: (env['PACT_LOG_LEVEL'] as LogLevel) || 'info',
    consumerVersionSelectors: defaultConsumerVersionSelectors['production'],
    enablePending: true,
    ...overrides,
  };
}

// Re-export types for convenience
export type { VerifierOptions, LogLevel };
