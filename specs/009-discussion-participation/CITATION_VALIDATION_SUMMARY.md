# Citation URL Validation: Executive Summary

**Research Completed**: January 27, 2026
**Recommendation Status**: Ready for Implementation
**Effort Estimate**: 1.5-2 weeks (Phase 009)

---

## Quick Answer for Each Research Task

### 1. URL Validation Libraries

**Recommendation**: Use **Native Node.js URL API** + `ipaddr.js` + `parse-domain`

| Option | Recommendation | Reason |
|--------|---|---|
| **Native URL API** ✅ | USE | WHATWG standard, zero dependencies, maintained by Node.js core, best security |
| **validator.js** | OPTIONAL | Comprehensive validation lib, good if you need email/password too |
| **is-url** | ❌ AVOID | 8 years unmaintained, no protocol validation |
| **url-parse** | ❌ AVOID | Deprecated; docs recommend native URL API |

**NPM Packages Needed**:
```json
{
  "ipaddr.js": "^2.1.0",
  "parse-domain": "^7.2.0"
}
```

---

### 2. SSRF Prevention Patterns

**Critical Finding**: DO NOT USE ANY DENYLISTS
- `ssrfcheck` - Can be bypassed
- `safe-axios` - Can be bypassed
- `nossrf` - Can be bypassed
- `private-ip` - Can be bypassed via multicast

**Recommended: Multi-Layer Validation** (Defense-in-Depth)

```
Layer 1: Format & Protocol Validation
         ↓
Layer 2: DNS Resolution → IP Range Check (RFC 1918 + Reserved ranges)
         ↓
Layer 3: Public TLD Verification
         ↓
Layer 4: HTTP Status Check (Optional, for broken link detection)
```

**What Gets Blocked**:
- ✅ Localhost: 127.0.0.1, ::1, localhost, localtest.me
- ✅ Private IPs: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- ✅ Link-local: 169.254.0.0/16, fe80::/10
- ✅ AWS metadata: 169.254.169.254
- ✅ Multicast: 224.0.0.0/4
- ✅ Non-public TLDs: .local, .internal, localhost
- ✅ Non-HTTP protocols: ftp://, file://, javascript:, data:

**What Doesn't Work** (Don't Try These):
- ❌ Regex-based URL validation (fails on encoding tricks)
- ❌ DNS-only validation (susceptible to DNS rebinding)
- ❌ String matching for blocked IPs (alternative notations bypass)

---

### 3. URL Normalization Strategy

**Recommended Storage Model**:

```
Database Fields:
  originalUrl     → "https://EXAMPLE.COM:443/page"     (display to user)
  normalizedUrl   → "https://example.com/page"         (deduplication)
  resolvedIp      → "93.184.216.34"                   (audit trail)
  validatedAt     → 2026-01-27T10:30:00Z              (when checked)
```

