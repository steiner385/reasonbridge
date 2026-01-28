# Citation Validation - Developer Reference Guide

**For**: Frontend and Backend Developers implementing Feature 009
**Quick Start**: 5 minutes
**Full Implementation**: 2-3 weeks

---

## Quick Start (Copy-Paste Ready)

### Installation

```bash
# Add dependencies
npm install ipaddr.js parse-domain

# TypeScript types
npm install --save-dev @types/ipaddr.js
```

### Minimal Example

```typescript
import { validateCitation } from '@reason-bridge/common/validation';

// In your API endpoint
async function createCitation(urlString: string) {
  const result = await validateCitation(urlString);

  if (!result.isValid) {
    return {
      error: result.errors[0].message,
      code: result.errors[0].code,
    };
  }

  // Safe to use - URL is valid and public
  await db.citation.create({
    originalUrl: result.originalUrl,
    normalizedUrl: result.normalizedUrl,
    resolvedIp: result.resolvedIps?.[0],
    validatedAt: result.validatedAt,
  });
}
```

### Frontend Integration

```typescript
// React component example
const [urlInput, setUrlInput] = useState('');
const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'error'>('idle');
const [errorMessage, setErrorMessage] = useState('');

const handleAddCitation = async () => {
  setValidationState('validating');

  try {
    const response = await fetch('/api/citations/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput }),
    });

    if (!response.ok) {
      const { error, code } = await response.json();
      setErrorMessage(error);
      setValidationState('error');
      return;
    }

    // Citation is valid
    setValidationState('valid');
    // Add to citations list...
    setUrlInput(''); // Clear input
  } catch (error) {
    setErrorMessage('Network error. Please try again.');
    setValidationState('error');
  }
};

return (
  <div>
    <input
      type="url"
      placeholder="https://example.com"
      value={urlInput}
      onChange={(e) => setUrlInput(e.target.value)}
      disabled={validationState === 'validating'}
    />
    <button onClick={handleAddCitation} disabled={validationState === 'validating'}>
      {validationState === 'validating' ? 'Checking...' : 'Add Citation'}
    </button>
    {validationState === 'error' && (
      <p className="error">{errorMessage}</p>
    )}
    {validationState === 'valid' && (
      <p className="success">✓ Citation added successfully</p>
    )}
  </div>
);
```

---

## API Reference

### Main Function

```typescript
async function validateCitation(
  urlString: string,
  options?: CitationValidationOptions
): Promise<CitationValidationResult>
```

### Options

```typescript
interface CitationValidationOptions {
  maxUrlLength?: number;        // Default: 2048
  dnsTimeoutMs?: number;        // Default: 5000
  checkTimeoutMs?: number;      // Default: 3000
  checkStatus?: boolean;        // Default: true (HTTP check)
  additionalBlockedIps?: string[]; // Custom blocklist
  allowIpv6?: boolean;          // Default: false
}
```

### Result

```typescript
interface CitationValidationResult {
  isValid: boolean;
  errors: CitationValidationError[];
  normalizedUrl?: string;
  originalUrl: string;
  resolvedIps?: string[];
  statusCode?: number;
  finalUrl?: string;
  validatedAt: Date;
  failedAt?: 'format' | 'length' | 'protocol' | 'hostname' | 'ip-range' | 'tld' | 'http-check';
}
```

### Error Codes

```typescript
type ErrorCode =
  | 'INVALID_FORMAT'          // Not a valid URL
  | 'INVALID_PROTOCOL'        // Not http/https
  | 'URL_TOO_LONG'           // > 2048 chars
  | 'INVALID_HOSTNAME'        // DNS lookup failed
  | 'PRIVATE_IP_ADDRESS'      // RFC 1918, loopback, etc.
  | 'RESERVED_IP_ADDRESS'     // Link-local, multicast, etc.
  | 'INVALID_TLD'             // Not a public TLD
  | 'HTTP_ERROR'              // HTTP 5xx
  | 'TIMEOUT'                 // Connection timeout
  | 'UNKNOWN_ERROR';          // Other error
```

