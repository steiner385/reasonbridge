/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ContactsProxyController,
  InvitationsProxyController,
} from '../contacts-proxy.controller.js';
import type { ProxyService } from '../proxy.service.js';
import type { FastifyReply } from 'fastify';

describe('ContactsProxyController', () => {
  let controller: ContactsProxyController;
  let mockProxyService: ProxyService;
  let mockRes: FastifyReply;

  beforeEach(() => {
    mockProxyService = {
      proxyToContactService: vi.fn().mockResolvedValue({
        status: 200,
        data: { success: true },
      }),
    } as unknown as ProxyService;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as FastifyReply;

    controller = new ContactsProxyController(mockProxyService);
  });

  describe('initiateConnection', () => {
    it('should proxy POST /connections/initiate to contact-service', async () => {
      const body = { provider: 'google', redirectUri: 'https://app.example.com/callback' };
      const authHeader = 'Bearer token123';

      await controller.initiateConnection(body, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/connections/initiate',
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const body = { provider: 'google' };

      await controller.initiateConnection(body, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/connections/initiate',
        body,
        headers: undefined,
      });
    });
  });

  describe('handleCallback', () => {
    it('should proxy POST /connections/callback to contact-service', async () => {
      const body = { provider: 'google', code: 'oauth-code-123', state: 'state-token' };
      const authHeader = 'Bearer token123';

      await controller.handleCallback(body, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/connections/callback',
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const body = { provider: 'google', code: 'oauth-code-123' };

      await controller.handleCallback(body, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/connections/callback',
        body,
        headers: undefined,
      });
    });
  });

  describe('importContacts', () => {
    it('should proxy POST /contacts/import to contact-service', async () => {
      const body = { provider: 'google', accessToken: 'token-xyz' };
      const authHeader = 'Bearer token123';

      await controller.importContacts(body, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/contacts/import',
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const body = { provider: 'google' };

      await controller.importContacts(body, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/contacts/import',
        body,
        headers: undefined,
      });
    });
  });

  describe('listContacts', () => {
    it('should proxy GET /contacts to contact-service with query params', async () => {
      const query = { page: '1', limit: '20', provider: 'google' };
      const authHeader = 'Bearer token123';

      await controller.listContacts(query, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/contacts',
        query,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const query = { page: '1' };

      await controller.listContacts(query, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/contacts',
        query,
        headers: undefined,
      });
    });

    it('should proxy with empty query params', async () => {
      const query = {};
      const authHeader = 'Bearer token123';

      await controller.listContacts(query, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/contacts',
        query: {},
        headers: { Authorization: authHeader },
      });
    });
  });

  describe('discoverUsers', () => {
    it('should proxy GET /contacts/discover to contact-service with query params', async () => {
      const query = { page: '1', limit: '10' };
      const authHeader = 'Bearer token123';

      await controller.discoverUsers(query, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/contacts/discover',
        query,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const query = {};

      await controller.discoverUsers(query, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/contacts/discover',
        query,
        headers: undefined,
      });
    });
  });

  describe('response status handling', () => {
    it('should forward non-200 status codes from the proxy service', async () => {
      (mockProxyService.proxyToContactService as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 404,
        data: { message: 'Not found' },
      });

      const body = { provider: 'google' };
      const authHeader = 'Bearer token123';

      await controller.importContacts(body, authHeader, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({ message: 'Not found' });
    });

    it('should forward 500 error status from the proxy service', async () => {
      (mockProxyService.proxyToContactService as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 500,
        data: { error: 'Internal Server Error' },
      });

      const query = {};
      const authHeader = 'Bearer token123';

      await controller.listContacts(query, authHeader, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });
});

describe('InvitationsProxyController', () => {
  let controller: InvitationsProxyController;
  let mockProxyService: ProxyService;
  let mockRes: FastifyReply;

  beforeEach(() => {
    mockProxyService = {
      proxyToContactService: vi.fn().mockResolvedValue({
        status: 200,
        data: { success: true },
      }),
    } as unknown as ProxyService;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as FastifyReply;

    controller = new InvitationsProxyController(mockProxyService);
  });

  describe('createInvitation', () => {
    it('should proxy POST /invitations to contact-service', async () => {
      const body = {
        topicId: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
        recipientId: 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7',
        message: 'Join this discussion!',
      };
      const authHeader = 'Bearer token123';

      await controller.createInvitation(body, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/invitations',
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const body = { topicId: 'topic-123', recipientId: 'user-456' };

      await controller.createInvitation(body, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/invitations',
        body,
        headers: undefined,
      });
    });
  });

  describe('listSentInvitations', () => {
    it('should proxy GET /invitations/sent to contact-service with query params', async () => {
      const query = { page: '1', limit: '20', status: 'pending' };
      const authHeader = 'Bearer token123';

      await controller.listSentInvitations(query, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/invitations/sent',
        query,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const query = { page: '1' };

      await controller.listSentInvitations(query, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/invitations/sent',
        query,
        headers: undefined,
      });
    });

    it('should proxy with empty query params', async () => {
      const query = {};
      const authHeader = 'Bearer token123';

      await controller.listSentInvitations(query, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/invitations/sent',
        query: {},
        headers: { Authorization: authHeader },
      });
    });
  });

  describe('listReceivedInvitations', () => {
    it('should proxy GET /invitations/received to contact-service with query params', async () => {
      const query = { page: '2', limit: '10' };
      const authHeader = 'Bearer token123';

      await controller.listReceivedInvitations(query, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/invitations/received',
        query,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const query = {};

      await controller.listReceivedInvitations(query, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/invitations/received',
        query,
        headers: undefined,
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should proxy POST /invitations/:id/accept to contact-service with valid UUID', async () => {
      const invitationId = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
      const authHeader = 'Bearer token123';

      await controller.acceptInvitation(invitationId, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: `/invitations/${invitationId}/accept`,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const invitationId = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';

      await controller.acceptInvitation(invitationId, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: `/invitations/${invitationId}/accept`,
        headers: undefined,
      });
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'not-a-valid-uuid';
      const authHeader = 'Bearer token123';

      await controller.acceptInvitation(invalidId, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Invalid invitation ID format: expected UUID',
        error: 'Bad Request',
      });
    });

    it('should return 400 for empty string', async () => {
      const invalidId = '';
      const authHeader = 'Bearer token123';

      await controller.acceptInvitation(invalidId, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for numeric-only string', async () => {
      const invalidId = '12345678';
      const authHeader = 'Bearer token123';

      await controller.acceptInvitation(invalidId, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('declineInvitation', () => {
    it('should proxy POST /invitations/:id/decline to contact-service with valid UUID', async () => {
      const invitationId = 'b2c3d4e5-f6a7-48b9-89d1-e2f3a4b5c6d7';
      const authHeader = 'Bearer token123';

      await controller.declineInvitation(invitationId, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: `/invitations/${invitationId}/decline`,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const invitationId = 'b2c3d4e5-f6a7-48b9-89d1-e2f3a4b5c6d7';

      await controller.declineInvitation(invitationId, undefined, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalledWith({
        method: 'POST',
        path: `/invitations/${invitationId}/decline`,
        headers: undefined,
      });
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'bad-id';
      const authHeader = 'Bearer token123';

      await controller.declineInvitation(invalidId, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Invalid invitation ID format: expected UUID',
        error: 'Bad Request',
      });
    });

    it('should accept UUID v7 format (permissive UUID validation)', async () => {
      // UUID v7 format (newer version) should be accepted by the permissive validator
      const validV7Id = 'a1b2c3d4-e5f6-77a8-b9c0-d1e2f3a4b5c6';
      const authHeader = 'Bearer token123';
      (mockProxyService.proxyToContactService as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await controller.declineInvitation(validV7Id, authHeader, mockRes);

      expect(mockProxyService.proxyToContactService).toHaveBeenCalled();
    });
  });

  describe('response status handling', () => {
    it('should forward 201 status for created invitation', async () => {
      (mockProxyService.proxyToContactService as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 201,
        data: { id: 'new-invitation-id', status: 'pending' },
      });

      const body = { topicId: 'topic-123', recipientId: 'user-456' };
      const authHeader = 'Bearer token123';

      await controller.createInvitation(body, authHeader, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.send).toHaveBeenCalledWith({ id: 'new-invitation-id', status: 'pending' });
    });

    it('should forward 404 status when invitation not found', async () => {
      (mockProxyService.proxyToContactService as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 404,
        data: { message: 'Invitation not found' },
      });

      const invitationId = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
      const authHeader = 'Bearer token123';

      await controller.acceptInvitation(invitationId, authHeader, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({ message: 'Invitation not found' });
    });

    it('should forward 409 status for already accepted invitation', async () => {
      (mockProxyService.proxyToContactService as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 409,
        data: { message: 'Invitation already accepted' },
      });

      const invitationId = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
      const authHeader = 'Bearer token123';

      await controller.acceptInvitation(invitationId, authHeader, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.send).toHaveBeenCalledWith({ message: 'Invitation already accepted' });
    });
  });
});
