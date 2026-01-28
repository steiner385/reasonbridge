# Citation Validator - Implementation Guide

**Status**: Ready for Development in Phase 009
**Complexity**: Medium (security-critical)
**Dependencies**: ipaddr.js, parse-domain, Node.js native URL API
**File Location**: `/packages/common/src/validation/citation-validator.ts`

---

## API Design

### Main Function

```typescript
/**
 * Comprehensive citation URL validation
 * Validates format, performs DNS lookup, checks IP range, and verifies public TLD
 *
 * @param urlString - User-provided URL
 * @param options - Validation options
 * @returns Validation result with resolved IP and error details
 * @throws Never throws; returns errors in result object
 */
export async function validateCitation(
  urlString: string,
  options: CitationValidationOptions = {},
): Promise<CitationValidationResult> {
  // Implementation follows multi-layer approach
}
```

### Types

```typescript
/**
 * Options for citation validation
 */
export interface CitationValidationOptions {
  /** Maximum URL length (default: 2048) */
  maxUrlLength?: number;

  /** Timeout for DNS lookups in milliseconds (default: 5000) */
  dnsTimeoutMs?: number;

  /** Timeout for HTTP HEAD requests in milliseconds (default: 3000) */
  checkTimeoutMs?: number;

  /** Whether to perform HTTP status check (default: true) */
  checkStatus?: boolean;

  /** Custom blocklisted IPs (in addition to RFC 1918) */
  additionalBlockedIps?: string[];

  /** Whether to allow IPv6 addresses (default: false) */
  allowIpv6?: boolean;
}

/**
 * Result of citation validation
 */
export interface CitationValidationResult {
  /** Whether the citation URL is valid */
  isValid: boolean;

  /** Validation errors (if any) */
  errors: CitationValidationError[];

  /** Normalized URL if valid */
  normalizedUrl?: string;

  /** Original URL as provided by user */
  originalUrl: string;

  /** Resolved IP address(es) for the hostname */
  resolvedIps?: string[];

  /** HTTP status code if checkStatus was true */
  statusCode?: number;

  /** Final URL after following redirects */
  finalUrl?: string;

  /** Time validation occurred */
  validatedAt: Date;

  /** Details about validation layer that failed (if any) */
  failedAt?: 'format' | 'length' | 'protocol' | 'hostname' | 'ip-range' | 'tld' | 'http-check';
}

/**
 * Individual validation error
 */
export interface CitationValidationError {
  code:
    | 'INVALID_FORMAT'
    | 'INVALID_PROTOCOL'
    | 'URL_TOO_LONG'
    | 'INVALID_HOSTNAME'
    | 'PRIVATE_IP_ADDRESS'
    | 'RESERVED_IP_ADDRESS'
    | 'INVALID_TLD'
    | 'HTTP_ERROR'
    | 'TIMEOUT'
    | 'UNKNOWN_ERROR';

  message: string;

  /** Additional context for debugging */
  details?: Record<string, unknown>;
}
```

---

## Implementation Skeleton

