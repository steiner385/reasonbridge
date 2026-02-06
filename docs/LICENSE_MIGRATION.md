# License Migration: MIT → Apache 2.0

**Date:** 2025-02-05
**Status:** Completed

## Summary

ReasonBridge has migrated from MIT License to Apache License 2.0 to provide stronger patent protection for contributors and users.

## Why Apache 2.0?

1. **Express Patent Grant:** Protects against patent trolls and patent litigation
2. **Contributor Protection:** Clear patent licensing from contributors
3. **Nonprofit Alignment:** Better suited for 501(c)(3) charitable organization status
4. **Industry Standard:** Used by major civic tech and open source projects (Apache Foundation, Linux Foundation)

## What Changed

### Before (MIT License)

- Simple permissive license
- No explicit patent grant
- No contributor license agreement
- Minimal legal protection

### After (Apache 2.0)

- Explicit patent grant from contributors
- Protection against patent litigation
- Contributor License Agreement (CLA) via CONTRIBUTING.md
- SPDX headers in all source files
- Stronger legal framework for nonprofit operations

## What This Means for Contributors

- **All past and future contributions are licensed under Apache 2.0**
- You grant a patent license for your contributions (protecting users)
- Your code remains open source and freely usable
- By contributing, you certify your right to license the contribution (DCO 1.1)

## What This Means for Users

- **Same open source freedoms as MIT**
- Additional patent protection
- No change to usage rights
- Express grant of patent rights from contributors

## Technical Implementation

### Files Modified

- ✅ `LICENSE` - Full Apache 2.0 license text with "Copyright 2025 Tony Stein"
- ✅ `README.md` - Updated badge and license section with patent grant information
- ✅ All `package.json` files - Added `"license": "Apache-2.0"` field
- ✅ 518 TypeScript source files - Added SPDX headers
- ✅ `NOTICE` - Third-party attribution file
- ✅ `CONTRIBUTING.md` - Contributor License Agreement (CLA)
- ✅ `.husky/pre-commit` - Integrated license header enforcement
- ✅ `.husky/pre-commit-license-check` - SPDX header validation script

### SPDX Header Format

All TypeScript source files now include:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */
```

### Pre-commit Hook

A new pre-commit hook enforces SPDX headers on all new/modified TypeScript files:

- Automatically checks staged `.ts` and `.tsx` files
- Blocks commits missing SPDX headers
- Provides clear instructions for adding headers

To add headers to new files:

```bash
./scripts/add-license-headers.sh
```

## Legal Implications

### Patent Grant

Under Apache 2.0, contributors grant:

- A perpetual, worldwide, non-exclusive patent license
- Covers patents necessarily infringed by the contribution
- Terminates if you initiate patent litigation against the project

### Contributor Certification (DCO)

By contributing, you certify (Developer Certificate of Origin 1.1):

1. The contribution is your original work, or you have rights to submit it
2. You grant the patent license under Apache 2.0
3. You understand contributions are public and redistributable

## Nonprofit Filing Preparation

This migration strengthens the 501(c)(3) nonprofit application by demonstrating:

- **Open access mission** - Apache 2.0 + CC BY 4.0 (for white papers)
- **Public benefit** - Defensive publication protects civic tech ecosystem
- **Clear governance** - CONTRIBUTING.md, LICENSE, NOTICE files
- **Intellectual property ownership** - Clear copyright for transfer to nonprofit

When filing 501(c)(3), a **copyright assignment** will transfer ownership from "Tony Stein" to "ReasonBridge Foundation" (or chosen nonprofit name).

## Defensive Publications

To further protect our innovations from patent trolling, we're publishing white papers documenting key technical approaches:

1. **Polarization Measurement and Multi-Axis Common Ground Synthesis** (planned)
2. **Moral Foundations Theory Operationalization** (planned)
3. **Pattern-Based Bot Detection and Trust Scoring** (planned)

These publications will establish prior art, preventing others from patenting these approaches. All white papers will be licensed under CC BY 4.0.

## Questions?

- **License terms:** See [LICENSE](../LICENSE) for full Apache 2.0 text
- **Contributing:** See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
- **General questions:** Open a [GitHub Issue](https://github.com/steiner385/reasonbridge/issues)

## References

- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [SPDX License Identifiers](https://spdx.org/licenses/)
- [Developer Certificate of Origin](https://developercertificate.org/)
- [Apache Foundation Best Practices](https://www.apache.org/legal/resolved.html)