---

## What Gets Blocked (Security Rules)

### ❌ Always Blocked

```
Protocols:
  - javascript:  (not http/https)
  - file://
  - ftp://
  - data:
  - gopher://
  - telnet://

Hostnames:
  - localhost
  - 127.0.0.1 to 127.255.255.255 (loopback)
  - ::1 (IPv6 loopback)
  - localtest.me (resolves to 127.0.0.1)

Private IPs (RFC 1918):
  - 10.0.0.0/8
  - 172.16.0.0/12
  - 192.168.0.0/16

Link-Local:
  - 169.254.0.0/16
  - fe80::/10

Reserved Ranges:
  - 0.0.0.0/8
  - 224.0.0.0/4 (multicast)
  - 240.0.0.0/4

Common Internal Endpoints:
  - 169.254.169.254 (AWS metadata)
  - 0.0.0.0

Private TLDs:
  - .local
  - .internal
  - .corp
  - .home
  - .localhost
```

### ✅ Always Allowed

```
Public URLs like:
  - https://www.google.com
  - https://github.com/reasonbridge/repo
  - https://example.com:8080
  - https://sub.domain.example.com/path?query=value
```

---

## Common Scenarios

### Scenario 1: User pastes YouTube link

```
Input:  "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
Layer 1: ✓ Valid format (http:/https:/), 200 chars
Layer 2: ✓ DNS resolves to 142.250.x.x (Google public IP)
Layer 3: ✓ .com is valid public TLD
Layer 4: ✓ HTTP returns 200
Result: ✅ VALID - Citation added
```

### Scenario 2: User tries to exploit with localhost IP

```
Input:  "http://127.0.0.1:8000/admin"
Layer 1: ✓ Valid format
Layer 2: ✗ 127.0.0.1 is loopback (private IP range)
Result: ❌ INVALID - "That URL points to a private network address"
```

### Scenario 3: User uses alternative IP notation

```
Input:  "http://2130706433"  (this is 127.0.0.1 in decimal)
Layer 1: ✓ Valid format
Layer 2: ✗ Resolves to 127.0.0.1 (loopback)
Result: ❌ INVALID - IPv4 parsing handles this
```

### Scenario 4: User uses AWS metadata endpoint

```
Input:  "http://169.254.169.254/latest/meta-data"
Layer 1: ✓ Valid format
Layer 2: ✗ 169.254.169.254 is in blocklist
Result: ❌ INVALID - "That URL points to a private network address"
```

### Scenario 5: User cites broken external link

```
Input:  "https://example.com/archived-page"
Layer 1: ✓ Valid format
Layer 2: ✓ Resolves to public IP (93.184.x.x)
Layer 3: ✓ .com is valid public TLD
Layer 4: ⚠ HTTP returns 404 (not 5xx, so allowed)
Result: ✅ VALID but with status badge: "⚠ Broken"
```

---

## Integration Points

### API Endpoint

```typescript
// POST /api/discussions/:discussionId/citations
app.post('/api/discussions/:discussionId/citations', async (req, res) => {
  const { url, description } = req.body;

  // 1. Validate citation URL
  const validation = await validateCitation(url);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.errors[0].message,
      code: validation.errors[0].code,
    });
  }

  // 2. Save to database
  const citation = await db.citation.create({
    data: {
      originalUrl: validation.originalUrl,
      normalizedUrl: validation.normalizedUrl,
      resolvedIp: validation.resolvedIps?.[0],
      validatedAt: validation.validatedAt,
      statusCode: validation.statusCode,
      status: validation.statusCode === 200 ? 'active' : 'broken',
      description,
      responseId: req.params.discussionId,
    },
  });

  return res.status(201).json(citation);
});
```

### Database Schema (Prisma)