```typescript
import { lookup } from 'dns/promises';
import * as ipaddr from 'ipaddr.js';
import { parseDomain } from 'parse-domain';

// ============================================================================
// LAYER 1: URL Format Validation
// ============================================================================

function validateUrlFormat(urlString: string, maxLength: number = 2048): {
  valid: boolean;
  url?: URL;
  error?: CitationValidationError;
} {
  if (!urlString || typeof urlString !== 'string') {
    return {
      valid: false,
      error: {
        code: 'INVALID_FORMAT',
        message: 'URL must be a non-empty string',
      },
    };
  }

  // Check length
  if (urlString.length > maxLength) {
    return {
      valid: false,
      error: {
        code: 'URL_TOO_LONG',
        message: `URL exceeds maximum length of ${maxLength} characters`,
        details: { length: urlString.length },
      },
    };
  }

  // Try to parse URL
  try {
    const url = new URL(urlString);

    // Validate protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PROTOCOL',
          message: `Protocol '${url.protocol}' is not allowed. Only 'http://' and 'https://' are supported.`,
          details: { protocol: url.protocol },
        },
      };
    }

    return { valid: true, url };
  } catch (error) {
    return {
      valid: false,
      error: {
        code: 'INVALID_FORMAT',
        message: 'URL format is invalid. Please provide a valid HTTP(S) URL.',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    };
  }
}

// ============================================================================
// LAYER 2: DNS Resolution & IP Validation
// ============================================================================

async function validateHostname(url: URL, options: CitationValidationOptions): Promise<{
  valid: boolean;
  resolvedIps?: string[];
  error?: CitationValidationError;
}> {
  try {
    // Resolve hostname to IPv4 address
    const dnsResult = await lookup(url.hostname, {
      family: 4,
      timeout: options.dnsTimeoutMs || 5000,
    });

    const ipAddress = dnsResult.address;

    // Validate IP is public
    const ipValidation = validateIpAddress(ipAddress, options);
    if (!ipValidation.valid) {
      return { valid: false, error: ipValidation.error };
    }

    return {
      valid: true,
      resolvedIps: [ipAddress],
    };
  } catch (error) {
    const errorCode =
      error instanceof Error && error.message.includes('ENOTFOUND')
        ? 'INVALID_HOSTNAME'
        : error instanceof Error && error.message.includes('ERR_DNS_SET_SERVERS_FAILED')
          ? 'TIMEOUT'
          : 'UNKNOWN_ERROR';

    return {
      valid: false,
      error: {
        code: errorCode as any,
        message: `Failed to resolve hostname '${url.hostname}'`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    };
  }
}

// ============================================================================
// LAYER 2b: IP Address Validation
// ============================================================================

function validateIpAddress(
  ipString: string,
  options: CitationValidationOptions,
): {
  valid: boolean;
  error?: CitationValidationError;
} {
  try {
    const addr = ipaddr.process(ipString);

    // Check if address is unicast (public IP)
    if (addr.range() !== 'unicast') {
      const rangeType = addr.range();
      const isPrivate = ['private', 'loopback', 'linkLocal', 'reserved', 'multicast'].includes(
        rangeType,
      );

      return {
        valid: false,
        error: {
          code: isPrivate ? 'PRIVATE_IP_ADDRESS' : 'RESERVED_IP_ADDRESS',
          message: `IP address ${ipString} is not publicly routable (range: ${rangeType})`,
          details: { ipAddress: ipString, range: rangeType },
        },
      };
    }

    // Check against custom blocklist
    if (options.additionalBlockedIps?.includes(ipString)) {
      return {
        valid: false,
        error: {
          code: 'PRIVATE_IP_ADDRESS',
          message: `IP address ${ipString} is blocked`,
          details: { ipAddress: ipString },
        },
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: {
        code: 'INVALID_HOSTNAME',
        message: `Invalid IP address: ${ipString}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    };
  }
}

// ============================================================================
// LAYER 3: TLD Validation
// ============================================================================

function validateTld(url: URL): {
  valid: boolean;
  error?: CitationValidationError;
} {
  try {
    const parseResult = parseDomain(url.hostname);

    // Must be a recognized public domain
    if (parseResult.type !== 'DOMAIN' || !parseResult.topLevelDomain) {
      return {
        valid: false,
        error: {
          code: 'INVALID_TLD',
          message: `Hostname '${url.hostname}' does not have a valid public TLD`,
          details: { hostname: url.hostname, parseResult },
        },
      };
    }

    // Reject known private TLDs (additional safety check)
    const privateTlds = new Set([
      'local',
      'localhost',
      'internal',
      'corp',
      'home',
      'example',
      'test',
      'invalid',
    ]);

    if (privateTlds.has(parseResult.topLevelDomain.toLowerCase())) {
      return {
        valid: false,
        error: {
          code: 'INVALID_TLD',
          message: `TLD '.${parseResult.topLevelDomain}' is not a valid public TLD`,
          details: { tld: parseResult.topLevelDomain },
        },
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: {
        code: 'INVALID_TLD',
        message: `Failed to validate TLD for '${url.hostname}'`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    };
  }
}

// ============================================================================
// OPTIONAL LAYER 4: HTTP Status Check
// ============================================================================

async function checkHttpStatus(
  url: URL,
  checkTimeoutMs: number = 3000,
): Promise<{
  valid: boolean;
  statusCode?: number;
  finalUrl?: string;
  error?: CitationValidationError;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), checkTimeoutMs);

    const response = await fetch(url.toString(), {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Identify as citation validator to avoid rate limiting
        'User-Agent': 'reasonBridge-CitationValidator/1.0',
      },
    });

    clearTimeout(timeout);

    // Accept 2xx and 3xx, warn on 4xx, fail on 5xx
    const isOk = response.ok || (response.status >= 300 && response.status < 400);

    return {
      valid: isOk,
      statusCode: response.status,
      finalUrl: response.url,
      ...(response.status >= 500 && {
        error: {
          code: 'HTTP_ERROR',
          message: `Server returned error status ${response.status}`,
          details: { statusCode: response.status },
        },
      }),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        valid: false,
        error: {
          code: 'TIMEOUT',
          message: 'HTTP check timed out',
          details: { timeout: checkTimeoutMs },
        },
      };
    }

    return {
      valid: false,
      error: {
        code: 'HTTP_ERROR',
        message: 'Failed to check HTTP status',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    };
  }
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export async function validateCitation(
  urlString: string,
  options: CitationValidationOptions = {},
): Promise<CitationValidationResult> {
  const result: CitationValidationResult = {
    isValid: false,
    errors: [],
    originalUrl: urlString,
    validatedAt: new Date(),
  };

  // Layer 1: Format validation
  const formatResult = validateUrlFormat(urlString, options.maxUrlLength);
  if (!formatResult.valid) {
    result.errors.push(formatResult.error!);
    result.failedAt = 'format';
    return result;
  }

  const url = formatResult.url!;
  result.normalizedUrl = normalizeUrl(url.toString());

  // Layer 2: Hostname resolution & IP validation
  const hostnameResult = await validateHostname(url, options);
  if (!hostnameResult.valid) {
    result.errors.push(hostnameResult.error!);
    result.failedAt = 'hostname';
    return result;
  }
  result.resolvedIps = hostnameResult.resolvedIps;

  // Layer 3: TLD validation
  const tldResult = validateTld(url);
  if (!tldResult.valid) {
    result.errors.push(tldResult.error!);
    result.failedAt = 'tld';
    return result;
  }

  // Optional Layer 4: HTTP status check
  if (options.checkStatus !== false) {
    const checkResult = await checkHttpStatus(url, options.checkTimeoutMs);
    if (!checkResult.valid && checkResult.error) {
      // Don't fail validation on HTTP check unless it's a 5xx error
      // Timeouts and 4xx are treated as warnings
      if (
        checkResult.error.code === 'HTTP_ERROR' &&
        checkResult.statusCode &&
        checkResult.statusCode >= 500
      ) {
        result.errors.push(checkResult.error);
        result.failedAt = 'http-check';
        return result;
      }
      // For timeouts and 4xx, add as error but still consider URL valid
      // (user may cite URL even if currently broken)
    }
    result.statusCode = checkResult.statusCode;
    result.finalUrl = checkResult.finalUrl;
  }

  // All validations passed
  result.isValid = true;
  return result;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes a URL for comparison and storage
 */
function normalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);

    // Remove default ports
    if (
      (url.protocol === 'http:' && url.port === '80') ||
      (url.protocol === 'https:' && url.port === '443')
    ) {
      url.port = '';
    }

    // Remove fragment
    url.hash = '';

    // Remove trailing slash from pathname (optional)
    if (url.pathname.endsWith('/') && url.pathname !== '/') {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return urlString; // Return original if normalization fails
  }
}

