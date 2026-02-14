/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FactCheckRequest, FactCheckResult, FactCheckClientHealth } from './types.js';

/**
 * Abstract interface for fact-check API clients
 *
 * All external fact-check API clients (Google, Snopes, PolitiFact, etc.)
 * should implement this interface for consistent behavior.
 */
export interface IFactCheckClient {
  /**
   * Unique identifier for this client
   */
  readonly name: string;

  /**
   * Check a claim against this fact-check source
   *
   * @param request - The fact-check request containing the claim
   * @returns Promise resolving to fact-check results, or null if no results found
   */
  checkClaim(request: FactCheckRequest): Promise<FactCheckResult | null>;

  /**
   * Check if this client is ready to serve requests
   *
   * @returns Promise resolving to health status
   */
  getHealth(): Promise<FactCheckClientHealth>;

  /**
   * Check if this client is configured and has valid credentials
   *
   * @returns true if the client can make API calls
   */
  isConfigured(): boolean;
}

/**
 * Token for injecting all fact-check clients
 */
export const FACT_CHECK_CLIENTS = Symbol('FACT_CHECK_CLIENTS');
