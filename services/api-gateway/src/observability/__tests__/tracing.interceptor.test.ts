/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError, lastValueFrom } from 'rxjs';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { TracingInterceptor } from '../tracing.interceptor.js';

describe('TracingInterceptor', () => {
  let interceptor: TracingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: { url: string; method: string; headers: Record<string, string> };
  let mockResponse: {
    statusCode: number;
    header: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    interceptor = new TracingInterceptor('test-service');

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      headers: {
        'x-correlation-id': 'test-correlation-id',
      },
    };
    mockResponse = {
      statusCode: 200,
      header: vi.fn(),
    };

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

  it('should set trace headers on response', async () => {
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    await lastValueFrom(result$);

    expect(mockResponse.header).toHaveBeenCalledWith('traceparent', expect.any(String));
    expect(mockResponse.header).toHaveBeenCalledWith('x-service-name', 'test-service');
    expect(mockResponse.header).toHaveBeenCalledWith('x-correlation-id', 'test-correlation-id');
  });

  it('should use existing traceparent if provided', async () => {
    const existingTraceparent = '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01';
    mockRequest.headers['traceparent'] = existingTraceparent;

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    await lastValueFrom(result$);

    expect(mockResponse.header).toHaveBeenCalledWith('traceparent', existingTraceparent);
  });

  it('should generate traceparent when not provided', async () => {
    delete (mockRequest.headers as Record<string, string | undefined>)['traceparent'];

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    await lastValueFrom(result$);

    const traceparentCall = mockResponse.header.mock.calls.find(
      (call: string[]) => call[0] === 'traceparent',
    );
    expect(traceparentCall).toBeDefined();
    expect(traceparentCall![1]).toMatch(/^00-[0-9a-f]+-[0-9a-f]+-01$/);
  });

  it('should log trace on successful request', async () => {
    const logSpy = vi.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    await lastValueFrom(result$);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[TRACE] GET /api/test 200'));
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('correlationId=test-correlation-id'),
    );
  });

  it('should log warning on error', async () => {
    const warnSpy = vi.spyOn(interceptor['logger'], 'warn').mockImplementation(() => {});
    mockCallHandler.handle = () => throwError(() => new Error('Test error'));

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    try {
      await lastValueFrom(result$);
    } catch {
      // Expected error
    }

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[TRACE] GET /api/test ERROR'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('error=Test error'));
  });

  it('should use "unknown" when no correlation ID in headers', async () => {
    mockRequest.headers = {};

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    await lastValueFrom(result$);

    expect(mockResponse.header).toHaveBeenCalledWith('x-correlation-id', 'unknown');
  });
});
