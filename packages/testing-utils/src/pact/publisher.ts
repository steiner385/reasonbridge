/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pact Publisher Configuration
 *
 * Utilities for publishing pact files to a Pact Broker.
 * Note: Publishing requires the pact-broker CLI or pact-js-core library.
 * This module provides configuration helpers and deployment recording.
 *
 * @example Using CLI for publishing
 * ```bash
 * npx pact-broker publish ./pacts \
 *   --consumer-app-version $GIT_COMMIT \
 *   --branch $GIT_BRANCH \
 *   --broker-base-url $PACT_BROKER_URL \
 *   --broker-token $PACT_BROKER_TOKEN
 * ```
 */

import * as path from 'path';

/**
 * Configuration options for pact publishing
 */
export interface PactPublisherOptions {
  /**
   * URL of the Pact Broker
   */
  pactBrokerUrl: string;

  /**
   * Authentication token for the broker
   */
  pactBrokerToken?: string;

  /**
   * Username for basic auth
   */
  pactBrokerUsername?: string;

  /**
   * Password for basic auth
   */
  pactBrokerPassword?: string;

  /**
   * Consumer application version
   */
  consumerVersion: string;

  /**
   * Branch name for the consumer version
   */
  branch?: string;

  /**
   * Tags to apply to the published pacts
   */
  tags?: string[];

  /**
   * Array of pact files or directories containing pact files
   */
  pactFilesOrDirs: string[];

  /**
   * Build URL for traceability
   */
  buildUrl?: string;

  /**
   * Whether to fail if no pact files are found
   * @default true
   */
  failIfNoPacts?: boolean;
}

/**
 * Result of pact publishing
 */
export interface PublishResult {
  /**
   * Whether publishing succeeded
   */
  success: boolean;

  /**
   * Number of pacts published
   */
  pactsPublished?: number;

  /**
   * Error message if publishing failed
   */
  error?: string;
}

/**
 * Generates the CLI command for publishing pacts
 *
 * @param options - Publishing configuration
 * @returns CLI command string
 *
 * @example
 * ```ts
 * const command = generatePublishCommand({
 *   pactBrokerUrl: 'https://broker.example.com',
 *   consumerVersion: '1.0.0',
 *   pactFilesOrDirs: ['./pacts'],
 * });
 * // Returns: npx pact-broker publish ./pacts --consumer-app-version 1.0.0 --broker-base-url https://broker.example.com
 * ```
 */
export function generatePublishCommand(options: PactPublisherOptions): string {
  const {
    pactBrokerUrl,
    pactBrokerToken,
    pactBrokerUsername,
    pactBrokerPassword,
    consumerVersion,
    branch,
    tags,
    pactFilesOrDirs,
    buildUrl,
  } = options;

  const args: string[] = ['npx', 'pact-broker', 'publish'];

  // Add pact files/directories
  args.push(...pactFilesOrDirs.map((p) => (path.isAbsolute(p) ? p : `./${p}`)));

  // Required arguments
  args.push('--consumer-app-version', consumerVersion);
  args.push('--broker-base-url', pactBrokerUrl);

  // Authentication
  if (pactBrokerToken) {
    args.push('--broker-token', pactBrokerToken);
  } else if (pactBrokerUsername && pactBrokerPassword) {
    args.push('--broker-username', pactBrokerUsername);
    args.push('--broker-password', pactBrokerPassword);
  }

  // Optional arguments
  if (branch) {
    args.push('--branch', branch);
  }

  if (tags?.length) {
    tags.forEach((tag) => args.push('--tag', tag));
  }

  if (buildUrl) {
    args.push('--build-url', buildUrl);
  }

  return args.join(' ');
}

/**
 * Creates pact publisher options from environment variables
 *
 * Environment variables:
 * - PACT_BROKER_URL: Pact broker URL
 * - PACT_BROKER_TOKEN: Broker authentication token
 * - PACT_CONSUMER_VERSION: Consumer version (falls back to GIT_COMMIT)
 * - PACT_BRANCH: Branch name (falls back to GIT_BRANCH)
 * - PACT_TAGS: Comma-separated list of tags
 * - PACT_FILES_DIR: Directory containing pact files
 * - BUILD_URL: CI build URL for traceability
 *
 * @param overrides - Options to override environment configuration
 * @returns Pact publisher options
 */
