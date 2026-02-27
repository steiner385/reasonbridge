/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContactHashService } from './contact-hash.service.js';
import { GoogleContactsProvider } from './providers/google-contacts.provider.js';
import { ImportContactsResponseDto } from './dto/import-contacts.dto.js';
import { ContactListResponseDto, ContactListQueryDto } from './dto/contact-response.dto.js';

/**
 * Service for managing imported contacts.
 *
 * Orchestrates contact import from social providers, hashes emails for privacy,
 * stores contacts in the database, and provides paginated contact listing
 * with filtering capabilities.
 *
 * @remarks
 * - Emails are hashed using SHA-256 before storage (privacy-preserving)
 * - Display names are truncated to first name + last initial
 * - Supports filtering by matched status and provider
 * - Pagination via limit/offset with hasMore indicator
 *
 * @example
 * ```typescript
 * // Import contacts from Google
 * const result = await contactsService.importContacts('user-123', 'GOOGLE');
 * console.log(`Imported ${result.imported} contacts`);
 *
 * // List contacts with pagination
 * const contacts = await contactsService.getContacts('user-123', {
 *   limit: 50,
 *   offset: 0,
 *   matched: true,
 * });
 * ```
 */
@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: ContactHashService,
    private readonly googleProvider: GoogleContactsProvider,
  ) {}

  /**
   * Import contacts from an external social provider.
   *
   * @param userId - The ID of the user importing contacts
   * @param provider - The social provider to import from (e.g., 'GOOGLE')
   * @returns Import statistics including count of imported contacts
   * @throws NotFoundException if no connection exists for the provider
   */
  async importContacts(userId: string, provider: string): Promise<ImportContactsResponseDto> {
    // Get the connection with access token
    const connection = await this.prisma.socialConnection.findUnique({
      where: { userId_provider: { userId, provider: provider as any } },
    });

    if (!connection) {
      throw new NotFoundException(`No ${provider} connection found`);
    }

    // Fetch contacts from provider
    let providerResult;
    if (provider === 'GOOGLE') {
      providerResult = await this.googleProvider.fetchContacts(connection.accessToken);
    } else {
      throw new Error(`Provider ${provider} not yet implemented`);
    }

    // Store contacts with hashed emails
    let imported = 0;
    for (const contact of providerResult.contacts) {
      const emailHash = this.hashService.hashEmail(contact.email);
      const displayName = this.hashService.truncateDisplayName(contact.displayName);

      await this.prisma.importedContact.upsert({
        where: {
          ownerId_emailHash: { ownerId: userId, emailHash },
        },
        create: {
          ownerId: userId,
          emailHash,
          displayName,
          provider: provider as any,
        },
        update: {
          displayName,
          provider: provider as any,
        },
      });

      imported++;
    }

    this.logger.log(`Imported ${imported} contacts for user ${userId} from ${provider}`);

    return {
      imported,
      matched: 0, // Will be updated by discovery service later
      provider,
    };
  }

  /**
   * Get paginated list of contacts for a user.
   *
   * @param userId - The ID of the user whose contacts to retrieve
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated contact list with total count and hasMore indicator
   */
  async getContacts(userId: string, query: ContactListQueryDto): Promise<ContactListResponseDto> {
    const { matched, provider, limit = 50, offset = 0 } = query;

    const where: any = { ownerId: userId };

    if (matched !== undefined) {
      where.matchedUserId = matched ? { not: null } : null;
    }

    if (provider) {
      where.provider = provider;
    }

    const [contacts, total] = await Promise.all([
      this.prisma.importedContact.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { importedAt: 'desc' },
      }),
      this.prisma.importedContact.count({ where }),
    ]);

    return {
      contacts: contacts.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        provider: c.provider,
        isMatched: !!c.matchedUserId,
        importedAt: c.importedAt,
      })),
      total,
      hasMore: offset + contacts.length < total,
    };
  }
}
