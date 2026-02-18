/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CorrelationMiddleware,
  requestContextStorage,
  getCurrentRequestContext,
} from '../../middleware/correlation.middleware.js';

describe('CorrelationMiddleware - AsyncLocalStorage', () => {
  let middleware: CorrelationMiddleware;
  let mockReq: {
    headers: Record<string, string | undefined>;
    correlationId?: string;
  };
  let mockRes: {
    setHeader: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    middleware = new CorrelationMiddleware();
    mockReq = {
      headers: {},
    };
    mockRes = {
      setHeader: vi.fn(),
    };
  });

  it('should store correlation ID in AsyncLocalStorage', async () => {
    const correlationId = 'test-correlation-id';
    mockReq.headers['x-correlation-id'] = correlationId;

    await new Promise<void>((resolve) => {
      middleware.use(mockReq as never, mockRes as never, () => {
        const context = getCurrentRequestContext();
        expect(context).toBeDefined();
        expect(context!.correlationId).toBe(correlationId);
        resolve();
      });
    });
  });

  it('should store traceparent in AsyncLocalStorage', async () => {
    const traceparent = '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01';
    mockReq.headers['traceparent'] = traceparent;

    await new Promise<void>((resolve) => {
      middleware.use(mockReq as never, mockRes as never, () => {
        const context = getCurrentRequestContext();
        expect(context).toBeDefined();
        expect(context!.traceparent).toBe(traceparent);
        resolve();
      });
    });
  });

  it('should generate traceparent when not provided', async () => {
    await new Promise<void>((resolve) => {
      middleware.use(mockReq as never, mockRes as never, () => {
        const context = getCurrentRequestContext();
        expect(context).toBeDefined();
        expect(context!.traceparent).toMatch(/^00-[0-9a-f]+-[0-9a-f]+-01$/);
        resolve();
      });
    });
  });

  it('should not have context outside middleware chain', () => {
    const context = getCurrentRequestContext();
    expect(context).toBeUndefined();
  });

  it('should isolate contexts between requests', async () => {
    const id1 = 'correlation-1';
    const id2 = 'correlation-2';

    const results: string[] = [];

    await new Promise<void>((resolve) => {
      mockReq.headers['x-correlation-id'] = id1;
      middleware.use(mockReq as never, mockRes as never, () => {
        const context = getCurrentRequestContext();
        results.push(context!.correlationId);
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      mockReq.headers['x-correlation-id'] = id2;
      middleware.use(mockReq as never, mockRes as never, () => {
        const context = getCurrentRequestContext();
        results.push(context!.correlationId);
        resolve();
      });
    });

    expect(results).toEqual([id1, id2]);
  });
});

describe('requestContextStorage', () => {
  it('should return undefined when no context is set', () => {
    const store = requestContextStorage.getStore();
    expect(store).toBeUndefined();
  });

  it('should return context when running inside a store', () => {
    const context = { correlationId: 'test-id', traceparent: '00-test-test-01' };
    requestContextStorage.run(context, () => {
      const store = requestContextStorage.getStore();
      expect(store).toEqual(context);
    });
  });
});
