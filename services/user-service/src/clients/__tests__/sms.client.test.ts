/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmsClient } from '../sms.client.js';

describe('SmsClient', () => {
  let client: SmsClient;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    client = new SmsClient();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('sendVerificationCode', () => {
    it('should send verification code successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            messageId: 'msg-123',
          }),
      }) as any;

      const result = await client.sendVerificationCode('+14155551234', '123456');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/internal/sms/verification-code'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: '+14155551234', code: '123456' }),
        }),
      );
    });

    it('should return error when fetch returns non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      }) as any;

      const result = await client.sendVerificationCode('+14155551234', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 500');
    });

    it('should return error when SMS service returns failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Rate limit exceeded',
          }),
      }) as any;

      const result = await client.sendVerificationCode('+14155551234', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

      const result = await client.sendVerificationCode('+14155551234', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle timeout errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Request timeout')) as any;

      const result = await client.sendVerificationCode('+14155551234', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should use NOTIFICATION_SERVICE_URL from environment if available', async () => {
      const originalEnv = process.env['NOTIFICATION_SERVICE_URL'];
      process.env['NOTIFICATION_SERVICE_URL'] = 'http://custom-notification:8080';

      // Create new client to pick up env var
      const customClient = new SmsClient();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: 'msg-789' }),
      }) as any;

      await customClient.sendVerificationCode('+14155551234', '123456');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom-notification:8080/internal/sms/verification-code',
        expect.any(Object),
      );

      // Restore env var
      if (originalEnv === undefined) {
        delete process.env['NOTIFICATION_SERVICE_URL'];
      } else {
        process.env['NOTIFICATION_SERVICE_URL'] = originalEnv;
      }
    });
  });
});
