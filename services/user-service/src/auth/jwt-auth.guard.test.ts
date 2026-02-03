import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';

// Mock jwks-rsa module
vi.mock('jwks-rsa', () => ({
  default: vi.fn(() => ({
    getSigningKey: vi.fn(),
  })),
}));

const createMockJwtService = () => ({
  decode: vi.fn(),
  verify: vi.fn(),
});

/**
 * Creates a mock ConfigService for testing mock auth mode (default)
 * Mock auth uses JWT secret verification instead of JWKS
 */
const createMockConfigService = () => ({
  get: vi.fn((key: string, defaultValue?: string) => {
    if (key === 'AWS_REGION') return 'us-east-1';
    if (key === 'JWT_SECRET') return 'test-jwt-secret';
    return defaultValue;
  }),
  getOrThrow: vi.fn((key: string) => {
    if (key === 'COGNITO_USER_POOL_ID') return 'us-east-1_TestPool';
    throw new Error(`Missing config: ${key}`);
  }),
});

/**
 * Creates a mock ConfigService that enables production auth mode (JWKS/Cognito)
 * Use this when testing JWKS-based token verification
 */
const createMockConfigServiceForJwks = () => ({
  get: vi.fn((key: string, defaultValue?: string) => {
    if (key === 'AWS_REGION') return 'us-east-1';
    if (key === 'COGNITO_USER_POOL_ID') return 'us-east-1_TestPool';
    if (key === 'AUTH_MOCK') return 'false';
    if (key === 'NODE_ENV') return 'production';
    return defaultValue;
  }),
  getOrThrow: vi.fn((key: string) => {
    if (key === 'COGNITO_USER_POOL_ID') return 'us-east-1_TestPool';
    throw new Error(`Missing config: ${key}`);
  }),
});