export function createPactPublisherFromEnv(
  overrides: Partial<PactPublisherOptions> = {},
): PactPublisherOptions {
  const env = process.env;

  const tagsEnv = env['PACT_TAGS'];
  const parsedTags = tagsEnv
    ?.split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const tags = parsedTags?.length ? parsedTags : undefined;

  return {
    pactBrokerUrl: env['PACT_BROKER_URL'] || '',
    pactBrokerToken: env['PACT_BROKER_TOKEN'],
    consumerVersion: env['PACT_CONSUMER_VERSION'] || env['GIT_COMMIT'] || 'unknown',
    branch: env['PACT_BRANCH'] || env['GIT_BRANCH'],
    tags,
    pactFilesOrDirs: [env['PACT_FILES_DIR'] || './pacts'],
    buildUrl: env['BUILD_URL'],
    ...overrides,
  };
}

/**
 * Records a deployment in the Pact Broker
 *
 * This should be called after a successful deployment to track
 * which version is deployed to which environment.
 *
 * @param options - Deployment recording options
 *
 * @example
 * ```ts
 * await recordDeployment({
 *   pactBrokerUrl: 'https://pact-broker.example.com',
 *   pactBrokerToken: process.env.PACT_BROKER_TOKEN,
 *   pacticipant: 'user-service',
 *   version: '1.0.0',
 *   environment: 'production',
 * });
 * ```
 */
export interface DeploymentRecordOptions {
  /**
   * URL of the Pact Broker
   */
  pactBrokerUrl: string;

  /**
   * Authentication token for the broker
   */
  pactBrokerToken?: string;

  /**
   * Name of the application being deployed
   */
  pacticipant: string;

  /**
   * Version being deployed
   */
  version: string;

  /**
   * Target environment name
   */
  environment: string;

  /**
   * Optional application instance identifier
   */
  applicationInstance?: string;
}

/**
 * Record a deployment to the Pact Broker
 */
export async function recordDeployment(options: DeploymentRecordOptions): Promise<void> {
  const { pactBrokerUrl, pactBrokerToken, pacticipant, version, environment, applicationInstance } =
    options;

  // Build the API URL for recording deployment
  const baseUrl = pactBrokerUrl.replace(/\/$/, '');
  let url = `${baseUrl}/pacticipants/${encodeURIComponent(pacticipant)}/versions/${encodeURIComponent(version)}/deployed-versions/environment/${encodeURIComponent(environment)}`;

  if (applicationInstance) {
    url += `?applicationInstance=${encodeURIComponent(applicationInstance)}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (pactBrokerToken) {
    headers['Authorization'] = `Bearer ${pactBrokerToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ currentlyDeployed: true }),
  });

  if (!response.ok) {
    throw new Error(`Failed to record deployment: ${response.status} ${response.statusText}`);
  }
}

/**
 * Generates the CLI command for recording a deployment
 *
 * @param options - Deployment options
 * @returns CLI command string
 *
 * @example
 * ```ts
 * const command = generateDeploymentCommand({
 *   pactBrokerUrl: 'https://broker.example.com',
 *   pacticipant: 'user-service',
 *   version: '1.0.0',
 *   environment: 'production',
 * });
 * ```
 */
export function generateDeploymentCommand(options: DeploymentRecordOptions): string {
  const { pactBrokerUrl, pactBrokerToken, pacticipant, version, environment, applicationInstance } =
    options;

  const args: string[] = [
    'npx',
    'pact-broker',
    'record-deployment',
    '--pacticipant',
    pacticipant,
    '--version',
    version,
    '--environment',
    environment,
    '--broker-base-url',
    pactBrokerUrl,
  ];

  if (pactBrokerToken) {
    args.push('--broker-token', pactBrokerToken);
  }

  if (applicationInstance) {
    args.push('--application-instance', applicationInstance);
  }

  return args.join(' ');
}