```prisma
model Citation {
  id              String    @id @default(cuid())
  originalUrl     String    @db.VarChar(2048)
  normalizedUrl   String    @db.VarChar(2048)
  resolvedIp      String?
  validatedAt     DateTime  @default(now())
  lastCheckedAt   DateTime?
  lastStatusCode  Int?
  status          String    @default("active")
  description     String?
  title           String?
  response        Response  @relation(fields: [responseId], references: [id], onDelete: Cascade)
  responseId      String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([responseId])
  @@index([normalizedUrl])
  @@index([status])
}
```

### Response Model Update

```prisma
model Response {
  // ... existing fields ...
  citations       Citation[]
}
```

---

## Testing Helpers

### Unit Test Template

```typescript
import { validateCitation } from '@reason-bridge/common/validation';

describe('Citation Validation', () => {
  // Layer 1: Format
  test('rejects invalid URL format', async () => {
    const result = await validateCitation('not-a-url');
    expect(result.isValid).toBe(false);
    expect(result.failedAt).toBe('format');
  });

  // Layer 2: Hostname
  test('rejects localhost', async () => {
    const result = await validateCitation('http://localhost');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'PRIVATE_IP_ADDRESS')).toBe(true);
  });

  // Layer 3: TLD
  test('rejects .local domains', async () => {
    const result = await validateCitation('http://internal.local');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_TLD')).toBe(true);
  });

  // Integration
  test('accepts valid public URLs', async () => {
    const result = await validateCitation('https://www.wikipedia.org');
    // May fail on DNS if no internet, but demonstrates intent
    if (result.isValid) {
      expect(result.normalizedUrl).toBeTruthy();
      expect(result.resolvedIps).toBeTruthy();
    }
  });
});
```

### Load Test Template

```typescript
import { validateCitation } from '@reason-bridge/common/validation';

async function loadTest() {
  const urls = Array(100).fill('https://www.example.com');
  const startTime = Date.now();

  const results = await Promise.all(
    urls.map((url) => validateCitation(url))
  );

  const duration = Date.now() - startTime;
  const rps = results.length / (duration / 1000);

  console.log(`Validated ${results.length} URLs in ${duration}ms`);
  console.log(`RPS: ${rps.toFixed(2)}`);
  console.log(`Avg time per URL: ${(duration / results.length).toFixed(2)}ms`);
}

// Expected output:
// Validated 100 URLs in ~5000ms (mostly DNS latency)
// RPS: 20 (limited by DNS caching)
// Avg time per URL: 50ms
```

---

## Error Messages for End Users

### User-Friendly Messages

```typescript
const USER_MESSAGES: Record<ErrorCode, string> = {
  INVALID_FORMAT: "That doesn't look like a valid URL. Please include http:// or https://",
  INVALID_PROTOCOL: "Only web links (http:// or https://) are supported",
  URL_TOO_LONG: "That URL is too long. Please use a URL shortener.",
  INVALID_HOSTNAME: "That domain doesn't exist or can't be reached",
  PRIVATE_IP_ADDRESS: "That URL points to a private network address",
  RESERVED_IP_ADDRESS: "That URL is not accessible from the internet",
  INVALID_TLD: "That domain name isn't valid",
  HTTP_ERROR: "That link might be broken (server error). You can still cite it if needed.",
  TIMEOUT: "That site took too long to respond. Try again or paste it anyway.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
};
```

### Status Badges

```typescript
const STATUS_BADGES: Record<StatusCode, string> = {
  200: '✓ Valid',        // Content exists
  301: '→ Redirects to valid page',
  404: '⚠ Not found',    // Page removed/moved
  500: '❌ Server error', // Temporarily unavailable
  pending: '⏳ Checking...',
  unverified: '❓ Unverified',
};
```

---

## Performance Optimization Tips

### Caching DNS Results