const createMockExecutionContext = (headers: Record<string, string> = {}) => {
  const request = {
    headers,
    user: undefined as any,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    _request: request, // Expose for test assertions
  };
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockJwtService: ReturnType<typeof createMockJwtService>;
  let mockConfigService: ReturnType<typeof createMockConfigService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockJwtService = createMockJwtService();
    mockConfigService = createMockConfigService();
    guard = new JwtAuthGuard(mockJwtService as any, mockConfigService as any);
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException when no token provided', async () => {
      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context as any)).rejects.toThrow(
        new UnauthorizedException('No token provided'),
      );
    });

    it('should throw UnauthorizedException when authorization header has no Bearer prefix', async () => {
      const context = createMockExecutionContext({ authorization: 'Basic token123' });

      await expect(guard.canActivate(context as any)).rejects.toThrow(
        new UnauthorizedException('No token provided'),
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      // This test uses mock auth mode (default in tests)
      // The mock auth mode uses JWT secret verification
      const context = createMockExecutionContext({ authorization: 'Bearer expired-token' });

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(guard.canActivate(context as any)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('should verify token and attach user to request (mock auth)', async () => {
      // Mock auth mode uses simple JWT secret verification
      const context = createMockExecutionContext({ authorization: 'Bearer valid-token' });
      const payload = {
        sub: 'cognito-user-123',
        email: 'user@example.com',
        'cognito:username': 'testuser',
        exp: Date.now() + 3600000,
        iat: Date.now(),
      };

      mockJwtService.verify.mockReturnValue(payload);

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
      expect(context._request.user).toEqual(payload);
    });

    it('should call jwtService.verify with correct parameters (mock auth)', async () => {
      // Mock auth mode uses HS256 with JWT secret
      const context = createMockExecutionContext({ authorization: 'Bearer test-token' });
      const payload = { sub: 'user-1', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(payload);

      await guard.canActivate(context as any);

      expect(mockJwtService.verify).toHaveBeenCalledWith('test-token', {
        secret: 'test-jwt-secret',
        algorithms: ['HS256'],
      });
    });

    it('should re-throw UnauthorizedException without wrapping', async () => {
      const context = createMockExecutionContext({ authorization: 'Bearer token' });

      mockJwtService.verify.mockImplementation(() => {
        throw new UnauthorizedException('Custom unauthorized error');
      });

      await expect(guard.canActivate(context as any)).rejects.toThrow(
        new UnauthorizedException('Custom unauthorized error'),
      );
    });
  });

  describe('canActivate (JWKS/Cognito mode)', () => {
    let jwksGuard: JwtAuthGuard;
    let jwksMockJwtService: ReturnType<typeof createMockJwtService>;

    beforeEach(() => {
      jwksMockJwtService = createMockJwtService();
      const jwksConfigService = createMockConfigServiceForJwks();
      jwksGuard = new JwtAuthGuard(jwksMockJwtService as any, jwksConfigService as any);
    });

    it('should throw UnauthorizedException when token format is invalid (JWKS)', async () => {
      const context = createMockExecutionContext({ authorization: 'Bearer invalid-token' });
      jwksMockJwtService.decode.mockReturnValue(null);

      await expect(jwksGuard.canActivate(context as any)).rejects.toThrow(
        new UnauthorizedException('Invalid token format'),
      );
    });

    it('should throw UnauthorizedException when token has no kid header (JWKS)', async () => {
      const context = createMockExecutionContext({ authorization: 'Bearer valid-format-token' });
      jwksMockJwtService.decode.mockReturnValue({
        header: {},
        payload: {},
      });

      await expect(jwksGuard.canActivate(context as any)).rejects.toThrow(
        new UnauthorizedException('Invalid token format'),
      );
    });

    it('should use kid from token to get signing key', async () => {
      const context = createMockExecutionContext({ authorization: 'Bearer my-token' });
      const kidValue = 'specific-key-id-456';

      jwksMockJwtService.decode.mockReturnValue({
        header: { kid: kidValue },
        payload: { sub: 'user-1' },
      });

      const mockGetSigningKey = vi.fn().mockResolvedValue({
        getPublicKey: () => 'public-key',
      });
      (jwksGuard as any).jwksClient.getSigningKey = mockGetSigningKey;

      jwksMockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      await jwksGuard.canActivate(context as any);

      expect(mockGetSigningKey).toHaveBeenCalledWith(kidValue);
    });

    it('should call jwtService.verify with correct parameters (JWKS)', async () => {
      const context = createMockExecutionContext({ authorization: 'Bearer test-token' });
      const payload = { sub: 'user-1', email: 'test@example.com' };

      jwksMockJwtService.decode.mockReturnValue({
        header: { kid: 'key-123' },
        payload,
      });

      const mockPublicKey = 'mock-public-key-pem';
      const mockGetSigningKey = vi.fn().mockResolvedValue({
        getPublicKey: () => mockPublicKey,
      });
      (jwksGuard as any).jwksClient.getSigningKey = mockGetSigningKey;

      jwksMockJwtService.verify.mockReturnValue(payload);

      await jwksGuard.canActivate(context as any);

      expect(jwksMockJwtService.verify).toHaveBeenCalledWith('test-token', {
        publicKey: mockPublicKey,
        algorithms: ['RS256'],
      });
    });

    it('should handle JWKS fetch errors', async () => {
      const context = createMockExecutionContext({ authorization: 'Bearer token' });

      jwksMockJwtService.decode.mockReturnValue({
        header: { kid: 'key-123' },
        payload: { sub: 'user-1' },
      });

      const mockGetSigningKey = vi.fn().mockRejectedValue(new Error('JWKS fetch failed'));
      (jwksGuard as any).jwksClient.getSigningKey = mockGetSigningKey;

      await expect(jwksGuard.canActivate(context as any)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer authorization header', () => {
      const token = 'my-jwt-token-123';
      const request = { headers: { authorization: `Bearer ${token}` } };

      const result = (guard as any).extractTokenFromHeader(request);

      expect(result).toBe(token);
    });

    it('should return undefined for missing authorization header', () => {
      const request = { headers: {} };

      const result = (guard as any).extractTokenFromHeader(request);

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-Bearer authorization', () => {
      const request = { headers: { authorization: 'Basic base64credentials' } };

      const result = (guard as any).extractTokenFromHeader(request);

      expect(result).toBeUndefined();
    });

    it('should handle lowercase bearer prefix', () => {
      // The implementation checks for exact 'Bearer' match, so 'bearer' should not match
      const request = { headers: { authorization: 'bearer token123' } };

      const result = (guard as any).extractTokenFromHeader(request);

      expect(result).toBeUndefined();
    });
  });
});
