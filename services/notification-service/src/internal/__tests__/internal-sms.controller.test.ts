/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalSmsController, SendVerificationCodeDto } from '../internal-sms.controller.js';

describe('InternalSmsController', () => {
  let controller: InternalSmsController;
  let mockSmsService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSmsService = {
      sendVerificationCode: vi.fn(),
    };

    controller = new InternalSmsController(mockSmsService);
  });

  describe('sendVerificationCode', () => {
    it('should send verification code successfully', async () => {
      mockSmsService.sendVerificationCode.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const dto: SendVerificationCodeDto = {
        phoneNumber: '+14155551234',
        code: '123456',
      };

      const result = await controller.sendVerificationCode(dto);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockSmsService.sendVerificationCode).toHaveBeenCalledWith('+14155551234', '123456');
    });

    it('should return error when SMS delivery fails', async () => {
      mockSmsService.sendVerificationCode.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
      });

      const dto: SendVerificationCodeDto = {
        phoneNumber: '+14155551234',
        code: '123456',
      };

      const result = await controller.sendVerificationCode(dto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle various phone number formats', async () => {
      mockSmsService.sendVerificationCode.mockResolvedValue({
        success: true,
        messageId: 'msg-456',
      });

      // Test with different valid E.164 formats
      const phoneNumbers = ['+1234567890', '+447911123456', '+861234567890'];

      for (const phoneNumber of phoneNumbers) {
        const dto: SendVerificationCodeDto = {
          phoneNumber,
          code: '999888',
        };

        await controller.sendVerificationCode(dto);

        expect(mockSmsService.sendVerificationCode).toHaveBeenCalledWith(phoneNumber, '999888');
      }
    });

    it('should pass through error message from SMS service', async () => {
      mockSmsService.sendVerificationCode.mockResolvedValue({
        success: false,
        error: 'Invalid phone number format: +1invalid. Expected E.164 format (e.g., +14155551234)',
      });

      const dto: SendVerificationCodeDto = {
        phoneNumber: '+1invalid',
        code: '123456',
      };

      const result = await controller.sendVerificationCode(dto);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number format');
    });
  });
});
