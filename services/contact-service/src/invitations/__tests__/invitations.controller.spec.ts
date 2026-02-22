/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvitationsController } from '../invitations.controller.js';
import { InvitationStatusDto } from '../dto/invitation-response.dto.js';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let mockService: any;

  const mockUserId = 'user-123';
  const mockInvitationId = 'invitation-456';

  beforeEach(() => {
    mockService = {
      createInvitation: vi.fn(),
      acceptInvitation: vi.fn(),
      declineInvitation: vi.fn(),
      getSentInvitations: vi.fn(),
      getReceivedInvitations: vi.fn(),
    };
    controller = new InvitationsController(mockService);
  });

  describe('createInvitation', () => {
    it('should create an invitation and return response', async () => {
      const dto = {
        topicId: 'topic-123',
        inviteeUserId: 'invitee-789',
        message: 'Join this discussion!',
      };
      const mockResponse = {
        id: mockInvitationId,
        topicId: dto.topicId,
        status: 'PENDING',
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      mockService.createInvitation.mockResolvedValue(mockResponse);

      const mockRequest = { user: { id: mockUserId } };
      const result = await controller.createInvitation(mockRequest as any, dto);

      expect(mockService.createInvitation).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockResponse);
    });

    it('should create invitation with email instead of userId', async () => {
      const dto = {
        topicId: 'topic-123',
        inviteeEmail: 'new@example.com',
      };
      const mockResponse = {
        id: mockInvitationId,
        topicId: dto.topicId,
        status: 'PENDING',
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      mockService.createInvitation.mockResolvedValue(mockResponse);

      const mockRequest = { user: { id: mockUserId } };
      const result = await controller.createInvitation(mockRequest as any, dto);

      expect(mockService.createInvitation).toHaveBeenCalledWith(mockUserId, dto);
      expect(result.id).toBe(mockInvitationId);
    });
  });

  describe('getSentInvitations', () => {
    it('should return paginated sent invitations', async () => {
      const query = { limit: 20, page: 1 };
      const mockResponse = {
        invitations: [
          {
            id: mockInvitationId,
            topicId: 'topic-123',
            inviterId: mockUserId,
            status: InvitationStatusDto.PENDING,
            createdAt: new Date(),
            expiresAt: new Date(),
          },
        ],
        total: 1,
        hasMore: false,
      };
      mockService.getSentInvitations.mockResolvedValue(mockResponse);

      const mockRequest = { user: { id: mockUserId } };
      const result = await controller.getSentInvitations(mockRequest as any, query);

      expect(mockService.getSentInvitations).toHaveBeenCalledWith(mockUserId, query);
      expect(result.invitations).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status when provided', async () => {
      const query = { status: InvitationStatusDto.ACCEPTED, limit: 10, page: 2 };
      mockService.getSentInvitations.mockResolvedValue({
        invitations: [],
        total: 0,
        hasMore: false,
      });

      const mockRequest = { user: { id: mockUserId } };
      await controller.getSentInvitations(mockRequest as any, query);

      expect(mockService.getSentInvitations).toHaveBeenCalledWith(mockUserId, query);
    });
  });

  describe('getReceivedInvitations', () => {
    it('should return paginated received invitations', async () => {
      const query = { limit: 20, page: 1 };
      const mockResponse = {
        invitations: [
          {
            id: mockInvitationId,
            topicId: 'topic-456',
            inviterId: 'other-user',
            status: InvitationStatusDto.PENDING,
            createdAt: new Date(),
            expiresAt: new Date(),
          },
        ],
        total: 1,
        hasMore: false,
      };
      mockService.getReceivedInvitations.mockResolvedValue(mockResponse);

      const mockRequest = { user: { id: mockUserId } };
      const result = await controller.getReceivedInvitations(mockRequest as any, query);

      expect(mockService.getReceivedInvitations).toHaveBeenCalledWith(mockUserId, query);
      expect(result.invitations).toHaveLength(1);
    });

    it('should handle pagination correctly', async () => {
      const query = { limit: 50, page: 3 };
      mockService.getReceivedInvitations.mockResolvedValue({
        invitations: [],
        total: 150,
        hasMore: false,
      });

      const mockRequest = { user: { id: mockUserId } };
      const result = await controller.getReceivedInvitations(mockRequest as any, query);

      expect(mockService.getReceivedInvitations).toHaveBeenCalledWith(mockUserId, query);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and return response', async () => {
      const mockResponse = {
        success: true,
        topicId: 'topic-123',
        redirectUrl: '/topics/topic-123',
      };
      mockService.acceptInvitation.mockResolvedValue(mockResponse);

      const mockRequest = { user: { id: mockUserId } };
      const result = await controller.acceptInvitation(mockRequest as any, mockInvitationId);

      expect(mockService.acceptInvitation).toHaveBeenCalledWith(mockInvitationId, mockUserId);
      expect(result.success).toBe(true);
      expect(result.redirectUrl).toBe('/topics/topic-123');
    });
  });

  describe('declineInvitation', () => {
    it('should decline invitation and return success', async () => {
      mockService.declineInvitation.mockResolvedValue(undefined);

      const mockRequest = { user: { id: mockUserId } };
      const result = await controller.declineInvitation(mockRequest as any, mockInvitationId);

      expect(mockService.declineInvitation).toHaveBeenCalledWith(mockInvitationId, mockUserId);
      expect(result).toEqual({ success: true });
    });
  });
});
