/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationDeliveryService } from '../notification-delivery.service.js';
import type { NotificationForDelivery } from '../notification-delivery.service.js';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;
  let mockPrisma: any;
  let mockEmailService: any;
  let mockPushService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      notificationLog: {
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    mockEmailService = {
      sendDigestEmail: vi.fn(),
    };

    mockPushService = {
      isAvailable: vi.fn(),
      sendPush: vi.fn(),
    };

    service = new NotificationDeliveryService(mockPrisma, mockEmailService, mockPushService);
  });

  const createTestNotification = (
    overrides: Partial<NotificationForDelivery> = {},
  ): NotificationForDelivery => ({
    id: 'notification-123',
    type: 'mention',
    title: 'You were mentioned',
    body: 'Alex mentioned you in a discussion',
    actionUrl: '/topics/test?response=456',
    ...overrides,
  });

  describe('deliverNotification', () => {
    it('should deliver notification via email when user has email notifications enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: true,
        notifyByPush: false,
        fcmToken: null,
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockEmailService.sendDigestEmail.mockResolvedValue(undefined);

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0]?.channel).toBe('EMAIL');
      expect(result.channels[0]?.success).toBe(true);
      expect(mockEmailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@example.com',
          subject: expect.stringContaining('You were mentioned'),
        }),
      );
    });

    it('should deliver notification via push when user has push notifications enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: false,
        notifyByPush: true,
        fcmToken: 'fcm-token-abc',
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockPushService.isAvailable.mockReturnValue(true);
      mockPushService.sendPush.mockResolvedValue({
        success: true,
        messageId: 'push-msg-123',
      });

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0]?.channel).toBe('PUSH');
      expect(result.channels[0]?.success).toBe(true);
      expect(result.channels[0]?.externalId).toBe('push-msg-123');
      expect(mockPushService.sendPush).toHaveBeenCalledWith(
        'fcm-token-abc',
        expect.objectContaining({
          title: 'You were mentioned',
          body: 'Alex mentioned you in a discussion',
        }),
      );
    });

    it('should deliver notification via both email and push when both are enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: true,
        notifyByPush: true,
        fcmToken: 'fcm-token-abc',
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockEmailService.sendDigestEmail.mockResolvedValue(undefined);
      mockPushService.isAvailable.mockReturnValue(true);
      mockPushService.sendPush.mockResolvedValue({ success: true, messageId: 'push-123' });

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(2);
      expect(result.channels.map((c) => c.channel).sort()).toEqual(['EMAIL', 'PUSH']);
      expect(mockEmailService.sendDigestEmail).toHaveBeenCalled();
      expect(mockPushService.sendPush).toHaveBeenCalled();
    });

    it('should skip delivery when user has all notifications disabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: false,
        notifyByPush: false,
        fcmToken: null,
        accountStatus: 'ACTIVE',
      });

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(0);
      expect(mockEmailService.sendDigestEmail).not.toHaveBeenCalled();
      expect(mockPushService.sendPush).not.toHaveBeenCalled();
    });

    it('should skip delivery when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(0);
      expect(mockEmailService.sendDigestEmail).not.toHaveBeenCalled();
    });

    it('should skip delivery when user account is not active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: true,
        notifyByPush: true,
        fcmToken: 'fcm-token-abc',
        accountStatus: 'SUSPENDED',
      });

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(0);
      expect(mockEmailService.sendDigestEmail).not.toHaveBeenCalled();
    });

    it('should skip push when push service is not available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: false,
        notifyByPush: true,
        fcmToken: 'fcm-token-abc',
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockPushService.isAvailable.mockReturnValue(false);

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0]?.success).toBe(false);
      expect(result.channels[0]?.error).toContain('not configured');
    });

    it('should skip push when user has no FCM token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: false,
        notifyByPush: true,
        fcmToken: null,
        accountStatus: 'ACTIVE',
      });

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(0);
      expect(mockPushService.sendPush).not.toHaveBeenCalled();
    });

    it('should handle email delivery failure gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: true,
        notifyByPush: false,
        fcmToken: null,
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockEmailService.sendDigestEmail.mockRejectedValue(new Error('SMTP connection failed'));

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0]?.channel).toBe('EMAIL');
      expect(result.channels[0]?.success).toBe(false);
      expect(result.channels[0]?.error).toContain('SMTP connection failed');
    });

    it('should handle push delivery failure gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: false,
        notifyByPush: true,
        fcmToken: 'fcm-token-abc',
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockPushService.isAvailable.mockReturnValue(true);
      mockPushService.sendPush.mockResolvedValue({
        success: false,
        error: 'Device token is invalid or expired',
      });

      const result = await service.deliverNotification('user-123', createTestNotification());

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0]?.channel).toBe('PUSH');
      expect(result.channels[0]?.success).toBe(false);
      expect(result.channels[0]?.error).toContain('invalid or expired');
    });

    it('should log delivery attempts to NotificationLog', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: true,
        notifyByPush: false,
        fcmToken: null,
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockEmailService.sendDigestEmail.mockResolvedValue(undefined);

      await service.deliverNotification('user-123', createTestNotification());

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notificationId: 'notification-123',
          channel: 'EMAIL',
          status: 'PENDING',
          recipientEmail: 'jane@example.com',
        }),
      });

      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        }),
      });
    });

    it('should update log status to FAILED on delivery failure', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane Doe',
        notifyByEmail: true,
        notifyByPush: false,
        fcmToken: null,
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockEmailService.sendDigestEmail.mockRejectedValue(new Error('Failed'));

      await service.deliverNotification('user-123', createTestNotification());

      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Failed',
        }),
      });
    });

    it('should use "there" as fallback when displayName is null', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: null,
        notifyByEmail: true,
        notifyByPush: false,
        fcmToken: null,
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockEmailService.sendDigestEmail.mockResolvedValue(undefined);

      await service.deliverNotification('user-123', createTestNotification());

      expect(mockEmailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('there'),
        }),
      );
    });
  });

  describe('notification type mapping', () => {
    it('should map notification types to correct template types', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'jane@example.com',
        displayName: 'Jane',
        notifyByEmail: true,
        notifyByPush: false,
        fcmToken: null,
        accountStatus: 'ACTIVE',
      });

      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });
      mockEmailService.sendDigestEmail.mockResolvedValue(undefined);

      // Test mention type - should have blue color
      await service.deliverNotification('user-123', createTestNotification({ type: 'mention' }));
      expect(mockEmailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('#3b82f6'),
        }),
      );

      // Test follow type - should have purple color
      await service.deliverNotification('user-123', createTestNotification({ type: 'follow' }));
      expect(mockEmailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('#8b5cf6'),
        }),
      );
    });
  });
});
