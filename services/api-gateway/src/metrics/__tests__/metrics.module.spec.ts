import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { PrometheusModule, getToken } from '@willsoto/nestjs-prometheus';
import type { Counter, Histogram, Gauge } from 'prom-client';
import {
  MetricsModule,
  HTTP_REQUEST_DURATION,
  HTTP_REQUEST_TOTAL,
  HTTP_ACTIVE_CONNECTIONS,
  UPSTREAM_REQUEST_DURATION,
  UPSTREAM_REQUEST_TOTAL,
  CACHE_HITS_TOTAL,
  CACHE_MISSES_TOTAL,
} from '../metrics.module.js';

describe('MetricsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [MetricsModule],
    }).compile();
  });

  describe('module configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should export PrometheusModule', () => {
      const prometheusModule = module.get(PrometheusModule, { strict: false });
      expect(prometheusModule).toBeDefined();
    });
  });

  describe('HTTP metrics', () => {
    it('should provide HTTP request duration histogram', () => {
      const metric = module.get<Histogram<string>>(getToken(HTTP_REQUEST_DURATION));
      expect(metric).toBeDefined();
    });

    it('should provide HTTP request total counter', () => {
      const metric = module.get<Counter<string>>(getToken(HTTP_REQUEST_TOTAL));
      expect(metric).toBeDefined();
    });

    it('should provide HTTP active connections gauge', () => {
      const metric = module.get<Gauge<string>>(getToken(HTTP_ACTIVE_CONNECTIONS));
      expect(metric).toBeDefined();
    });
  });

  describe('Upstream metrics', () => {
    it('should provide upstream request duration histogram', () => {
      const metric = module.get<Histogram<string>>(getToken(UPSTREAM_REQUEST_DURATION));
      expect(metric).toBeDefined();
    });

    it('should provide upstream request total counter', () => {
      const metric = module.get<Counter<string>>(getToken(UPSTREAM_REQUEST_TOTAL));
      expect(metric).toBeDefined();
    });
  });

  describe('Cache metrics', () => {
    it('should provide cache hits counter', () => {
      const metric = module.get<Counter<string>>(getToken(CACHE_HITS_TOTAL));
      expect(metric).toBeDefined();
    });

    it('should provide cache misses counter', () => {
      const metric = module.get<Counter<string>>(getToken(CACHE_MISSES_TOTAL));
      expect(metric).toBeDefined();
    });
  });

  describe('metric operations', () => {
    it('should allow recording HTTP request duration', () => {
      const histogram = module.get<Histogram<string>>(getToken(HTTP_REQUEST_DURATION));
      expect(() => {
        histogram.observe({ method: 'GET', route: '/api/test', status_code: '200' }, 0.5);
      }).not.toThrow();
    });

    it('should allow incrementing HTTP request counter', () => {
      const counter = module.get<Counter<string>>(getToken(HTTP_REQUEST_TOTAL));
      expect(() => {
        counter.inc({ method: 'GET', route: '/api/test', status_code: '200' });
      }).not.toThrow();
    });

    it('should allow adjusting active connections gauge', () => {
      const gauge = module.get<Gauge<string>>(getToken(HTTP_ACTIVE_CONNECTIONS));
      expect(() => {
        gauge.inc({ route: '/api/test' });
        gauge.dec({ route: '/api/test' });
      }).not.toThrow();
    });
  });
});

describe('Metric constants', () => {
  it('should export correct metric names', () => {
    expect(HTTP_REQUEST_DURATION).toBe('http_request_duration_seconds');
    expect(HTTP_REQUEST_TOTAL).toBe('http_requests_total');
    expect(HTTP_ACTIVE_CONNECTIONS).toBe('http_active_connections');
    expect(UPSTREAM_REQUEST_DURATION).toBe('upstream_request_duration_seconds');
    expect(UPSTREAM_REQUEST_TOTAL).toBe('upstream_requests_total');
    expect(CACHE_HITS_TOTAL).toBe('cache_hits_total');
    expect(CACHE_MISSES_TOTAL).toBe('cache_misses_total');
  });
});
