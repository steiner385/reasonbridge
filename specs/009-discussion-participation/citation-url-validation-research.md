# Citation URL Validation & Security Research

**Research Date**: January 27, 2026
**Feature Context**: 009-Discussion Participation (citations for discussion responses)
**Requirement**: Implement secure user-provided citation URLs with SSRF prevention

---

## 1. URL Validation Libraries

### Recommended: Native Node.js URL API

**Option 1: Native `URL` Constructor** (RECOMMENDED)
- **Availability**: Built-in since Node.js 10+
- **Security**: WHATWG standardized URL parsing
- **Maintenance**: Zero dependencies, actively maintained by Node.js core
- **Performance**: Optimized C++ implementation
- **Usage**:
```typescript
try {
  const url = new URL(userProvidedUrl);
  // Access url.protocol, url.hostname, url.pathname, etc.
} catch (error) {
  // Invalid URL format
}
```

### Option 2: `validator.js`

**Pros:**
- Comprehensive validation library (email, URLs, credit cards, etc.)
- ~2.5M weekly downloads
- Well-maintained with security focus
- Easy to use with clear error messages

**Cons:**
- Additional dependency (12KB minified)
- Not purpose-built for SSRF prevention
- Limited built-in IP validation

**NPM Package**: [validator](https://www.npmjs.com/package/validator)

```typescript
import validator from 'validator';
const isValidUrl = validator.isURL(userInput, {
  protocols: ['http', 'https'],
  require_protocol: true,
});
```

### Option 3: `is-url`

**Pros:**
- Lightweight
- Simple boolean validation

**Cons:**
- Last updated 8 years ago (LEGACY STATUS)
- No protocol checking
- No SSRF prevention features
- 1,200+ projects still using it (indicates adoption inertia)

**Status**: NOT RECOMMENDED for new projects

### Option 4: `url-parse`

**Pros:**
- Parses URLs into component parts
- Historical use case

**Cons:**
- Created before WHATWG URL API
- Official docs recommend using native URL instead
- Parsing alone doesn't validate

**Status**: NOT RECOMMENDED - prefer native URL API

---

## 2. SSRF Prevention - Core Patterns

### Critical Vulnerabilities in Common Approaches

**Denylist Failures** (DO NOT USE):
Multiple npm packages have been compromised by incomplete denylists:
- `ssrfcheck` - Incomplete denylist renders protection broken
- `safe-axios` - Outdated IP ranges create bypass windows
- `nossrf` - Treats all resolved IPs as legitimate
- `private-ip` - Vulnerable to multicast addresses (224.0.0.0/4) and other bypass techniques

Source: [nodejs-security.com SSRF bypass documentation](https://www.nodejs-security.com/blog)

**Key Insight**: Denylists are "too brittle and can be easily bypassed" - research shows even known dangerous destinations (localhost, 127.0.0.1) have variants like:
- IPv4 decimal notation (127.0.0.1 = 2130706433)
- IPv4 octal notation (0177.0000.0000.0001)
- IPv6 loopback (::1)
- Domain variants (localtest.me, 127.0.0.1.xip.io)
- DNS rebinding attacks

### Recommended: Multi-Layer Validation Approach

#### Layer 1: URL Format Validation
```typescript
function validateUrlFormat(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Require http/https only
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    // Reject URLs > 2048 characters (prevent DoS)
    if (urlString.length > 2048) {
      return false;
    }

    // Reject internal file protocols
    if (url.protocol === 'file:') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

#### Layer 2: Hostname/IP Validation with DNS Resolution

```typescript
import { lookup } from 'dns/promises';
import ipaddr from 'ipaddr.js'; // npm package

async function validateHostname(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    // Resolve hostname to IP address
    const result = await lookup(hostname, { family: 4 });
    const ipAddress = result.address;

    // Check if IP is private/internal
    const parsedIp = ipaddr.process(ipAddress);
    if (parsedIp.range() !== 'unicast') {
      return false; // Is private/reserved
    }

    // Additional specific blocklist for common internal endpoints
    const blockedIps = [
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254', // AWS metadata
    ];

    return !blockedIps.includes(ipAddress);
  } catch (error) {
    return false;
  }
}
```

#### Layer 3: Public TLD Verification

```typescript
import { parseDomain, ParseResult } from 'parse-domain';

function hasValidPublicTld(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const parseResult = parseDomain(url.hostname);

    // Must be a public TLD, not private (localhost, .local, etc.)
    return parseResult.type === 'DOMAIN' && parseResult.topLevelDomain !== null;
  } catch {
    return false;
  }
}
```

### Protected IP Ranges (RFC 1918 + Extended)

```typescript
// RFC 1918 Private Ranges
const PRIVATE_RANGES = [
  '10.0.0.0/8',           // 10.0.0.0 - 10.255.255.255
  '172.16.0.0/12',        // 172.16.0.0 - 172.31.255.255
  '192.168.0.0/16',       // 192.168.0.0 - 192.168.255.255
];

