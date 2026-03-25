/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { generateNotificationEmail, type NotificationEmailData } from '../notification.template.js';

describe('generateNotificationEmail', () => {
  const createTestData = (
    overrides: Partial<NotificationEmailData> = {},
  ): NotificationEmailData => ({
    recipientName: 'Jane Doe',
    title: 'You were mentioned',
    body: 'Alex mentioned you in "Climate Change Discussion"',
    actionUrl: '/topics/climate-change?response=123',
    type: 'mention',
    baseUrl: 'https://reasonbridge.org',
    ...overrides,
  });

  describe('subject line', () => {
    it('should include emoji based on notification type', () => {
      const mentionResult = generateNotificationEmail(createTestData({ type: 'mention' }));
      expect(mentionResult.subject).toContain('💬');

      const followResult = generateNotificationEmail(createTestData({ type: 'follow' }));
      expect(followResult.subject).toContain('👤');

      const commonGroundResult = generateNotificationEmail(
        createTestData({ type: 'common_ground' }),
      );
      expect(commonGroundResult.subject).toContain('🤝');

      const moderationResult = generateNotificationEmail(createTestData({ type: 'moderation' }));
      expect(moderationResult.subject).toContain('⚠️');

      const generalResult = generateNotificationEmail(createTestData({ type: 'general' }));
      expect(generalResult.subject).toContain('🔔');
    });

    it('should include the notification title', () => {
      const result = generateNotificationEmail(createTestData());
      expect(result.subject).toContain('You were mentioned');
    });
  });

  describe('email structure', () => {
    it('should return subject, html, and text properties', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.html).toBe('string');
      expect(typeof result.text).toBe('string');
    });
  });

  describe('greeting section', () => {
    it('should include recipient name in greeting', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result.html).toContain('Jane Doe');
      expect(result.text).toContain('Jane Doe');
    });

    it('should handle missing recipient name', () => {
      const result = generateNotificationEmail(createTestData({ recipientName: '' }));

      // Should not contain empty Hi
      expect(result.html).toContain('Hi');
      expect(result.text).toContain('Hi');
    });
  });

  describe('notification body', () => {
    it('should include notification body text', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result.html).toContain('Alex mentioned you');
      expect(result.text).toContain('Alex mentioned you');
    });
  });

  describe('action button', () => {
    it('should include action button when actionUrl is provided', () => {
      const result = generateNotificationEmail(createTestData());

      // The template includes the raw actionUrl - the delivery service prepends baseUrl
      expect(result.html).toContain('/topics/climate-change?response=123');
      expect(result.html).toContain('View Details');
    });

    it('should use custom action text when provided', () => {
      const result = generateNotificationEmail(createTestData({ actionText: 'View Response' }));

      expect(result.html).toContain('View Response');
    });

    it('should not include action button when actionUrl is missing', () => {
      const result = generateNotificationEmail(createTestData({ actionUrl: undefined }));

      expect(result.html).not.toContain('View Details');
    });

    it('should include action URL in plain text version', () => {
      const result = generateNotificationEmail(createTestData());

      // The template includes the raw actionUrl
      expect(result.text).toContain('/topics/climate-change?response=123');
    });
  });

  describe('notification type colors', () => {
    it('should use blue for mention notifications', () => {
      const result = generateNotificationEmail(createTestData({ type: 'mention' }));
      expect(result.html).toContain('#3b82f6');
    });

    it('should use purple for follow notifications', () => {
      const result = generateNotificationEmail(createTestData({ type: 'follow' }));
      expect(result.html).toContain('#8b5cf6');
    });

    it('should use green for common ground notifications', () => {
      const result = generateNotificationEmail(createTestData({ type: 'common_ground' }));
      expect(result.html).toContain('#22c55e');
    });

    it('should use amber for moderation notifications', () => {
      const result = generateNotificationEmail(createTestData({ type: 'moderation' }));
      expect(result.html).toContain('#f59e0b');
    });

    it('should use gray for general notifications', () => {
      const result = generateNotificationEmail(createTestData({ type: 'general' }));
      expect(result.html).toContain('#6b7280');
    });
  });

  describe('footer section', () => {
    it('should include notification preferences link', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result.html).toContain('/settings/notifications');
      expect(result.text).toContain('/settings/notifications');
    });

    it('should explain why user is receiving this email', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result.html).toContain('notification preferences');
      expect(result.text).toContain('notification preferences');
    });
  });

  describe('HTML formatting', () => {
    it('should include proper HTML structure', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html');
      expect(result.html).toContain('</html>');
      expect(result.html).toContain('<head>');
      expect(result.html).toContain('<body');
    });

    it('should include responsive meta tag', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result.html).toContain('viewport');
    });

    it('should include dark mode safe styles', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result.html).toContain('prefers-color-scheme');
    });
  });

  describe('XSS protection', () => {
    it('should escape HTML in recipient name', () => {
      const result = generateNotificationEmail(
        createTestData({ recipientName: '<script>alert("xss")</script>' }),
      );

      expect(result.html).not.toContain('<script>alert');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('should escape HTML in title', () => {
      const result = generateNotificationEmail(
        createTestData({ title: '<img src=x onerror=alert(1)>' }),
      );

      expect(result.html).not.toContain('<img src=x');
      expect(result.html).toContain('&lt;img');
    });

    it('should escape HTML in body', () => {
      const result = generateNotificationEmail(createTestData({ body: '<script>xss</script>' }));

      expect(result.html).not.toContain('<script>xss</script>');
      expect(result.html).toContain('&lt;script&gt;');
    });
  });

  describe('plain text formatting', () => {
    it('should not contain HTML tags', () => {
      const result = generateNotificationEmail(createTestData());

      // Should not have HTML tags in text version (except URLs)
      expect(result.text).not.toMatch(/<(?!http)[a-z]/i);
    });

    it('should be readable without HTML', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result.text).toContain('You were mentioned');
      expect(result.text).toContain('Alex mentioned you');
    });

    it('should include emoji in plain text', () => {
      const result = generateNotificationEmail(createTestData());

      expect(result.text).toContain('💬');
    });
  });
});
