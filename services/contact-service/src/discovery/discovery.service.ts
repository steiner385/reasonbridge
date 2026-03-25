/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DiscoveryResponseDto, DiscoveryQueryDto } from './dto/discovered-user.dto.js';

/**
 * Service for discovering ReasonBridge users from imported contacts.
 *
 * Matches imported contact email hashes against users who have opted in
 * to be discoverable by contacts (discoverableByContacts=true). When
 * matches are found, updates the ImportedContact.matchedUserId field.
 *
 * @remarks
 * - Only users with discoverableByContacts=true are discoverable
 * - The owner is excluded from discovery results (can't discover self)
 * - Email hashes are matched for privacy-preserving discovery
 * - Pagination is supported via limit/offset parameters
 *
 * @example
 * ```typescript
 * // Discover users from contacts
 * const result = await discoveryService.discoverUsers('user-123', {
 *   limit: 50,
 *   offset: 0,
 * });
 * console.log(`Found ${result.total} discoverable users`);
 * ```
 */
@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Discover ReasonBridge users from imported contacts.
   *
   * @param ownerId - The ID of the user performing discovery
   * @param query - Query parameters for pagination
   * @returns List of discovered users with profile info and total count
   */
  async discoverUsers(ownerId: string, query: DiscoveryQueryDto): Promise<DiscoveryResponseDto> {
    const { limit = 50, offset = 0 } = query;

    // Get all email hashes from user's imported contacts
    const contacts = await this.prisma.importedContact.findMany({
      where: { ownerId },
      select: { id: true, emailHash: true, matchedUserId: true },
    });

    if (contacts.length === 0) {
      return { users: [], total: 0 };
    }

    const emailHashes = contacts.map((c) => c.emailHash);

    // Find discoverable users whose email hash matches imported contacts
    const discoveredUsers = await this.prisma.user.findMany({
      where: {
        emailHash: { in: emailHashes },
        discoverableByContacts: true,
        id: { not: ownerId }, // Exclude the owner themselves
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        emailHash: true,
      },
      take: limit,
      skip: offset,
    });

    // Update matchedUserId on imported contacts for each discovered user
    for (const user of discoveredUsers) {
      if (user.emailHash) {
        await this.prisma.importedContact.updateMany({
          where: {
            ownerId,
            emailHash: user.emailHash,
          },
          data: {
            matchedUserId: user.id,
          },
        });
      }
    }

    this.logger.log(`Discovered ${discoveredUsers.length} users for owner ${ownerId}`);

    // Calculate mutual contacts for each discovered user
    const mutualContactsCounts = await this.calculateMutualContacts(
      ownerId,
      discoveredUsers.map((u) => u.id),
    );

    return {
      users: discoveredUsers.map((u) => ({
        userId: u.id,
        displayName: u.displayName || 'Unknown',
        avatarUrl: u.avatarUrl || undefined,
        mutualContacts: mutualContactsCounts.get(u.id) || 0,
      })),
      total: discoveredUsers.length,
    };
  }

  /**
   * Calculate mutual contacts for a batch of discovered users.
   *
   * Mutual contacts are users who:
   * 1. Are in the requesting user's contact list (matched to a ReasonBridge user)
   * 2. Also have the discovered user in their own contact list
   *
   * @param ownerId - The ID of the requesting user
   * @param discoveredUserIds - IDs of discovered users to calculate mutual contacts for
   * @returns Map of discovered user ID to mutual contacts count
   */
  private async calculateMutualContacts(
    ownerId: string,
    discoveredUserIds: string[],
  ): Promise<Map<string, number>> {
    if (discoveredUserIds.length === 0) {
      return new Map();
    }

    // Get all of ownerId's contacts who are matched to ReasonBridge users
    const ownerMatchedContacts = await this.prisma.importedContact.findMany({
      where: {
        ownerId,
        matchedUserId: { not: null },
      },
      select: { matchedUserId: true },
    });

    const matchedContactUserIds = ownerMatchedContacts
      .map((c) => c.matchedUserId)
      .filter((id): id is string => id !== null);

    if (matchedContactUserIds.length === 0) {
      return new Map();
    }

    // For each discovered user, count how many of owner's contacts also have them as a contact
    // Query: Find ImportedContact records where:
    // - ownerId is one of the matched contact users (not the requesting user)
    // - matchedUserId is one of the discovered users
    const mutualContactsData = await this.prisma.importedContact.groupBy({
      by: ['matchedUserId'],
      where: {
        ownerId: { in: matchedContactUserIds },
        matchedUserId: { in: discoveredUserIds },
      },
      _count: {
        ownerId: true,
      },
    });

    // Build the result map
    const result = new Map<string, number>();
    for (const row of mutualContactsData) {
      if (row.matchedUserId) {
        result.set(row.matchedUserId, row._count.ownerId);
      }
    }

    return result;
  }
}
