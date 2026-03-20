/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParentNotificationService } from '../parent-notification.service.js';

describe('ParentNotificationService', () => {
  let service: ParentNotificationService;
  let prisma: any;
  let emailService: any;
  let smsService: any;
  let pushService: any;

  const mockChild = {
    id: 'child-123',
    displayName: 'TestChild',
    parentEmail: 'parent@example.com',
    parentPhone: null,
    notifyByEmail: true,
    notifyByPush: false,
    notifyBySms: false,
    parentalConsent: {
      parentEmail: 'consent-parent@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    prisma = {
      user: {
        findUnique: vi.fn(),
      },
    };

    emailService = {
      sendDigestEmail: vi.fn().mockResolvedValue(undefined),
    };

    smsService = {
      sendParentAlert: vi.fn().mockResolvedValue({ success: false, error: 'SMS not enabled' }),
      sendSms: vi.fn().mockResolvedValue({ success: false, error: 'SMS not enabled' }),
    };

    pushService = {
      isAvailable: vi.fn().mockReturnValue(false),
      sendPush: vi.fn().mockResolvedValue({ success: false, error: 'Push not available' }),
      sendParentAlert: vi.fn().mockResolvedValue({ success: false, error: 'Push not available' }),
    };

    service = new ParentNotificationService(prisma, emailService, smsService, pushService);
  });

  describe('notifyParent', () => {
    it('should send notification successfully when parent contact exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockChild);

      const result = await service.notifyParent({
        childId: 'child-123',
        type: 'SAFETY_REPORT_SUBMITTED',
        priority: 'URGENT',
        title: 'Test Notification',
        message: 'This is a test message',
      });

      expect(result.success).toBe(true);
      expect(result.notificationId).toMatch(/^pn-/);
      expect(result.deliveryMethod).toBe('email');
      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'consent-parent@example.com', // Uses parental consent email first
          subject: expect.stringContaining('Test Notification'),
        }),
      );
    });

    it('should return error when no parent contact found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.notifyParent({
        childId: 'unknown-child',
        type: 'SAFETY_REPORT_SUBMITTED',
        priority: 'URGENT',
        title: 'Test',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No parent contact');
    });

    it('should return error when child has no parent email', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockChild,
        parentEmail: null,
        parentalConsent: null,
      });

      const result = await service.notifyParent({
        childId: 'child-123',
        type: 'SAFETY_REPORT_SUBMITTED',
        priority: 'URGENT',
        title: 'Test',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No parent contact');
    });

    it('should handle email service errors gracefully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockChild);
      emailService.sendDigestEmail.mockRejectedValue(new Error('Email failed'));

      const result = await service.notifyParent({
        childId: 'child-123',
        type: 'SAFETY_REPORT_SUBMITTED',
        priority: 'URGENT',
        title: 'Test',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email failed');
    });

    it('should include [URGENT] prefix for IMMEDIATE priority', async () => {
      prisma.user.findUnique.mockResolvedValue(mockChild);

      await service.notifyParent({
        childId: 'child-123',
        type: 'GROOMING_DETECTED',
        priority: 'IMMEDIATE',
        title: 'Safety Alert',
        message: 'Test message',
      });

      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringMatching(/^\[URGENT\]/),
        }),
      );
    });

    it('should include [Important] prefix for URGENT priority', async () => {
      prisma.user.findUnique.mockResolvedValue(mockChild);

      await service.notifyParent({
        childId: 'child-123',
        type: 'SAFETY_REPORT_SUBMITTED',
        priority: 'URGENT',
        title: 'Safety Report',
        message: 'Test message',
      });

      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringMatching(/^\[Important\]/),
        }),
      );
    });
  });

  describe('notifySafetyReport', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockChild);
    });

    it('should send notification for UNCOMFORTABLE reason', async () => {
      const result = await service.notifySafetyReport('child-123', 'UNCOMFORTABLE');

      expect(result.success).toBe(true);
      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('uncomfortable'),
        }),
      );
    });

    it('should use IMMEDIATE priority for STRANGER_CONTACT', async () => {
      await service.notifySafetyReport('child-123', 'STRANGER_CONTACT');

      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringMatching(/^\[URGENT\]/),
        }),
      );
    });

    it('should use IMMEDIATE priority for PERSONAL_QUESTIONS', async () => {
      await service.notifySafetyReport('child-123', 'PERSONAL_QUESTIONS');

      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringMatching(/^\[URGENT\]/),
        }),
      );
    });

    it('should use URGENT priority for SCARY_CONTENT', async () => {
      await service.notifySafetyReport('child-123', 'SCARY_CONTENT');

      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringMatching(/^\[Important\]/),
        }),
      );
    });

    it('should include additional info when provided', async () => {
      await service.notifySafetyReport(
        'child-123',
        'UNCOMFORTABLE',
        'Someone asked me weird questions',
      );

      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Someone asked me weird questions'),
        }),
      );
    });
  });

  describe('notifyGroomingDetected', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockChild);
    });

    it('should send IMMEDIATE priority notification', async () => {
      const result = await service.notifyGroomingDetected('child-123', 'TRUST_BUILDING', 0.92);

      expect(result.success).toBe(true);
      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringMatching(/^\[URGENT\].*Safety Alert/),
        }),
      );
    });

    it('should include recommended action in email', async () => {
      await service.notifyGroomingDetected('child-123', 'TRUST_BUILDING', 0.92);

      const callArgs = emailService.sendDigestEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('Recommended Action');
      expect(callArgs.html).toContain('conversation with your child');
    });
  });

  describe('notifyContentModerated', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockChild);
    });

    it('should send NORMAL priority for educate action', async () => {
      await service.notifyContentModerated('child-123', 'content-456', 'educate');

      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.not.stringMatching(/^\[/), // No prefix for NORMAL
        }),
      );
    });

    it('should send HIGH priority for warn action', async () => {
      await service.notifyContentModerated('child-123', 'content-456', 'warn');

      // HIGH priority has no prefix but should still be sent
      expect(emailService.sendDigestEmail).toHaveBeenCalled();
    });

    it('should include topic info when provided', async () => {
      await service.notifyContentModerated(
        'child-123',
        'content-456',
        'warn',
        'topic-789',
        'Climate Change Discussion',
      );

      expect(emailService.sendDigestEmail).toHaveBeenCalled();
    });

    it('should send HIGH priority for hide action', async () => {
      const result = await service.notifyContentModerated('child-123', 'content-456', 'hide');

      expect(result.success).toBe(true);
    });

    it('should send HIGH priority for remove action', async () => {
      const result = await service.notifyContentModerated('child-123', 'content-456', 'remove');

      expect(result.success).toBe(true);
    });
  });

  describe('email content generation', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockChild);
    });

    it('should generate HTML email with proper structure', async () => {
      await service.notifyParent({
        childId: 'child-123',
        type: 'SAFETY_REPORT_SUBMITTED',
        priority: 'URGENT',
        title: 'Safety Report',
        message: 'Your child submitted a safety report.',
        context: {
          recommendedAction: 'Please check in with your child.',
        },
      });

      const callArgs = emailService.sendDigestEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('ReasonBridge');
      expect(callArgs.html).toContain('Safety Report');
      expect(callArgs.html).toContain('Please check in with your child');
      expect(callArgs.html).toContain('Parent Dashboard');
    });

    it('should generate plain text email', async () => {
      await service.notifyParent({
        childId: 'child-123',
        type: 'SAFETY_REPORT_SUBMITTED',
        priority: 'URGENT',
        title: 'Safety Report',
        message: 'Your child submitted a safety report.',
      });

      const callArgs = emailService.sendDigestEmail.mock.calls[0][0];
      expect(callArgs.text).toContain('Safety Report');
      expect(callArgs.text).toContain('submitted a safety report');
    });

    it('should extract parent name from email', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockChild,
        parentalConsent: { parentEmail: 'john.doe@example.com' },
      });

      await service.notifyParent({
        childId: 'child-123',
        type: 'SAFETY_REPORT_SUBMITTED',
        priority: 'URGENT',
        title: 'Test',
        message: 'Test message',
      });

      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('John Doe'),
        }),
      );
    });

    it('should use fallback parent email when consent email is not available', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockChild,
        parentalConsent: null,
      });

      await service.notifyParent({
        childId: 'child-123',
        type: 'SAFETY_REPORT_SUBMITTED',
        priority: 'URGENT',
        title: 'Test',
        message: 'Test message',
      });

      expect(emailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'parent@example.com',
        }),
      );
    });
  });
});
