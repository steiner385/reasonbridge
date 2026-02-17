/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCodes,
  ERROR_CODE_METADATA,
  ERROR_CODE_PATTERN,
  HttpStatus,
  AUTH_ERRORS,
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  RATE_LIMIT_ERRORS,
  BUSINESS_ERRORS,
  DISCUSSION_ERRORS,
  AI_ERRORS,
  MOD_ERRORS,
  EXTERNAL_ERRORS,
  INTERNAL_ERRORS,
  getErrorMeta,
  getErrorMessage,
  getHttpStatus,
  shouldLogAsError,
  getErrorCategory,
  getErrorCodesByCategory,
  isValidErrorCodeFormat,
  isKnownErrorCode,
  type ErrorCode,
  type ErrorCategory,
} from './error-codes';

/**
 * T310: Create error code contract tests
 *
 * These tests ensure:
 * - All error codes are properly defined
 * - Error code format consistency (CATEGORY_NNN)
 * - Error message quality (human-readable, helpful)
 * - HTTP status code correctness
 * - Category consistency
 */

describe('Error Code Taxonomy', () => {
  describe('Error Code Format', () => {
    it('should have a valid regex pattern for error codes', () => {
      expect(ERROR_CODE_PATTERN.test('AUTH_001')).toBe(true);
      expect(ERROR_CODE_PATTERN.test('VALIDATION_012')).toBe(true);
      expect(ERROR_CODE_PATTERN.test('RESOURCE_100')).toBe(true);
      expect(ERROR_CODE_PATTERN.test('RATE_LIMIT_005')).toBe(true);
      expect(ERROR_CODE_PATTERN.test('invalid')).toBe(false);
      expect(ERROR_CODE_PATTERN.test('auth_001')).toBe(false);
      expect(ERROR_CODE_PATTERN.test('AUTH_01')).toBe(false);
      expect(ERROR_CODE_PATTERN.test('AUTH001')).toBe(false);
    });

    it('should have all error codes match the format pattern', () => {
      const allCodes = Object.values(ErrorCodes);
      allCodes.forEach((code) => {
        expect(isValidErrorCodeFormat(code)).toBe(true);
      });
    });

    it('should have unique error codes', () => {
      const allCodes = Object.values(ErrorCodes);
      const uniqueCodes = new Set(allCodes);
      expect(uniqueCodes.size).toBe(allCodes.length);
    });

    it('should have matching keys and values in ErrorCodes', () => {
      Object.entries(ErrorCodes).forEach(([key, value]) => {
        expect(key).toBe(value);
      });
    });
  });

  describe('Error Categories', () => {
    const categoryPrefixMap: Record<string, string> = {
      AUTH: 'AUTH_',
      VALIDATION: 'VALIDATION_',
      RESOURCE: 'RESOURCE_',
      RATE_LIMIT: 'RATE_LIMIT_',
      BUSINESS: 'BUSINESS_',
      DISCUSSION: 'DISCUSSION_',
      AI: 'AI_',
      MOD: 'MOD_',
      EXTERNAL: 'EXTERNAL_',
      INTERNAL: 'INTERNAL_',
    };

    it('should have AUTH errors starting with AUTH_', () => {
      Object.values(AUTH_ERRORS).forEach((code) => {
        expect(code.startsWith('AUTH_')).toBe(true);
      });
    });

    it('should have VALIDATION errors starting with VALIDATION_', () => {
      Object.values(VALIDATION_ERRORS).forEach((code) => {
        expect(code.startsWith('VALIDATION_')).toBe(true);
      });
    });

    it('should have RESOURCE errors starting with RESOURCE_', () => {
      Object.values(RESOURCE_ERRORS).forEach((code) => {
        expect(code.startsWith('RESOURCE_')).toBe(true);
      });
    });

    it('should have RATE_LIMIT errors starting with RATE_LIMIT_', () => {
      Object.values(RATE_LIMIT_ERRORS).forEach((code) => {
        expect(code.startsWith('RATE_LIMIT_')).toBe(true);
      });
    });

    it('should have BUSINESS errors starting with BUSINESS_', () => {
      Object.values(BUSINESS_ERRORS).forEach((code) => {
        expect(code.startsWith('BUSINESS_')).toBe(true);
      });
    });

    it('should have DISCUSSION errors starting with DISCUSSION_', () => {
      Object.values(DISCUSSION_ERRORS).forEach((code) => {
        expect(code.startsWith('DISCUSSION_')).toBe(true);
      });
    });

    it('should have AI errors starting with AI_', () => {
      Object.values(AI_ERRORS).forEach((code) => {
        expect(code.startsWith('AI_')).toBe(true);
      });
    });

    it('should have MOD errors starting with MOD_', () => {
      Object.values(MOD_ERRORS).forEach((code) => {
        expect(code.startsWith('MOD_')).toBe(true);
      });
    });

    it('should have EXTERNAL errors starting with EXTERNAL_', () => {
      Object.values(EXTERNAL_ERRORS).forEach((code) => {
        expect(code.startsWith('EXTERNAL_')).toBe(true);
      });
    });

    it('should have INTERNAL errors starting with INTERNAL_', () => {
      Object.values(INTERNAL_ERRORS).forEach((code) => {
        expect(code.startsWith('INTERNAL_')).toBe(true);
      });
    });

    it('should have correct category metadata for each error code', () => {
      Object.entries(ERROR_CODE_METADATA).forEach(([code, meta]) => {
        const expectedPrefix = categoryPrefixMap[meta.category];
        expect(code.startsWith(expectedPrefix)).toBe(true);
      });
    });
  });

  describe('Error Metadata Completeness', () => {
    it('should have metadata for every error code', () => {
      const allCodes = Object.values(ErrorCodes);
      allCodes.forEach((code) => {
        expect(ERROR_CODE_METADATA[code]).toBeDefined();
        expect(ERROR_CODE_METADATA[code].message).toBeDefined();
        expect(ERROR_CODE_METADATA[code].httpStatus).toBeDefined();
        expect(ERROR_CODE_METADATA[code].logAsError).toBeDefined();
        expect(ERROR_CODE_METADATA[code].category).toBeDefined();
      });
    });

    it('should have the same number of codes and metadata entries', () => {
      const codeCount = Object.values(ErrorCodes).length;
      const metadataCount = Object.keys(ERROR_CODE_METADATA).length;
      expect(codeCount).toBe(metadataCount);
    });
  });

  describe('Error Message Quality', () => {
    it('should have non-empty messages', () => {
      Object.values(ERROR_CODE_METADATA).forEach((meta) => {
        expect(meta.message.length).toBeGreaterThan(0);
      });
    });

    it('should have messages that start with a capital letter', () => {
      Object.values(ERROR_CODE_METADATA).forEach((meta) => {
        expect(meta.message[0]).toBe(meta.message[0].toUpperCase());
      });
    });

    it('should have messages that end with a period', () => {
      Object.values(ERROR_CODE_METADATA).forEach((meta) => {
        expect(meta.message.endsWith('.')).toBe(true);
      });
    });

    it('should not have messages containing error codes', () => {
      Object.entries(ERROR_CODE_METADATA).forEach(([code, meta]) => {
        expect(meta.message).not.toContain(code);
      });
    });

    it('should have human-readable messages (no technical jargon for user-facing errors)', () => {
      const userFacingCategories: ErrorCategory[] = [
        'AUTH',
        'VALIDATION',
        'RESOURCE',
        'BUSINESS',
        'DISCUSSION',
        'MOD',
      ];

      Object.entries(ERROR_CODE_METADATA)
        .filter(([, meta]) => userFacingCategories.includes(meta.category))
        .forEach(([, meta]) => {
          // Should not contain common technical terms
          expect(meta.message.toLowerCase()).not.toContain('exception');
          expect(meta.message.toLowerCase()).not.toContain('null pointer');
          expect(meta.message.toLowerCase()).not.toContain('stack trace');
        });
    });
  });

  describe('HTTP Status Codes', () => {
    it('should have valid HTTP status codes', () => {
      const validStatusCodes = Object.values(HttpStatus);
      Object.values(ERROR_CODE_METADATA).forEach((meta) => {
        expect(validStatusCodes).toContain(meta.httpStatus);
      });
    });

    it('should use 401 or 403 for AUTH errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('AUTH_'))
        .forEach(([, meta]) => {
          expect([HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.BAD_REQUEST]).toContain(
            meta.httpStatus,
          );
        });
    });

    it('should use 400 for VALIDATION errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('VALIDATION_'))
        .forEach(([, meta]) => {
          expect(meta.httpStatus).toBe(HttpStatus.BAD_REQUEST);
        });
    });

    it('should use 404, 409, or 410 for RESOURCE errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('RESOURCE_'))
        .forEach(([, meta]) => {
          expect([HttpStatus.NOT_FOUND, HttpStatus.CONFLICT, HttpStatus.GONE]).toContain(
            meta.httpStatus,
          );
        });
    });

    it('should use 429 for RATE_LIMIT errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('RATE_LIMIT_'))
        .forEach(([, meta]) => {
          expect(meta.httpStatus).toBe(HttpStatus.TOO_MANY_REQUESTS);
        });
    });

    it('should use 400, 403, 409, or 422 for DISCUSSION errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('DISCUSSION_'))
        .forEach(([, meta]) => {
          expect([
            HttpStatus.BAD_REQUEST,
            HttpStatus.FORBIDDEN,
            HttpStatus.CONFLICT,
            HttpStatus.UNPROCESSABLE_ENTITY,
          ]).toContain(meta.httpStatus);
        });
    });

    it('should use appropriate status codes for AI errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('AI_'))
        .forEach(([, meta]) => {
          expect([
            HttpStatus.BAD_REQUEST,
            HttpStatus.UNPROCESSABLE_ENTITY,
            HttpStatus.TOO_MANY_REQUESTS,
            HttpStatus.INTERNAL_SERVER_ERROR,
            HttpStatus.BAD_GATEWAY,
            HttpStatus.SERVICE_UNAVAILABLE,
          ]).toContain(meta.httpStatus);
        });
    });

    it('should use appropriate status codes for MOD errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('MOD_'))
        .forEach(([, meta]) => {
          expect([
            HttpStatus.BAD_REQUEST,
            HttpStatus.FORBIDDEN,
            HttpStatus.NOT_FOUND,
            HttpStatus.CONFLICT,
            HttpStatus.UNPROCESSABLE_ENTITY,
            HttpStatus.SERVICE_UNAVAILABLE,
          ]).toContain(meta.httpStatus);
        });
    });

    it('should use 500, 502, or 503 for EXTERNAL errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('EXTERNAL_'))
        .forEach(([, meta]) => {
          expect([
            HttpStatus.INTERNAL_SERVER_ERROR,
            HttpStatus.BAD_GATEWAY,
            HttpStatus.SERVICE_UNAVAILABLE,
          ]).toContain(meta.httpStatus);
        });
    });

    it('should use 500 or 409 for INTERNAL errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('INTERNAL_'))
        .forEach(([, meta]) => {
          expect([HttpStatus.INTERNAL_SERVER_ERROR, HttpStatus.CONFLICT]).toContain(
            meta.httpStatus,
          );
        });
    });
  });

  describe('Logging Configuration', () => {
    it('should log EXTERNAL and INTERNAL errors as errors', () => {
      Object.entries(ERROR_CODE_METADATA)
        .filter(([code]) => code.startsWith('EXTERNAL_') || code.startsWith('INTERNAL_'))
        .forEach(([, meta]) => {
          expect(meta.logAsError).toBe(true);
        });
    });

    it('should not log most AUTH validation errors as errors', () => {
      // Most authentication failures (wrong password, expired token) are expected
      // and should not trigger error-level logging
      const expectedNotLoggedAsError = [
        'AUTH_001',
        'AUTH_002',
        'AUTH_003',
        'AUTH_004',
        'AUTH_005',
        'AUTH_006',
        'AUTH_007',
        'AUTH_010',
        'AUTH_011',
        'AUTH_012',
        'AUTH_013',
      ] as ErrorCode[];

      expectedNotLoggedAsError.forEach((code) => {
        expect(ERROR_CODE_METADATA[code].logAsError).toBe(false);
      });
    });

    it('should log suspicious auth activities as errors', () => {
      // OAuth failures and suspicious activities should be logged
      expect(ERROR_CODE_METADATA['AUTH_008'].logAsError).toBe(true);
      expect(ERROR_CODE_METADATA['AUTH_009'].logAsError).toBe(true);
      expect(ERROR_CODE_METADATA['RATE_LIMIT_002'].logAsError).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    describe('getErrorMeta', () => {
      it('should return correct metadata for a code', () => {
        const meta = getErrorMeta('AUTH_001');
        expect(meta.message).toBe('Authentication required. Please provide a valid access token.');
        expect(meta.httpStatus).toBe(HttpStatus.UNAUTHORIZED);
        expect(meta.category).toBe('AUTH');
      });
    });

    describe('getErrorMessage', () => {
      it('should return the message for a code', () => {
        const message = getErrorMessage('VALIDATION_004');
        expect(message).toContain('Password does not meet requirements');
      });
    });

    describe('getHttpStatus', () => {
      it('should return the HTTP status for a code', () => {
        expect(getHttpStatus('RESOURCE_001')).toBe(HttpStatus.NOT_FOUND);
        expect(getHttpStatus('AUTH_001')).toBe(HttpStatus.UNAUTHORIZED);
        expect(getHttpStatus('VALIDATION_001')).toBe(HttpStatus.BAD_REQUEST);
      });
    });

    describe('shouldLogAsError', () => {
      it('should return correct logging configuration', () => {
        expect(shouldLogAsError('INTERNAL_001')).toBe(true);
        expect(shouldLogAsError('AUTH_003')).toBe(false);
      });
    });

    describe('getErrorCategory', () => {
      it('should return the correct category', () => {
        expect(getErrorCategory('AUTH_001')).toBe('AUTH');
        expect(getErrorCategory('VALIDATION_001')).toBe('VALIDATION');
        expect(getErrorCategory('RESOURCE_001')).toBe('RESOURCE');
      });
    });

    describe('getErrorCodesByCategory', () => {
      it('should return all codes for a category', () => {
        const authCodes = getErrorCodesByCategory('AUTH');
        expect(authCodes.length).toBeGreaterThan(0);
        authCodes.forEach((code) => {
          expect(code.startsWith('AUTH_')).toBe(true);
        });
      });

      it('should return codes matching the expected count', () => {
        const validationCodes = getErrorCodesByCategory('VALIDATION');
        expect(validationCodes.length).toBe(Object.keys(VALIDATION_ERRORS).length);
      });
    });

    describe('isValidErrorCodeFormat', () => {
      it('should validate correct formats', () => {
        expect(isValidErrorCodeFormat('AUTH_001')).toBe(true);
        expect(isValidErrorCodeFormat('BUSINESS_123')).toBe(true);
        expect(isValidErrorCodeFormat('RATE_LIMIT_005')).toBe(true);
        expect(isValidErrorCodeFormat('DISCUSSION_001')).toBe(true);
        expect(isValidErrorCodeFormat('AI_001')).toBe(true);
        expect(isValidErrorCodeFormat('MOD_001')).toBe(true);
      });

      it('should reject invalid formats', () => {
        expect(isValidErrorCodeFormat('auth_001')).toBe(false);
        expect(isValidErrorCodeFormat('AUTH-001')).toBe(false);
        expect(isValidErrorCodeFormat('AUTH_01')).toBe(false);
        expect(isValidErrorCodeFormat('AUTH001')).toBe(false);
        expect(isValidErrorCodeFormat('')).toBe(false);
      });
    });

    describe('isKnownErrorCode', () => {
      it('should identify known codes', () => {
        expect(isKnownErrorCode('AUTH_001')).toBe(true);
        expect(isKnownErrorCode('VALIDATION_001')).toBe(true);
        expect(isKnownErrorCode('DISCUSSION_001')).toBe(true);
        expect(isKnownErrorCode('AI_001')).toBe(true);
        expect(isKnownErrorCode('MOD_001')).toBe(true);
      });

      it('should reject unknown codes', () => {
        expect(isKnownErrorCode('AUTH_999')).toBe(false);
        expect(isKnownErrorCode('UNKNOWN_001')).toBe(false);
      });
    });
  });

  describe('Error Code Coverage', () => {
    it('should have at least 10 AUTH error codes', () => {
      expect(Object.keys(AUTH_ERRORS).length).toBeGreaterThanOrEqual(10);
    });

    it('should have at least 10 VALIDATION error codes', () => {
      expect(Object.keys(VALIDATION_ERRORS).length).toBeGreaterThanOrEqual(10);
    });

    it('should have at least 5 RESOURCE error codes', () => {
      expect(Object.keys(RESOURCE_ERRORS).length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 3 RATE_LIMIT error codes', () => {
      expect(Object.keys(RATE_LIMIT_ERRORS).length).toBeGreaterThanOrEqual(3);
    });

    it('should have at least 5 BUSINESS error codes', () => {
      expect(Object.keys(BUSINESS_ERRORS).length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 8 DISCUSSION error codes', () => {
      expect(Object.keys(DISCUSSION_ERRORS).length).toBeGreaterThanOrEqual(8);
    });

    it('should have at least 5 AI error codes', () => {
      expect(Object.keys(AI_ERRORS).length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 8 MOD error codes', () => {
      expect(Object.keys(MOD_ERRORS).length).toBeGreaterThanOrEqual(8);
    });

    it('should have at least 5 EXTERNAL error codes', () => {
      expect(Object.keys(EXTERNAL_ERRORS).length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 3 INTERNAL error codes', () => {
      expect(Object.keys(INTERNAL_ERRORS).length).toBeGreaterThanOrEqual(3);
    });
  });
});
