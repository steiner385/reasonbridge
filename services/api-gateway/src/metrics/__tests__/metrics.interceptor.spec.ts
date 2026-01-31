import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError, lastValueFrom } from 'rxjs';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { MetricsInterceptor } from '../metrics.interceptor.js';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let mockHistogram: { observe: ReturnType<typeof vi.fn> };
  let mockCounter: { inc: ReturnType<typeof vi.fn> };
  let mockGauge: { inc: ReturnType<typeof vi.fn>; dec: ReturnType<typeof vi.fn> };
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: { url: string; method: string };
  let mockResponse: { statusCode: number };

  beforeEach(() => {
    mockHistogram = { observe: vi.fn() };
    mockCounter = { inc: vi.fn() };
    mockGauge = { inc: vi.fn(), dec: vi.fn() };

    interceptor = new MetricsInterceptor(
      mockHistogram as never,
      mockCounter as never,
      mockGauge as never,
    );

    mockRequest = { url: '/api/test', method: 'GET' };
    mockResponse = { statusCode: 200 };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: () => of({ data: 'test' }),
    };
  });

  describe('intercept', () => {
    it('should record metrics on successful request', async () => {
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Use lastValueFrom to wait for the observable to complete
      await lastValueFrom(result$);

      expect(mockGauge.inc).toHaveBeenCalledWith({ route: '/api/test' });
      expect(mockGauge.dec).toHaveBeenCalledWith({ route: '/api/test' });
      expect(mockHistogram.observe).toHaveBeenCalledWith(
        { method: 'GET', route: '/api/test', status_code: '200' },
        expect.any(Number),
      );
      expect(mockCounter.inc).toHaveBeenCalledWith({
        method: 'GET',
        route: '/api/test',
        status_code: '200',
      });
    });

    it('should record metrics on error', async () => {
      mockResponse.statusCode = 500;
      mockCallHandler.handle = () => throwError(() => new Error('Test error'));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      try {
        await lastValueFrom(result$);
      } catch {
        // Expected error
      }

      expect(mockGauge.inc).toHaveBeenCalledWith({ route: '/api/test' });
      expect(mockGauge.dec).toHaveBeenCalledWith({ route: '/api/test' });
      expect(mockHistogram.observe).toHaveBeenCalled();
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should normalize UUIDs in routes', async () => {
      mockRequest.url = '/api/users/123e4567-e89b-12d3-a456-426614174000/profile';

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result$);

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        expect.objectContaining({ route: '/api/users/:id/profile' }),
        expect.any(Number),
      );
    });

    it('should normalize numeric IDs in routes', async () => {
      mockRequest.url = '/api/topics/12345/responses';

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result$);

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        expect.objectContaining({ route: '/api/topics/:id/responses' }),
        expect.any(Number),
      );
    });

    it('should strip query parameters from route', async () => {
      mockRequest.url = '/api/search?q=test&page=1';

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result$);

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        expect.objectContaining({ route: '/api/search' }),
        expect.any(Number),
      );
    });

    it('should limit path depth to avoid high cardinality', async () => {
      mockRequest.url = '/api/v1/very/deep/nested/path/that/is/too/long';

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await lastValueFrom(result$);

      const observeCall = mockHistogram.observe.mock.calls[0];
      const route = observeCall[0].route as string;
      const segments = route.split('/').filter(Boolean);
      expect(segments.length).toBeLessThanOrEqual(5);
    });
  });
});