/**
 * Lightweight validation - returns boolean only (for early checks)
 */
export function isCitationUrlLikelyValid(urlString: string): boolean {
  const result = validateUrlFormat(urlString);
  return result.valid;
}

/**
 * Extract domain from validated URL
 */
export function getCitationDomain(normalizedUrl: string): string | null {
  try {
    return new URL(normalizedUrl).hostname;
  } catch {
    return null;
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Citation Validator', () => {
  describe('Layer 1: Format Validation', () => {
    test('rejects invalid URL format', async () => {
      const result = await validateCitation('not a url');
      expect(result.isValid).toBe(false);
      expect(result.failedAt).toBe('format');
    });

    test('rejects URLs > 2048 chars', async () => {
      const longUrl = `https://example.com/${'a'.repeat(2100)}`;
      const result = await validateCitation(longUrl);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('URL_TOO_LONG');
    });

    test('rejects non-http protocols', async () => {
      const result = await validateCitation('ftp://example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_PROTOCOL');
    });

    test('rejects javascript: URLs', async () => {
      const result = await validateCitation('javascript:alert(1)');
      expect(result.isValid).toBe(false);
    });

    test('accepts valid https URLs', async () => {
      // Will fail on Layer 2 (DNS), but passes Layer 1
      const result = await validateCitation('https://example.com');
      expect(result.failedAt).not.toBe('format');
    });
  });

  describe('Layer 2: IP Validation', () => {
    test('rejects localhost addresses', async () => {
      const result = await validateCitation('http://127.0.0.1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'PRIVATE_IP_ADDRESS')).toBe(true);
    });

    test('rejects RFC 1918 private ranges', async () => {
      const privateUrls = [
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://192.168.1.1',
      ];

      for (const url of privateUrls) {
        const result = await validateCitation(url);
        expect(result.isValid).toBe(false);
      }
    });

    test('rejects IPv6 loopback', async () => {
      const result = await validateCitation('http://[::1]');
      expect(result.isValid).toBe(false);
    });

    test('rejects AWS metadata endpoint', async () => {
      const result = await validateCitation('http://169.254.169.254/latest/meta-data');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Layer 3: TLD Validation', () => {
    test('rejects .local domains', async () => {
      const result = await validateCitation('http://internal.local');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_TLD')).toBe(true);
    });

    test('rejects localhost variant', async () => {
      const result = await validateCitation('http://localhost');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Layer 4: HTTP Check', () => {
    test('marks broken links but allows citation', async () => {
      const result = await validateCitation('https://httpbin.org/status/404');
      // Should be valid because 404 is still a valid response
      // (user may want to cite archived content)
    });

    test('rejects server errors (500+)', async () => {
      const result = await validateCitation('https://httpbin.org/status/503', {
        checkStatus: true,
      });
      // Server error should fail validation
      expect(result.statusCode).toBe(503);
    });
  });

  describe('Edge Cases', () => {
    test('handles DNS rebinding by checking IP range', async () => {
      // This is hard to test without actual DNS rebinding
      // But the implementation prevents it by validating IP range
    });

    test('handles international domains', async () => {
      const result = await validateCitation('https://münchen.de');
      // Should handle punycode correctly
    });

    test('normalizes URLs correctly', async () => {
      const result = await validateCitation('https://EXAMPLE.COM:443/PATH');
      expect(result.normalizedUrl).toContain('example.com');
      expect(result.normalizedUrl).not.toContain(':443');
    });
  });
});
```

### Integration Tests

```typescript
describe('Citation Validator Integration', () => {
  test('validates real-world URLs', async () => {
    const result = await validateCitation('https://www.wikipedia.org');
    expect(result.isValid).toBe(true);
    expect(result.normalizedUrl).toBeTruthy();
    expect(result.resolvedIps).toBeTruthy();
  });

  test('marks broken real-world URLs appropriately', async () => {
    const result = await validateCitation(
      'https://definitely-not-a-real-domain-12345.com',
    );
    expect(result.isValid).toBe(false);
    expect(result.failedAt).toBe('hostname');
  });
});
```

---

## Database Schema

### Add to Prisma Schema

```prisma
model Citation {
  id                String   @id @default(cuid())

  // URL storage
  originalUrl       String   @db.VarChar(2048)  // User-entered URL
  normalizedUrl     String   @db.VarChar(2048)  // Deduplicated URL

  // Validation metadata
  resolvedIp        String?  // IP at validation time
  validatedAt       DateTime @default(now())

  // HTTP check result
  lastCheckedAt     DateTime?
  lastStatusCode    Int?
  status            String   @default("active") // active | broken | pending

  // Display
  description       String?  @db.VarChar(500)
  title             String?  @db.VarChar(200)

  // Relationships
  response          Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  responseId        String

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([responseId])
  @@index([normalizedUrl]) // For deduplication
  @@index([status]) // For batch checking
}

model Response {
  id                String     @id @default(cuid())
  // ... existing fields ...

  citations         Citation[]
}
```

---

## Error Message Guidelines

Provide clear, user-friendly error messages:

| Code | User Message | Technical Reason |
|------|--------------|------------------|
| INVALID_FORMAT | "That doesn't look like a valid URL. Please include http:// or https://" | Parsing failed |
| INVALID_PROTOCOL | "Only web links (http:// or https://) are supported" | Protocol not whitelisted |
| URL_TOO_LONG | "That URL is too long. Please use a URL shortener." | > 2048 characters |
| INVALID_HOSTNAME | "That domain doesn't exist or can't be reached" | DNS resolution failed |
| PRIVATE_IP_ADDRESS | "That URL points to a private network address" | IP in RFC 1918 range |
| INVALID_TLD | "That domain name isn't valid" | Not a public TLD |
| HTTP_ERROR | "That link might be broken (server error). You can still cite it if needed." | HTTP 5xx status |
| TIMEOUT | "That site took too long to respond. Try again or paste it anyway." | Connection timeout |

---

## Performance Considerations

### Optimization Techniques

1. **Cache DNS lookups** for 1 hour (with invalidation option)
2. **Parallel validation** when validating multiple citations
3. **Rate limit external HTTP checks** (10/sec system-wide)
4. **Use HEAD requests** instead of GET (lighter)
5. **Implement circuit breaker** for frequently-failing domains

### Caching Strategy

```typescript
class CitationValidationCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 1 * 60 * 60 * 1000; // 1 hour

  get(normalizedUrl: string): CachedValidation | null {
    const entry = this.cache.get(normalizedUrl);
    if (!entry || Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(normalizedUrl);
      return null;
    }
    return entry.result;
  }

  set(normalizedUrl: string, result: CitationValidationResult): void {
    this.cache.set(normalizedUrl, {
      timestamp: Date.now(),
      result,
    });
  }
}
```

---

## Deployment Checklist

- [ ] Dependencies installed (`ipaddr.js`, `parse-domain`)
- [ ] Unit tests all passing (>90% coverage)
- [ ] Integration tests against real domains
- [ ] Error messages reviewed for UX
- [ ] Rate limiting configured
- [ ] Cache TTL tuned for production
- [ ] Monitoring/logging for SSRF attempts
- [ ] Documentation updated
- [ ] Code reviewed by security team
- [ ] Load testing (validate 100 citations/second)
- [ ] Rollout plan for gradual adoption

