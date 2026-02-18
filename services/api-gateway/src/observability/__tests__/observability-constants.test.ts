/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  TRACEPARENT_HEADER,
  TRACESTATE_HEADER,
  SERVICE_NAME_HEADER,
  PROPAGATED_HEADERS,
  generateCorrelationId,
  getCorrelationId,
  generateTraceparent,
  parseTraceparent,
} from '@reason-bridge/common';

describe('observability constants', () => {
  it('should export correct header names', () => {
    expect(CORRELATION_ID_HEADER).toBe('x-correlation-id');
    expect(REQUEST_ID_HEADER).toBe('x-request-id');
    expect(TRACEPARENT_HEADER).toBe('traceparent');
    expect(TRACESTATE_HEADER).toBe('tracestate');
    expect(SERVICE_NAME_HEADER).toBe('x-service-name');
  });

  it('should export propagated headers list', () => {
    expect(PROPAGATED_HEADERS).toContain(CORRELATION_ID_HEADER);
    expect(PROPAGATED_HEADERS).toContain(REQUEST_ID_HEADER);
    expect(PROPAGATED_HEADERS).toContain(TRACEPARENT_HEADER);
    expect(PROPAGATED_HEADERS).toContain(TRACESTATE_HEADER);
    expect(PROPAGATED_HEADERS).toContain(SERVICE_NAME_HEADER);
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

describe('generateTraceparent', () => {
  it('should generate valid W3C traceparent format', () => {
    const traceparent = generateTraceparent();
    // Format: {version}-{trace-id}-{parent-id}-{trace-flags}
    const parts = traceparent.split('-');
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe('00'); // version
    expect(parts[1]).toHaveLength(32); // trace-id
    expect(parts[2]).toHaveLength(16); // parent-id
    expect(parts[3]).toBe('01'); // trace-flags (sampled)
  });

  it('should use provided traceId', () => {
    const traceId = 'abcdef1234567890abcdef1234567890';
    const traceparent = generateTraceparent(traceId);
    expect(traceparent).toMatch(new RegExp(`^00-${traceId}-[0-9a-f]{16}-01$`));
  });

  it('should generate unique traceparents', () => {
    const traceparents = new Set(Array.from({ length: 50 }, () => generateTraceparent()));
    expect(traceparents.size).toBe(50);
  });
});

describe('parseTraceparent', () => {
  it('should parse a valid traceparent', () => {
    const traceparent = '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01';
    const result = parseTraceparent(traceparent);
    expect(result).toEqual({
      version: '00',
      traceId: 'abcdef1234567890abcdef1234567890',
      parentId: '1234567890abcdef',
      traceFlags: '01',
    });
  });

  it('should return null for invalid format', () => {
    expect(parseTraceparent('invalid')).toBeNull();
    expect(parseTraceparent('00-too-short-01')).toBeNull();
    expect(parseTraceparent('')).toBeNull();
  });

  it('should return null for wrong trace-id length', () => {
    expect(parseTraceparent('00-short-1234567890abcdef-01')).toBeNull();
  });

  it('should round-trip with generateTraceparent', () => {
    const traceparent = generateTraceparent();
    const parsed = parseTraceparent(traceparent);
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe('00');
    expect(parsed!.traceFlags).toBe('01');
  });
});