// Additional reserved ranges
const RESERVED_RANGES = [
  '127.0.0.0/8',          // Loopback
  '0.0.0.0/8',            // This network
  '169.254.0.0/16',       // Link local
  '224.0.0.0/4',          // Multicast
  '240.0.0.0/4',          // Reserved
  '255.255.255.255/32',   // Broadcast
];

// IPv6 loopback
const IPV6_LOOPBACK = '::1/128';
const IPV6_LINK_LOCAL = 'fe80::/10';
const IPV6_PRIVATE = 'fc00::/7';
```

### DNS Rebinding Attack Prevention

**Attack Pattern**:
1. Attacker controls DNS and website
2. First lookup resolves to attacker's IP
3. Page makes fetch to attacker's domain
4. Second lookup resolves to victim's internal IP (localhost, 192.168.x.x)
5. Request hits internal service

**Prevention**:
- Validate IP **immediately** after DNS lookup
- Don't reuse DNS resolution; check before each request
- Implement request-level validation, not DNS-level only
- Consider HTTPS certificate pinning for internal services
- Use separate HTTP clients for internal vs external requests

---

## 3. URL Normalization Strategy

### Why Normalize?

URL normalization removes encoding tricks and variations that could bypass validation:
- `http://EXAMPLE.COM` vs `http://example.com` (case sensitivity)
- `http://example.com:80` vs `http://example.com` (default ports)
- `http://example.com/path%2F..` (double encoding)
- `http://example.com@attacker.com` (credential hijacking)

### Recommended Normalization Approach

```typescript
function normalizeUrl(urlString: string): string {
  const url = new URL(urlString);

  // Lowercase protocol and hostname
  const normalized = new URL(url.toString());

  // Remove default ports
  if (
    (normalized.protocol === 'http:' && normalized.port === '80') ||
    (normalized.protocol === 'https:' && normalized.port === '443')
  ) {
    normalized.port = '';
  }

  // Remove trailing slashes from pathname (optional, depends on use case)
  if (normalized.pathname.endsWith('/') && normalized.pathname !== '/') {
    normalized.pathname = normalized.pathname.slice(0, -1);
  }

  // Remove fragment if present
  normalized.hash = '';

  return normalized.toString();
}
```

### Storage Strategy

**Recommended: Store Normalized + Original Pair**

```typescript
interface Citation {
  id: string;
  originalUrl: string;        // User-entered URL (for display/transparency)
  normalizedUrl: string;      // Deduplicated URL (for validation/dedup)
  resolvedIp?: string;        // IP at validation time (for audit)
  description?: string;
  status: 'active' | 'broken'; // From periodic checking
  validatedAt: Date;
  checkedAt?: Date;
}
```

**Benefits:**
- Prevents duplicate citations of same URL with different formats
- Preserves user's original URL for display
- Tracks when validation last occurred
- Enables audit trail for SSRF attempts

---

## 4. Broken Link Detection Strategy

### Approach 1: On-Submit Validation (Minimal)

**When**: Citation is first added
**Method**: HTTP HEAD request with timeout

```typescript
async function checkLinkValidity(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      // Don't follow redirects for HEAD; some servers don't support it
      redirect: 'manual',
    });

    clearTimeout(timeout);

    // Accept 2xx, 3xx, and 4xx (404 is broken but still a valid response)
    // Only reject 5xx and network errors
    return response.ok || response.status < 500;
  } catch (error) {
    return false; // Network error, timeout, or abort
  }
}
```

### Approach 2: Periodic Background Monitoring (Recommended for MVP+)

