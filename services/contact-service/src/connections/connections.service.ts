/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { InitiateConnectionResponseDto } from './dto/initiate-connection.dto.js';
import { ConnectionListResponseDto } from './dto/connection-response.dto.js';

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async initiateConnection(
    userId: string,
    provider: string,
  ): Promise<InitiateConnectionResponseDto> {
    const state = randomBytes(16).toString('hex');

    let authUrl: string;
    if (provider === 'GOOGLE') {
      const clientId = process.env['GOOGLE_CLIENT_ID'] || '';
      const redirectUri = process.env['GOOGLE_REDIRECT_URI'] || '';
      const scopes = encodeURIComponent('https://www.googleapis.com/auth/contacts.readonly');
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}&access_type=offline`;
    } else {
      const clientId = process.env['FACEBOOK_CLIENT_ID'] || '';
      const redirectUri = process.env['FACEBOOK_REDIRECT_URI'] || '';
      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=email`;
    }

    return { authUrl, state };
  }

  async getConnections(userId: string): Promise<ConnectionListResponseDto> {
    const connections = await this.prisma.socialConnection.findMany({
      where: { userId },
    });

    const connectionsWithCounts = await Promise.all(
      connections.map(async (conn) => {
        const contactCount = await this.prisma.importedContact.count({
          where: { ownerId: userId, provider: conn.provider },
        });
        return {
          id: conn.id,
          provider: conn.provider,
          connectedAt: conn.createdAt,
          contactCount,
        };
      }),
    );

    return { connections: connectionsWithCounts };
  }

  async disconnectProvider(userId: string, provider: string): Promise<void> {
    const connection = await this.prisma.socialConnection.findUnique({
      where: { userId_provider: { userId, provider: provider as any } },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    await this.prisma.importedContact.deleteMany({
      where: { ownerId: userId, provider: provider as any },
    });

    await this.prisma.socialConnection.delete({
      where: { id: connection.id },
    });

    this.logger.log(`Disconnected ${provider} for user ${userId}`);
  }
}