```typescript
class DnsCache {
  private cache = new Map<string, CachedResult>();
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  get(hostname: string): string | null {
    const entry = this.cache.get(hostname);
    if (!entry || Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(hostname);
      return null;
    }
    return entry.ip;
  }

  set(hostname: string, ip: string): void {
    this.cache.set(hostname, {
      ip,
      timestamp: Date.now(),
    });
  }
}
```

### Batch Validation

```typescript
// Process multiple citations in parallel
const citations = ['https://site1.com', 'https://site2.com', 'https://site3.com'];

const results = await Promise.all(
  citations.map((url) => validateCitation(url))
);

// Reuse cached DNS results
```

### Timeout Tuning

```typescript
// For synchronous validation (blocking user input)
const result = await validateCitation(url, {
  dnsTimeoutMs: 3000,  // 3 second max
  checkTimeoutMs: 1000, // Skip HTTP check
  checkStatus: false,
});

// For background validation (non-blocking)
const result = await validateCitation(url, {
  dnsTimeoutMs: 10000, // 10 second max
  checkTimeoutMs: 5000, // Full HTTP check
  checkStatus: true,
});
```

---

## Monitoring & Observability

### Metrics to Track

```typescript
// In your monitoring system
metrics.increment('citations.validation.total', {
  tags: {
    result: 'valid' | 'invalid',
    failedAt: 'format' | 'hostname' | 'ip-range' | 'tld' | 'http-check',
  },
});

metrics.histogram('citations.validation.duration_ms', duration);

// Security alerts
if (result.errors.some((e) => e.code === 'PRIVATE_IP_ADDRESS')) {
  logger.warn('SSRF attempt detected', {
    url: urlInput,
    ip: result.resolvedIps?.[0],
    userId: req.user.id,
  });
}
```

### Logging Template

```typescript
logger.info('Citation validation', {
  originalUrl: urlInput,
  isValid: result.isValid,
  failedAt: result.failedAt,
  resolvedIp: result.resolvedIps?.[0],
  statusCode: result.statusCode,
  durationMs: Date.now() - startTime,
});
```

---

## Troubleshooting

### Issue: Validation always times out

**Cause**: DNS server unreachable
**Solution**: Check DNS configuration, increase timeout

```typescript
const result = await validateCitation(url, {
  dnsTimeoutMs: 10000, // Increase from 5000
});
```

### Issue: Legitimate URLs rejected as "private IP"

**Cause**: Internal DNS resolving to private IP
**Solution**: Whitelist specific domains

```typescript
const result = await validateCitation(url, {
  additionalBlockedIps: [], // Only block specific IPs
});
```

### Issue: Performance degradation with many citations

**Cause**: DNS lookups not cached
**Solution**: Implement caching layer (see Performance section)

---

## FAQ

**Q: Can users cite broken links?**
A: Yes. The validation marks them as "broken" with status badge, but allows citation. Users may want to cite content that was removed or archived.

**Q: What if a user's ISP blocks an IP?**
A: The validation will fail with "network error". User can try again later.

**Q: Can we cache citations for deduplication?**
A: Yes! That's why we store `normalizedUrl` - use it to check for duplicates before validation.

**Q: How do we handle internationalized domain names (IDN)?**
A: The native URL API handles punycode conversion automatically.

**Q: What about URL fragments (#anchor)?**
A: They're removed during normalization (not part of HTTP request).

---

## Next Steps

1. **Week 1**: Review `/citation-validator-implementation.md` for full skeleton
2. **Week 1**: Copy implementation, write 40+ tests
3. **Week 2**: Integration with API endpoint, database schema
4. **Week 2**: Security review and edge case testing
5. **Week 3**: Production deployment and monitoring setup

---

## Support & Questions

For implementation questions, refer to:
- `citation-url-validation-research.md` - Security deep-dive
- `citation-validator-implementation.md` - Full code skeleton
- `CITATION_VALIDATION_SUMMARY.md` - Executive summary
- `VALIDATION_APPROACH_COMPARISON.md` - Why this approach

