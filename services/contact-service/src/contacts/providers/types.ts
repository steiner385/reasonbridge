/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Raw contact data fetched from an external provider.
 * Contains only the essential fields needed for contact matching.
 */
export interface RawContact {
  /** Email address (required for contact matching) */
  email: string;
  /** Display name from the contact provider, may be null */
  displayName: string | null;
}

/**
 * Result of fetching contacts from a provider.
 */
export interface ContactProviderResult {
  /** Contacts that have valid email addresses */
  contacts: RawContact[];
  /** Total number of contacts fetched from API (including those without emails) */
  totalFetched: number;
}

/**
 * Interface for contact providers (Google, Microsoft, etc.).
 * Each provider fetches contacts from an external service using OAuth tokens.
 */
export interface ContactProvider {
  /**
   * Fetch contacts from the external provider.
   * @param accessToken - OAuth access token for the provider's API
   * @returns Contacts with emails and fetch statistics
   */
  fetchContacts(accessToken: string): Promise<ContactProviderResult>;
}