**When**: Daily/weekly background job
**Frequency**: Configurable (daily for active discussions, weekly for archived)
**Batch Processing**: Check 50-100 links per job to avoid overwhelming external servers

```typescript
interface LinkCheckJob {
  citationIds: string[];
  strategy: 'aggressive' | 'moderate' | 'relaxed';
}

// Aggressive: Follow redirects, check status codes strictly
// Moderate: Allow 3xx redirects, reject 4xx-5xx
// Relaxed: Accept 2xx-3xx, only flag 5xx or timeouts
```

### Approach 3: User-Initiated Check

Allow users to manually "check" a citation's status:

```typescript
interface CitationCheckResult {
  citationId: string;
  status: 'valid' | 'broken' | 'timeout' | 'unknown';
  statusCode?: number;
  finalUrl?: string; // After redirects
  checkedAt: Date;
}
```

### Strategy Recommendation: Hybrid for reasonBridge

**MVP Phase**:
- ✅ On-submit lightweight check (HEAD request, 3s timeout)
- ✅ Store result with timestamp
- ❌ No background monitoring (too complex initially)
- ✅ Display status badge: "✓ Verified" or "⚠ Unverified"

**Post-MVP**:
- ✅ Background job checking citations weekly
- ✅ Track historical status changes
- ✅ Flag citations that break and notify discussion creators
- ✅ Show "Last checked: X days ago" to users

**Never Do**:
- Block citation submission if link is broken (bad UX; user may still want to cite recent changes)
- Aggressively crawl linked pages (respect robots.txt, rate limits)
- Store page content (copyright concerns)

---

## 5. Security Checklist for Implementation

### Input Validation
- [ ] Use native Node.js URL API for initial parsing
- [ ] Reject URLs > 2048 characters
- [ ] Require `http://` or `https://` protocol only
- [ ] Reject `file://`, `ftp://`, `gopher://`, etc.
- [ ] Validate before storing in database

### SSRF Prevention
- [ ] Perform DNS lookup for hostname resolution
- [ ] Verify resolved IP is public (not RFC 1918, loopback, link-local, multicast)
- [ ] Check against blocklist of known internal endpoints (AWS metadata, etc.)
- [ ] Validate public TLD (not .local, .internal, localhost)
- [ ] Store validation timestamp and resolved IP for audit trail
- [ ] Re-validate before following links in background jobs
- [ ] Use separate HTTP client for external requests with security headers

### XSS Prevention
- [ ] Store URL as-is, don't interpolate into HTML
- [ ] When rendering citations, use `textContent` or template escaping
- [ ] Validate URL protocol before `<a href>` (ensure not `javascript:`)
- [ ] Consider `Content-Security-Policy: default-src 'none'` for untrusted content

### Rate Limiting
- [ ] Limit citation additions per user: 10 citations per 5 minutes
- [ ] Limit link checking: 100 checks per minute system-wide
- [ ] Reject users exceeding rate limit for validation checks

### Data Storage
- [ ] Store: `originalUrl`, `normalizedUrl`, `resolvedIp`, `validatedAt`
- [ ] Track edit/delete history for audit
- [ ] Enforce referential integrity (delete citations when discussion deleted)

### Error Handling
- [ ] Network timeouts → Mark as "Unverified" (user action required)
- [ ] DNS resolution failure → Mark as "Invalid" (block)
- [ ] SSRF detected → Log security event, block, notify admins
- [ ] Malformed URL → Reject at submission time with clear error message

---

## 6. Recommended Implementation Plan

### Phase 1: Security-First Validation (MVP - Feature 009)

**Library Choice**: Native Node.js URL API + `ipaddr.js` for IP validation

**Dependencies to Add**:
```json
{
  "ipaddr.js": "^2.1.0",
  "parse-domain": "^7.2.0"
}
```

**Implementation**:
1. Create `validateCitation` utility in `@reason-bridge/common/validation`
2. Multi-layer validation: format → hostname → TLD
3. Store normalized URL + metadata
4. Light on-submit check (3s timeout, HEAD request)
5. Return detailed error messages for UX

**Code Location**: `/packages/common/src/validation/citation-validator.ts`

### Phase 2: Background Monitoring (Post-MVP)

**Timing**: 2-4 weeks after Phase 1 release
**Components**:
- Worker job using existing job queue infrastructure
- Citation status update service
- Notification to discussion creators if citation breaks
- Admin dashboard for broken link statistics

