/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import type { ContactProvider, ContactProviderResult, RawContact } from './types.js';

/** Maximum number of contacts to fetch to prevent abuse */
const MAX_CONTACTS = 5000;

/**
 * Google Contacts Provider - fetches contacts from Google People API.
 *
 * Uses OAuth2 access tokens to authenticate with Google's People API
 * and retrieve the user's contacts. Handles pagination automatically
 * and respects a maximum contact limit to prevent abuse.
 *
 * @remarks
 * - Only contacts with email addresses are included in results
 * - Uses the first email and name when multiple exist
 * - Implements pagination to handle large contact lists
 * - Logs fetch statistics for monitoring
 *
 * @example
 * ```typescript
 * const provider = new GoogleContactsProvider();
 * const result = await provider.fetchContacts(googleAccessToken);
 * console.log(`Fetched ${result.contacts.length} contacts`);
 * ```
 */
@Injectable()
export class GoogleContactsProvider implements ContactProvider {
  private readonly logger = new Logger(GoogleContactsProvider.name);

  /**
   * Fetch contacts from Google People API.
   *
   * @param accessToken - Google OAuth2 access token with contacts.readonly scope
   * @returns Contacts with valid email addresses and fetch statistics
   * @throws Error if the Google API call fails (e.g., invalid token, quota exceeded)
   */
  async fetchContacts(accessToken: string): Promise<ContactProviderResult> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const peopleApi = google.people({ version: 'v1', auth: oauth2Client });

    const contacts: RawContact[] = [];
    let pageToken: string | undefined;
    let totalFetched = 0;

    try {
      do {
        const response = await peopleApi.people.connections.list({
          resourceName: 'people/me',
          pageSize: 1000,
          pageToken,
          personFields: 'names,emailAddresses',
        });

        const connections = response.data.connections || [];

        for (const connection of connections) {
          if (contacts.length >= MAX_CONTACTS) {
            this.logger.warn(`Reached max contacts limit (${MAX_CONTACTS})`);
            break;
          }

          const email = connection.emailAddresses?.[0]?.value;
          if (!email) continue;

          const displayName = connection.names?.[0]?.displayName || null;
          contacts.push({ email, displayName });
        }

        totalFetched += connections.length;
        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken && contacts.length < MAX_CONTACTS);

      this.logger.log(`Fetched ${contacts.length} contacts with emails from Google`);
      return { contacts, totalFetched };
    } catch (error) {
      this.logger.error('Failed to fetch Google contacts', error);
      throw error;
    }
  }
}
