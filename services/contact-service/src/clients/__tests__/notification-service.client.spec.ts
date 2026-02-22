/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotificationServiceClient } from '../notification-service.client.js';

describe('NotificationServiceClient', () => {
  let client: NotificationServiceClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new NotificationServiceClient();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendInvitationNotification', () => {
    const invitationParams = {
      recipientUserId: 'user-123',
      inviterName: 'John Doe',
      topicTitle: 'Climate Change Discussion',
      invitationId: 'inv-456',
      message: 'Please join our discussion!',
    };

    it('should send notification to notification-service', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.sendInvitationNotification(invitationParams);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"type":"TOPIC_INVITATION"'),
        }),
      );
    });

    it('should include all required fields in notification payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.sendInvitationNotification(invitationParams);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.userId).toBe('user-123');
      expect(callBody.type).toBe('TOPIC_INVITATION');
      expect(callBody.title).toContain('invited');
      expect(callBody.metadata.invitationId).toBe('inv-456');
      expect(callBody.metadata.inviterName).toBe('John Doe');
      expect(callBody.metadata.topicTitle).toBe('Climate Change Discussion');
    });

    it('should include optional message in metadata when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.sendInvitationNotification(invitationParams);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.metadata.message).toBe('Please join our discussion!');
    });

    it('should not include message in metadata when not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const paramsWithoutMessage = {
        recipientUserId: 'user-123',
        inviterName: 'John Doe',
        topicTitle: 'Climate Change Discussion',
        invitationId: 'inv-456',
      };

      await client.sendInvitationNotification(paramsWithoutMessage);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.metadata.message).toBeUndefined();
    });

    it('should not throw on fetch error (fire-and-forget)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(client.sendInvitationNotification(invitationParams)).resolves.toBeUndefined();
    });

    it('should not throw on non-ok response (fire-and-forget)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      // Should not throw
      await expect(client.sendInvitationNotification(invitationParams)).resolves.toBeUndefined();
    });
  });

  describe('sendInvitationAcceptedNotification', () => {
    const acceptedParams = {
      inviterUserId: 'user-789',
      accepterName: 'Jane Smith',
      topicTitle: 'Climate Change Discussion',
    };

    it('should send notification to notification-service', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.sendInvitationAcceptedNotification(acceptedParams);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"type":"INVITATION_ACCEPTED"'),
        }),
      );
    });

    it('should include all required fields in notification payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.sendInvitationAcceptedNotification(acceptedParams);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.userId).toBe('user-789');
      expect(callBody.type).toBe('INVITATION_ACCEPTED');
      expect(callBody.title).toContain('accepted');
      expect(callBody.metadata.accepterName).toBe('Jane Smith');
      expect(callBody.metadata.topicTitle).toBe('Climate Change Discussion');
    });

    it('should not throw on fetch error (fire-and-forget)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(
        client.sendInvitationAcceptedNotification(acceptedParams),
      ).resolves.toBeUndefined();
    });

    it('should not throw on non-ok response (fire-and-forget)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      });

      // Should not throw
      await expect(
        client.sendInvitationAcceptedNotification(acceptedParams),
      ).resolves.toBeUndefined();
    });
  });

  describe('configuration', () => {
    it('should use NOTIFICATION_SERVICE_URL env var when set', async () => {
      const originalEnv = process.env['NOTIFICATION_SERVICE_URL'];
      process.env['NOTIFICATION_SERVICE_URL'] = 'http://custom-host:9999';

      const customClient = new NotificationServiceClient();
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      await customClient.sendInvitationNotification({
        recipientUserId: 'user-1',
        inviterName: 'Test',
        topicTitle: 'Test Topic',
        invitationId: 'inv-1',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom-host:9999/notifications',
        expect.any(Object),
      );

      // Restore env
      if (originalEnv !== undefined) {
        process.env['NOTIFICATION_SERVICE_URL'] = originalEnv;
      } else {
        delete process.env['NOTIFICATION_SERVICE_URL'];
      }
    });
  });
});
