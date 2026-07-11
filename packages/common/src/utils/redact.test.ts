/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { redactEmail, maskPhone, maskIp } from './redact.js';

describe('redactEmail', () => {
  it('shows the first two local characters and the full domain', () => {
    expect(redactEmail('user@example.com')).toBe('us***@example.com');
  });

  it('fully redacts a short local part', () => {
    expect(redactEmail('ab@example.com')).toBe('***@example.com');
    expect(redactEmail('a@example.com')).toBe('***@example.com');
  });

  it('collapses malformed or empty input to ***@***', () => {
    expect(redactEmail('not-an-email')).toBe('***@***');
    expect(redactEmail('')).toBe('***@***');
    expect(redactEmail(undefined)).toBe('***@***');
    expect(redactEmail(null)).toBe('***@***');
  });

  it('never leaks the raw local part', () => {
    expect(redactEmail('sensitiveperson@example.com')).not.toContain('sensitiveperson');
  });
});

describe('maskPhone', () => {
  it('keeps only the last two digits', () => {
    expect(maskPhone('+14155550123')).toBe('***23');
  });

  it('collapses short or empty input to ***', () => {
    expect(maskPhone('1')).toBe('***');
    expect(maskPhone('')).toBe('***');
    expect(maskPhone(undefined)).toBe('***');
  });
});

describe('maskIp', () => {
  it('keeps the first two octets of an IPv4 address', () => {
    expect(maskIp('203.0.113.7')).toBe('203.0.*.*');
  });

  it('fully redacts IPv6 or unexpected formats', () => {
    expect(maskIp('::1')).toBe('***');
    expect(maskIp('not-an-ip')).toBe('***');
    expect(maskIp(undefined)).toBe('***');
  });
});
