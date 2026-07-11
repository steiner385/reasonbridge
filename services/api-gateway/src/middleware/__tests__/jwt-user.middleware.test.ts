/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { JwtUserMiddleware } from '../jwt-user.middleware.js';

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

describe('JwtUserMiddleware', () => {
  let middleware: JwtUserMiddleware;
  let mockReq: {
    headers: Record<string, string | undefined>;
  };
  let mockRes: Record<string, unknown>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = new JwtUserMiddleware();
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = vi.fn();
  });

  describe('use', () => {
    it('should call next without adding headers when no authorization header present', () => {
      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.headers['x-user-id']).toBeUndefined();
      expect(mockReq.headers['x-is-minor']).toBeUndefined();
    });

    it('should call next without adding headers when authorization header does not start with Bearer', () => {
      mockReq.headers.authorization = 'Basic some-token';

      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.headers['x-user-id']).toBeUndefined();
      expect(mockReq.headers['x-is-minor']).toBeUndefined();
    });

    it('should extract user ID from JWT sub claim and add x-user-id header', () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockReturnValue({
        sub: 'user-123',
        email: 'test@example.com',
      } as never);

      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String), {
        algorithms: ['HS256'],
      });
      expect(mockReq.headers['x-user-id']).toBe('user-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract user ID from userId claim as fallback', () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockReturnValue({
        userId: 'user-456',
      } as never);

      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(mockReq.headers['x-user-id']).toBe('user-456');
    });

    it('should extract user ID from id claim as second fallback', () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      vi.mocked(jwt.verify).mockReturnValue({
        id: 'user-789',
      } as never);

      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(mockReq.headers['x-user-id']).toBe('user-789');
    });

    describe('isMinor handling', () => {
      it('should add x-is-minor header with "true" when isMinor is true', () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        vi.mocked(jwt.verify).mockReturnValue({
          sub: 'child-user-123',
          isMinor: true,
        } as never);

        middleware.use(mockReq as never, mockRes as never, mockNext);

        expect(mockReq.headers['x-user-id']).toBe('child-user-123');
        expect(mockReq.headers['x-is-minor']).toBe('true');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should add x-is-minor header with "false" when isMinor is false', () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        vi.mocked(jwt.verify).mockReturnValue({
          sub: 'adult-user-123',
          isMinor: false,
        } as never);

        middleware.use(mockReq as never, mockRes as never, mockNext);

        expect(mockReq.headers['x-user-id']).toBe('adult-user-123');
        expect(mockReq.headers['x-is-minor']).toBe('false');
      });

      it('should not add x-is-minor header when isMinor is not a boolean', () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        vi.mocked(jwt.verify).mockReturnValue({
          sub: 'user-123',
          isMinor: 'maybe', // Invalid value
        } as never);

        middleware.use(mockReq as never, mockRes as never, mockNext);

        expect(mockReq.headers['x-user-id']).toBe('user-123');
        expect(mockReq.headers['x-is-minor']).toBeUndefined();
      });

      it('should not add x-is-minor header when isMinor is not present', () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        vi.mocked(jwt.verify).mockReturnValue({
          sub: 'user-123',
          email: 'test@example.com',
        } as never);

        middleware.use(mockReq as never, mockRes as never, mockNext);

        expect(mockReq.headers['x-user-id']).toBe('user-123');
        expect(mockReq.headers['x-is-minor']).toBeUndefined();
      });
    });

    describe('error handling', () => {
      it('should continue without user context when token is expired', () => {
        mockReq.headers.authorization = 'Bearer expired-token';
        const expiredError = new Error('jwt expired');
        expiredError.name = 'TokenExpiredError';
        vi.mocked(jwt.verify).mockImplementation(() => {
          throw expiredError;
        });

        middleware.use(mockReq as never, mockRes as never, mockNext);

        expect(mockReq.headers['x-user-id']).toBeUndefined();
        expect(mockReq.headers['x-is-minor']).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should continue without user context when token is invalid', () => {
        mockReq.headers.authorization = 'Bearer invalid-token';
        const invalidError = new Error('invalid signature');
        invalidError.name = 'JsonWebTokenError';
        vi.mocked(jwt.verify).mockImplementation(() => {
          throw invalidError;
        });

        middleware.use(mockReq as never, mockRes as never, mockNext);

        expect(mockReq.headers['x-user-id']).toBeUndefined();
        expect(mockReq.headers['x-is-minor']).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should continue when JWT has no user ID in any claim', () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        vi.mocked(jwt.verify).mockReturnValue({
          email: 'test@example.com',
          // No sub, userId, or id
        } as never);

        middleware.use(mockReq as never, mockRes as never, mockNext);

        expect(mockReq.headers['x-user-id']).toBeUndefined();
        expect(mockReq.headers['x-is-minor']).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });
});