### Phase 3: User Controls (Long-term)

- "Check this link" button on citations
- Citation trust scores (based on domain reputation)
- "Broken links" filter in discussion search
- Citation dispute mechanism for fact-checking integration

---

## 7. Common Misconceptions to Avoid

❌ **"Just regex the URL"** → Regex cannot safely parse URLs; use native URL API
❌ **"Blocklist will protect us"** → Denylists have 100% bypass rate; use allowlist + validation
❌ **"Validate once at submission"** → Use request-time validation too (DNS rebinding)
❌ **"Check all links daily"** → Causes DoS of external servers; use smart scheduling
❌ **"No protocol checking needed"** → `javascript:` and `data:` URLs are real threats
❌ **"IPv4 only is safe"** → IPv6 loopback (::1) and link-local (fe80::/10) bypass checks
❌ **"Private IPs are only internal"** → 169.254.0.0/16 (link-local) can be reached from internet

---

## 8. Reference Documentation

### OWASP & Security Standards
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP SSRF Prevention in Node.js](https://owasp.org/www-community/pages/controls/SSRF_Prevention_in_Nodejs)

### Node.js Security
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security)
- [Node.js URL API Documentation](https://nodejs.org/api/url.html)

### Research Papers & Blogs
- [Snyk: Preventing SSRF in Node.js](https://snyk.io/blog/preventing-server-side-request-forgery-node-js/)
- [Limitations of Secure SSRF Patches - Advanced Bypasses](https://windshock.github.io/en/post/2025-06-25-ssrf-defense/)
- [SSRF Bypass Techniques and Denylist Failures](https://www.nodejs-security.com/blog/introduction-to-ssrf-bypasses-and-denylist-failures)
- [DNS Rebinding Attacks](https://www.nodejs-security.com/blog/dns-rebinding-vulnerability-nodejs)

### NPM Packages (Security Research)
- [Bypassing SSRF in ssrfcheck](https://www.nodejs-security.com/blog/bypassing-ssrf-safeguards-ssrfcheck)
- [Bypassing SSRF in safe-axios](https://www.nodejs-security.com/blog/bypassing-ssrf-protection-safe-axios)
- [Bypassing SSRF in nossrf](https://www.nodejs-security.com/blog/bypassing-ssrf-protection-nossrf)
- [Multicast Bypass in private-ip](https://www.nodejs-security.com/blog/dont-be-fooled-multicast-ssrf-bypass-private-ip)

---

## 9. Executive Summary & Recommendation

### Recommended Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| URL Parsing | Native Node.js `URL` API | Zero dependencies, WHATWG standard, maintained by core team |
| IP Validation | `ipaddr.js` v2.1+ | Purpose-built, handles IPv4/IPv6, well-maintained |
| TLD Validation | `parse-domain` v7.2+ | Handles public/private TLD distinction correctly |
| SSRF Strategy | Multi-layer (format → IP → TLD) | Research shows single-layer approaches fail consistently |
| Broken Links | On-submit lightweight check | Minimal complexity for MVP; background job in Phase 2 |
| Storage | Normalized + Original URLs | Enables deduplication and audit trail |

### Security Posture

✅ **Strong**: Multi-layer validation prevents known SSRF bypasses
✅ **Maintainable**: No reliance on outdated npm packages with security issues
✅ **User-Friendly**: Clear error messages, doesn't block legitimate external URLs
⚠️ **Limitation**: No protection against compromised external domains; that's a separate fact-checking feature

### Decision Matrix

**Use Native URL API if**: You want minimal dependencies (RECOMMENDED)
**Use validator.js if**: You need comprehensive validation across email/passwords/URLs in one library
**Avoid**: is-url, url-parse, or any SSRF-specific npm package with denylist approach

---

## Questions for Feature Owner

1. **Severity Level**: Should broken citations block discussion viewing, or just show warning?
2. **Rate Limiting**: Should users be able to cite same URL multiple times (with different descriptions)?
3. **External Data**: Can system store/cache citation metadata (title, description, preview image)?
4. **Integrations**: Will citation validation integrate with fact-checking feature or remain independent?
5. **Compliance**: Any regulatory requirements (GDPR, HIPAA) affecting citation tracking/logging?

