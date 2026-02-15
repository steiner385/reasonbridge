/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  validateErrorResponse,
  assertErrorResponse,
  assertErrorCode,
  assertErrorCodePrefix,
  assertHasCorrelationId,
  extractErrorCode,
  extractErrorMessage,
  extractCorrelationId,
  isErrorResponse,
  createMockErrorResponse,
  ERROR_CODE_PATTERN,
  DEFAULT_CORRELATION_ID_PATTERN,
  ISO_TIMESTAMP_PATTERN,
} from '../validators/error-response';
import { AssertionError } from '../assertions';

describe('Error Response Validator', () => {
  describe('Pattern Constants', () => {
    it('ERROR_CODE_PATTERN should match valid error codes', () => {
      expect(ERROR_CODE_PATTERN.test('AUTH_001')).toBe(true);
      expect(ERROR_CODE_PATTERN.test('VALIDATION_012')).toBe(true);
      expect(ERROR_CODE_PATTERN.test('RATE_LIMIT_005')).toBe(true);
    });

    it('ERROR_CODE_PATTERN should reject invalid codes', () => {
      expect(ERROR_CODE_PATTERN.test('auth_001')).toBe(false);
      expect(ERROR_CODE_PATTERN.test('AUTH001')).toBe(false);
      expect(ERROR_CODE_PATTERN.test('AUTH_01')).toBe(false);
    });

    it('DEFAULT_CORRELATION_ID_PATTERN should match valid UUIDs', () => {
      expect(DEFAULT_CORRELATION_ID_PATTERN.test('12345678-1234-1234-1234-123456789abc')).toBe(
        true,
      );
      expect(DEFAULT_CORRELATION_ID_PATTERN.test('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
        true,
      );
    });

    it('DEFAULT_CORRELATION_ID_PATTERN should reject invalid UUIDs', () => {
      expect(DEFAULT_CORRELATION_ID_PATTERN.test('not-a-uuid')).toBe(false);
      expect(DEFAULT_CORRELATION_ID_PATTERN.test('12345678-1234-1234-1234')).toBe(false);
    });

    it('ISO_TIMESTAMP_PATTERN should match valid timestamps', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15T12:30:45Z')).toBe(true);
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15T12:30:45.123Z')).toBe(true);
      expect(ISO_TIMESTAMP_PATTERN.test('2024-01-15T12:30:45')).toBe(true);
    });

    it('ISO_TIMESTAMP_PATTERN should reject invalid timestamps', () => {
      expect(ISO_TIMESTAMP_PATTERN.test('2024-1-15T12:30:45Z')).toBe(false);
      expect(ISO_TIMESTAMP_PATTERN.test('not-a-date')).toBe(false);
    });
  });

  describe('validateErrorResponse', () => {
    it('should validate a valid error response', () => {
      const response = {
        code: 'AUTH_001',
        message: 'Authentication required.',
      };

      const result = validateErrorResponse(response);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a complete error response', () => {
      const response = createMockErrorResponse();

      const result = validateErrorResponse(response);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null response', () => {
      const result = validateErrorResponse(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Response must be a non-null object');
    });

    it('should reject non-object response', () => {
      const result = validateErrorResponse('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Response must be a non-null object');
    });

    it('should reject missing code field', () => {
      const response = { message: 'Error occurred.' };

      const result = validateErrorResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: 'code'");
    });

    it('should reject non-string code field', () => {
      const response = { code: 123, message: 'Error occurred.' };

      const result = validateErrorResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'code' must be a string");
    });

    it('should reject invalid code format', () => {
      const response = { code: 'invalid', message: 'Error occurred.' };

      const result = validateErrorResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Field 'code' must match pattern CATEGORY_NNN");
    });

    it('should reject missing message field', () => {
      const response = { code: 'AUTH_001' };

      const result = validateErrorResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: 'message'");
    });

    it('should reject empty message field', () => {
      const response = { code: 'AUTH_001', message: '' };

      const result = validateErrorResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'message' must not be empty");
    });

    describe('with options', () => {
      it('should validate expectedCode', () => {
        const response = { code: 'AUTH_001', message: 'Error.' };

        const result = validateErrorResponse(response, { expectedCode: 'AUTH_002' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Expected error code 'AUTH_002', got: AUTH_001");
      });

      it('should validate expectedCodePrefix', () => {
        const response = { code: 'VALIDATION_001', message: 'Error.' };

        const result = validateErrorResponse(response, { expectedCodePrefix: 'AUTH_' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Expected error code prefix 'AUTH_', got: VALIDATION_001");
      });

      it('should require correlationId when specified', () => {
        const response = { code: 'AUTH_001', message: 'Error.' };

        const result = validateErrorResponse(response, { requireCorrelationId: true });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Missing required field: 'correlationId'");
      });

      it('should validate correlationId format', () => {
        const response = {
          code: 'AUTH_001',
          message: 'Error.',
          correlationId: 'invalid',
        };

        const result = validateErrorResponse(response, { requireCorrelationId: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("Field 'correlationId' must match pattern");
      });

      it('should require timestamp when specified', () => {
        const response = { code: 'AUTH_001', message: 'Error.' };

        const result = validateErrorResponse(response, { requireTimestamp: true });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Missing required field: 'timestamp'");
      });

      it('should validate timestamp format', () => {
        const response = {
          code: 'AUTH_001',
          message: 'Error.',
          timestamp: 'invalid',
        };

        const result = validateErrorResponse(response);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("Field 'timestamp' must be ISO 8601 format");
      });

      it('should require path when specified', () => {
        const response = { code: 'AUTH_001', message: 'Error.' };

        const result = validateErrorResponse(response, { requirePath: true });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Missing required field: 'path'");
      });

      it('should validate path format', () => {
        const response = {
          code: 'AUTH_001',
          message: 'Error.',
          path: 'no-leading-slash',
        };

        const result = validateErrorResponse(response);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Field 'path' must start with '/', got: no-leading-slash");
      });
    });

    it('should validate details field as object', () => {
      const response = {
        code: 'AUTH_001',
        message: 'Error.',
        details: 'not-an-object',
      };

      const result = validateErrorResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'details' must be a non-null object");
    });

    it('should reject array as details', () => {
      const response = {
        code: 'AUTH_001',
        message: 'Error.',
        details: ['not', 'valid'],
      };

      const result = validateErrorResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'details' must be a non-null object");
    });
  });

  describe('assertErrorResponse', () => {
    it('should pass for valid response', () => {
      const response = createMockErrorResponse();
      expect(() => assertErrorResponse(response)).not.toThrow();
    });

    it('should throw AssertionError for invalid response', () => {
      expect(() => assertErrorResponse(null)).toThrow(AssertionError);
    });

    it('should include validation errors in message', () => {
      try {
        assertErrorResponse({});
      } catch (error) {
        expect(error).toBeInstanceOf(AssertionError);
        expect((error as AssertionError).message).toContain("Missing required field: 'code'");
      }
    });
  });

  describe('assertErrorCode', () => {
    it('should pass for matching code', () => {
      const response = createMockErrorResponse({ code: 'AUTH_001' });
      expect(() => assertErrorCode(response, 'AUTH_001')).not.toThrow();
    });

    it('should throw for non-matching code', () => {
      const response = createMockErrorResponse({ code: 'AUTH_001' });
      expect(() => assertErrorCode(response, 'AUTH_002')).toThrow(AssertionError);
    });
  });

  describe('assertErrorCodePrefix', () => {
    it('should pass for matching prefix', () => {
      const response = createMockErrorResponse({ code: 'AUTH_001' });
      expect(() => assertErrorCodePrefix(response, 'AUTH_')).not.toThrow();
    });

    it('should throw for non-matching prefix', () => {
      const response = createMockErrorResponse({ code: 'AUTH_001' });
      expect(() => assertErrorCodePrefix(response, 'VALIDATION_')).toThrow(AssertionError);
    });
  });

  describe('assertHasCorrelationId', () => {
    it('should pass when correlationId present', () => {
      const response = createMockErrorResponse();
      expect(() => assertHasCorrelationId(response)).not.toThrow();
    });

    it('should throw when correlationId missing', () => {
      const response = { code: 'AUTH_001', message: 'Error.' };
      expect(() => assertHasCorrelationId(response)).toThrow(AssertionError);
    });
  });

  describe('extractErrorCode', () => {
    it('should extract code from response', () => {
      const response = { code: 'AUTH_001', message: 'Error.' };
      expect(extractErrorCode(response)).toBe('AUTH_001');
    });

    it('should return undefined for missing code', () => {
      expect(extractErrorCode({})).toBeUndefined();
    });

    it('should return undefined for non-string code', () => {
      expect(extractErrorCode({ code: 123 })).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(extractErrorCode(null)).toBeUndefined();
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from response', () => {
      const response = { code: 'AUTH_001', message: 'Error occurred.' };
      expect(extractErrorMessage(response)).toBe('Error occurred.');
    });

    it('should return undefined for missing message', () => {
      expect(extractErrorMessage({})).toBeUndefined();
    });
  });

  describe('extractCorrelationId', () => {
    it('should extract correlationId from response', () => {
      const response = createMockErrorResponse();
      expect(extractCorrelationId(response)).toBe('12345678-1234-1234-1234-123456789abc');
    });

    it('should return undefined for missing correlationId', () => {
      expect(extractCorrelationId({})).toBeUndefined();
    });
  });

  describe('isErrorResponse', () => {
    it('should return true for valid error response', () => {
      const response = createMockErrorResponse();
      expect(isErrorResponse(response)).toBe(true);
    });

    it('should return false for invalid response', () => {
      expect(isErrorResponse(null)).toBe(false);
      expect(isErrorResponse({})).toBe(false);
      expect(isErrorResponse({ code: 'invalid' })).toBe(false);
    });
  });

  describe('createMockErrorResponse', () => {
    it('should create a valid error response', () => {
      const response = createMockErrorResponse();

      expect(response.code).toBe('VALIDATION_001');
      expect(response.message).toBe('Request validation failed.');
      expect(response.correlationId).toBeDefined();
      expect(response.timestamp).toBeDefined();
      expect(response.path).toBe('/api/test');
    });

    it('should allow overriding fields', () => {
      const response = createMockErrorResponse({
        code: 'AUTH_001',
        message: 'Custom message.',
        path: '/custom/path',
      });

      expect(response.code).toBe('AUTH_001');
      expect(response.message).toBe('Custom message.');
      expect(response.path).toBe('/custom/path');
    });

    it('should create a valid response according to validator', () => {
      const response = createMockErrorResponse();
      const result = validateErrorResponse(response);
      expect(result.valid).toBe(true);
    });
  });
});