**Normalization Rules**:
1. Lowercase protocol and hostname
2. Remove default ports (80 for http, 443 for https)
3. Remove URL fragments (#anchor)
4. Remove trailing slashes from pathname (optional)
5. Keep query string as-is

**Benefits**:
- Prevents duplicate citations of same URL with different formats
- Tracks validation time for audit trail
- Preserves user's original URL for transparency
- Enables deduplication in database

---

### 4. Broken Link Detection Strategy

**Recommendation: Two-Phase Approach**

#### Phase 1 (MVP - Feature 009): Lightweight On-Submit Check
```
When user submits citation:
  1. Validate format/SSRF (synchronous, all users affected)
  2. HTTP HEAD check (3-second timeout, non-blocking)
  3. Store result as "active" or "unverified"
  4. Display status badge to user
```

**User Experience**:
- ✅ "✓ Valid" if HTTP 2xx-3xx
- ⚠️ "Unverified" if timeout
- ⚠️ "Broken" if HTTP 4xx-5xx
- User can still cite even if broken (they may reference archived content)

#### Phase 2 (Post-MVP): Background Monitoring Job
```
Daily/weekly background job:
  - Check citations from active discussions
  - Run in batches (50-100 per job)
  - Update status column
  - Notify discussion creators if links break
```

**What NOT to Do**:
- ❌ Don't block users from citing broken links
- ❌ Don't crawl external sites aggressively
- ❌ Don't store cached page content (copyright)
- ❌ Don't check all links daily (causes DoS)

---

## SSRF Protection Checklist

### Implementation

- [ ] **Parse URLs** with `new URL(input)`
- [ ] **Length check**: Reject > 2048 chars
- [ ] **Protocol check**: Only allow http:// and https://
- [ ] **DNS lookup**: Resolve hostname to IP
- [ ] **IP validation**: Check against private/reserved ranges using `ipaddr.js`
- [ ] **TLD check**: Verify public TLD using `parse-domain`
- [ ] **Request-time check**: Re-validate IP before following links
- [ ] **Error logging**: Log all SSRF attempts for security review
- [ ] **Rate limiting**: Max 10 citations per user per 5 minutes

### Blocklist (Known Internal Endpoints)

```typescript
const BLOCKED_IPS = [
  '127.0.0.1',              // Loopback
  '0.0.0.0',                // This network
  '169.254.169.254',        // AWS metadata
  // Add organization-specific internal IPs
];

// RFC 1918 + Reserved ranges handled by ipaddr.js range() check
```

### Validation Points

1. **At submission** (synchronous) - Format, SSRF, basic checks
2. **At display** (on request) - Verify protocol before rendering `<a>` tag
3. **In background job** - Re-validate IP range before following link
4. **In logs** - Every validation failure for audit

---

## Broken Link Detection Decision Matrix

| Scenario | MVP Behavior | Post-MVP Behavior |
|----------|---|---|
| Link returns 200 OK | ✓ Valid | ✓ Valid |
| Link returns 404 Not Found | ⚠ Broken | ⚠ Broken |
| Link returns 5xx Server Error | ⚠ Broken | ⚠ Broken |
| Link times out | ⚠ Unverified | Retry 3x before marking broken |
| Link redirects (3xx) | ✓ Valid (follow) | ✓ Valid (follow) |
| Link is private IP | ❌ INVALID | ❌ INVALID |
| Link is localhost variant | ❌ INVALID | ❌ INVALID |

---

## URL Storage Format Recommendation

### Database Schema
```sql
CREATE TABLE citations (
  id STRING PRIMARY KEY,
  originalUrl VARCHAR(2048) NOT NULL,      -- "https://EXAMPLE.COM:443/page"
  normalizedUrl VARCHAR(2048) NOT NULL,    -- "https://example.com/page"
  resolvedIp VARCHAR(45),                  -- IPv4 or IPv6
  validatedAt TIMESTAMP,
  lastCheckedAt TIMESTAMP,
  lastStatusCode INT,
  status ENUM('active', 'broken', 'pending') DEFAULT 'active',
  description VARCHAR(500),
  responseId STRING NOT NULL FOREIGN KEY,
  createdAt TIMESTAMP,

  INDEX (responseId),
  INDEX (normalizedUrl),  -- For deduplication
  INDEX (status)          -- For batch checking
);
```

### What to Normalize
- Domain case (lowercase)
- Port (remove if default)
- Fragment (remove)
- Query string (preserve exactly as-is)

### What NOT to Normalize
- Path case (preserve exactly)
- Query parameter order (preserve exactly)
- Percent-encoding (preserve exactly)

---

## Security Posture Summary

### Strong ✅
- Multi-layer validation prevents known SSRF bypasses
- DNS lookup + IP validation prevents DNS rebinding
- No dependencies on broken npm packages
- Request-time validation prevents race conditions
- Maintains audit trail of validation

### Adequate ⚠️
- Relies on `parse-domain` library (review quarterly)
- No protection against compromised external domains
- No content-based security checks (that's fact-checking module)

### Out of Scope ❌
- Phishing detection (URL looks legitimate but isn't)
- Content malware scanning
- Certificate pinning (for internal APIs)
- Rate limiting of external sites (courtesy check)

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Create validation utility in `/packages/common/src/validation/citation-validator.ts`
- [ ] Write 40+ unit tests (RFC 1918 ranges, IPv6, TLDs, etc.)
- [ ] Create types and interfaces for validation results
- [ ] Set up error message catalog

### Week 1.5: Integration
- [ ] Update Response schema in Prisma for citations
- [ ] Create database migration
- [ ] Add validation to response creation API
- [ ] Add error handling and user feedback

### Week 2: Testing & Launch
- [ ] Integration tests against real domains
- [ ] Load testing (100+ citations/second)
- [ ] Security review by team lead
- [ ] Production deployment and monitoring

### Post-MVP (Week 4+)
- [ ] Background job for periodic link checking
- [ ] Link status dashboard for admins
- [ ] User notifications for broken citations
- [ ] Citation trust scoring (for fact-checking integration)

---

## Questions for Feature Owner

Before implementation, clarify:

1. **User Experience**:
   - Should users be prevented from citing broken links? (Recommend: No, allow but warn)
   - Should there be a "check this link" button? (Recommend: Post-MVP)

2. **Data Retention**:
   - How long to keep validation history?
   - Should we track SSRF attempts in audit log? (Recommend: Yes, 90 days)

3. **Rate Limiting**:
   - Max citations per discussion? (Recommend: 20-50)
   - Max citations per user? (Recommend: 10 per 5 minutes)

4. **Background Monitoring**:
   - Is background job infrastructure available? (Recommend: BullMQ or similar)
   - Should we notify users of broken links? (Recommend: Async email)

5. **External Integrations**:
   - Need to check citations against fact-check database? (Recommend: Separate feature)
   - Need domain reputation scoring? (Recommend: Post-MVP, use API)

---

## Final Recommendation

**Proceed with Native URL API + ipaddr.js + parse-domain approach.**

This provides:
- ✅ Strong security (multi-layer defense)
- ✅ Low operational burden (minimal dependencies)
- ✅ Good user experience (clear error messages)
- ✅ Auditability (timestamp and IP tracking)
- ✅ Scalability (fast validation, no external APIs)

**Start with Phase 1 (on-submit check)** and graduate to Phase 2 (background monitoring) 4-6 weeks after launch based on user feedback.

---

## Documentation Location

All detailed research and implementation guides are in:
- `/specs/009-discussion-participation/citation-url-validation-research.md` - Security deep-dive
- `/specs/009-discussion-participation/citation-validator-implementation.md` - Code skeleton and tests
- `/specs/009-discussion-participation/CITATION_VALIDATION_SUMMARY.md` - This document

---

## References

Key sources for this research:

- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Snyk: Preventing SSRF in Node.js](https://snyk.io/blog/preventing-server-side-request-forgery-node-js/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security)
- [Advanced SSRF Bypasses Research](https://www.nodejs-security.com/blog/introduction-to-ssrf-bypasses-and-denylist-failures)
- [DNS Rebinding Attacks](https://windshock.github.io/en/post/2025-06-25-ssrf-defense/)

