import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CorrelationMiddleware,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  generateCorrelationId,
  getCorrelationId,
} from '../correlation.middleware.js';

describe('CorrelationMiddleware', () => {
  let middleware: CorrelationMiddleware;
  let mockReq: {
    headers: Record<string, string | undefined>;
    correlationId?: string;
  };
  let mockRes: {
    setHeader: ReturnType<typeof vi.fn>;
  };
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    middleware = new CorrelationMiddleware();
    mockReq = {
      headers: {},
    };
    mockRes = {
      setHeader: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('use', () => {
    it('should generate a new correlation ID when none provided', () => {
      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(mockReq.correlationId).toBeDefined();
      expect(mockReq.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing X-Correlation-ID header if present', () => {
      const existingId = 'existing-correlation-id-123';
      mockReq.headers[CORRELATION_ID_HEADER] = existingId;

      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(mockReq.correlationId).toBe(existingId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing X-Request-ID header as fallback', () => {
      const existingId = 'existing-request-id-456';
      mockReq.headers[REQUEST_ID_HEADER] = existingId;

      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(mockReq.correlationId).toBe(existingId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should prefer X-Correlation-ID over X-Request-ID', () => {
      const correlationId = 'correlation-id';
      const requestId = 'request-id';
      mockReq.headers[CORRELATION_ID_HEADER] = correlationId;
      mockReq.headers[REQUEST_ID_HEADER] = requestId;

      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(mockReq.correlationId).toBe(correlationId);
    });

    it('should set correlation ID in response headers', () => {
      middleware.use(mockReq as never, mockRes as never, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, expect.any(String));
    });

    it('should set same ID in both response headers', () => {
      middleware.use(mockReq as never, mockRes as never, mockNext);

      const correlationIdCall = mockRes.setHeader.mock.calls.find(
        (call) => call[0] === CORRELATION_ID_HEADER,
      );
      const requestIdCall = mockRes.setHeader.mock.calls.find(
        (call) => call[0] === REQUEST_ID_HEADER,
      );

      expect(correlationIdCall?.[1]).toBe(requestIdCall?.[1]);
    });
  });
});

describe('generateCorrelationId', () => {
  it('should generate a valid UUID v4', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateCorrelationId()));
    expect(ids.size).toBe(100);
  });
});

describe('getCorrelationId', () => {
  it('should extract correlation ID from headers', () => {
    const headers = { [CORRELATION_ID_HEADER]: 'test-id' };
    expect(getCorrelationId(headers)).toBe('test-id');
  });

  it('should extract request ID as fallback', () => {
    const headers = { [REQUEST_ID_HEADER]: 'test-request-id' };
    expect(getCorrelationId(headers)).toBe('test-request-id');
  });

  it('should return first element if array', () => {
    const headers = { [CORRELATION_ID_HEADER]: ['id1', 'id2'] };
    expect(getCorrelationId(headers)).toBe('id1');
  });

  it('should return undefined if not present', () => {
    const headers = {};
    expect(getCorrelationId(headers)).toBeUndefined();
  });
});
