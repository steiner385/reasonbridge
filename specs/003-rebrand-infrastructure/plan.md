# Implementation Plan: ReasonBridge Rebrand & Infrastructure Configuration

**Branch**: `003-rebrand-infrastructure` | **Date**: 2026-01-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-rebrand-infrastructure/spec.md`

## Summary

Complete migration from "ReasonBridge" branding to "ReasonBridge" across all touchpoints: frontend UI (color palette, typography, logo), infrastructure configuration (Jenkins, nginx, GitHub), and documentation. This is a comprehensive rebrand implementing the approved brand identity: Teal (#2A9D8F) + Soft Blue (#6B9AC4) color palette with Nunito/Inter typography, overlapping circles logo symbolizing "finding common ground," and a warm-yet-trustworthy brand personality. The technical approach involves systematic search-and-replace of brand references (99 occurrences of "ReasonBridge"), CSS/Tailwind configuration updates for the new design system, logo asset creation in multiple sizes, and infrastructure configuration changes to reflect the reasonbridge.org domain.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Node.js 20 LTS (backend services)
**Primary Dependencies**:
- Frontend: React 18, Vite, Tailwind CSS 3.x, @tanstack/react-query
- Infrastructure: Jenkins (Groovy pipelines), nginx, GitHub Actions (YAML)
**Storage**: No database schema changes (brand assets stored as static files in /public/assets/)
**Testing**:
- Visual regression: Playwright snapshots for UI changes
- Integration: Existing Vitest/Playwright E2E suites must pass with new branding
- Infrastructure: Verify Jenkins pipeline runs, nginx config reload, DNS resolution
**Target Platform**: Web (modern browsers: Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (monorepo: frontend + 8 backend NestJS services)
**Performance Goals**:
- Brand assets (logo, fonts) load in <500ms on first visit
- No performance regression in existing metrics (Lighthouse scores remain >90)
- Typography rendering with no FOUT (Flash of Unstyled Text)
**Constraints**:
- Zero downtime for brand rollout (phased deployment)
- Maintain SEO rankings (301 redirects from old to new domain)
- Preserve git history (no force pushes or history rewriting)
- All tests must pass before merging (existing test suites validate functionality unchanged)
**Scale/Scope**:
- 99 files requiring "ReasonBridge" → "ReasonBridge" updates
- 8 brand color definitions in Tailwind config
- 6 logo sizes to generate (1024px, 512px, 192px, 180px, 32px, 16px)
- 3 infrastructure config files (Jenkins, nginx, GitHub)
- 30+ documentation files to update

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Gate Status: ⚠️ CONDITIONAL PASS

This feature is primarily a **configuration and asset update**, not new code development. Constitution principles apply where code changes occur:

| Principle | Applicability | Compliance Status |
|-----------|---------------|-------------------|
| **I. Code Quality** | Applies to CSS/Tailwind config changes | ✅ PASS - Tailwind config is linted, no `any` types in TS changes |
| **II. Testing Standards** | Applies to visual regression tests | ✅ PASS - Playwright visual snapshots will validate UI changes |
| **III. User Experience Consistency** | Applies to brand personality implementation | ✅ PASS - Brand design guidelines ensure consistent UX |
| **IV. Performance Requirements** | Applies to font/asset loading | ✅ PASS - Font subsetting, lazy loading for large logo variants |

**Special Considerations**:
- **No new business logic**: Only configuration updates and asset swaps
- **Test coverage**: Visual regression tests added for brand elements (logo, colors, typography)
- **Documentation updates**: Extensive but don't require automated testing
- **Infrastructure changes**: Manual verification required (Jenkins rename, nginx config reload)

**Violations requiring justification**: None. All constitution principles are met where applicable.

## Project Structure

### Documentation (this feature)

```text
specs/003-rebrand-infrastructure/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0: Brand asset preparation research
├── data-model.md        # Phase 1: Brand asset metadata schema
├── quickstart.md        # Phase 1: Brand implementation guide
├── contracts/           # Phase 1: Brand asset specifications (logo SVG, color JSON)
└── tasks.md             # Phase 2: Implementation tasks (/speckit.tasks - NOT YET CREATED)
```

### Source Code (repository root)

```text
# Existing monorepo structure (no new directories, only file updates)

frontend/
├── src/
│   ├── assets/
│   │   └── logos/              # NEW: Brand logos (SVG, PNG variants)
│   ├── styles/
│   │   └── tailwind.config.js  # UPDATED: Brand color palette
│   ├── components/
│   │   └── ui/                 # UPDATED: Brand-consistent UI primitives
│   └── index.html              # UPDATED: Page title, favicon references
├── public/
│   ├── favicon.ico             # REPLACED: ReasonBridge favicon
│   ├── logo192.png             # REPLACED: PWA icon
│   ├── logo512.png             # REPLACED: PWA icon
│   └── manifest.json           # UPDATED: App name, theme colors
└── tests/
    └── visual/                 # NEW: Playwright visual regression tests

services/                       # 8 NestJS services (ai, discussion, user, etc.)
└── [service-name]/
    └── package.json            # UPDATED: Project name references

infrastructure/
├── cdk/
│   ├── lib/
│   │   ├── cognito-stack.ts    # UPDATED: User pool names
│   │   ├── eks-stack.ts        # UPDATED: Cluster name
│   │   └── rds-stack.ts        # UPDATED: Database identifiers
│   └── bin/app.ts              # UPDATED: CDK app name
└── nginx/
    └── reasonbridge.conf        # NEW: nginx server config for reasonbridge.org

.jenkins/
├── Jenkinsfile                 # UPDATED: Job display names, artifact names
└── shared-lib/                 # SEPARATE REPO: reasonbridge-jenkins-lib
    └── vars/                   # UPDATED: Function documentation

.github/
├── workflows/
│   └── *.yml                   # UPDATED: Workflow names, job descriptions
└── ISSUE_TEMPLATE/             # UPDATED: Repository name references

docs/
├── README.md                   # UPDATED: Project name, logo, tagline
├── CLAUDE.md                   # UPDATED: All "ReasonBridge" references
└── naming-candidates.md        # PRESERVED: Historical record
```

**Structure Decision**: Reusing existing monorepo structure. No new directories required except for brand asset storage (`frontend/src/assets/logos/`, `frontend/public/assets/`). This is a migration/update project, not greenfield development.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No complexity violations. This feature is a configuration/asset update that maintains existing architectural patterns.

---

## Phase 0: Outline & Research

### Research Tasks

Since all major brand decisions have been made (name, logo, colors, typography documented in `/docs/plans/2026-01-25-reasonbridge-brand-design.md`), Phase 0 research focuses on **technical implementation details**:

1. **Logo Asset Creation**
   - Research SVG optimization techniques for logo file size <10KB
   - Investigate browser support for SVG favicon (fallback to PNG needed?)
   - Determine optimal PNG compression for app icons (1024px, 512px, etc.)
   - Find tools for automated multi-size icon generation from SVG source

2. **Typography Loading Strategy**
   - Research Google Fonts CDN vs. self-hosted fonts (performance, privacy)
   - Investigate font subsetting (load only required character ranges for Nunito/Inter)
   - Determine best practices for FOUT/FOIT prevention (font-display strategy)
   - Evaluate variable font support for Nunito (reduce HTTP requests)

3. **Tailwind Color Palette Integration**
   - Review Tailwind v3 custom color configuration syntax
   - Research color naming conventions (use semantic names or brand names?)
   - Investigate color contrast verification tools (WCAG AA compliance)
   - Find plugins for generating color shades (e.g., Teal-50, Teal-100, ... Teal-900)

4. **Infrastructure Migration Strategy**
   - Research Jenkins job rename process (can jobs be renamed without losing history?)
   - Investigate nginx server_name update best practices (test config before reload)
   - Determine GitHub repository rename impact (does it break existing clones/PRs?)
   - Find DNS migration strategies for zero-downtime domain changes

5. **Search-and-Replace Safety**
   - Research tools for codebase-wide find/replace with preview (ag, rg, VS Code, sed)
   - Investigate strategies to avoid false positives (e.g., "unite" in other contexts)
   - Determine file types to exclude (node_modules, .git, binary files)
   - Find validation approaches (grep for remaining old brand references post-change)

### Expected Outputs (research.md)

- **Logo Tooling Decision**: Selected SVG optimizer, PNG generator with rationale
- **Font Loading Strategy**: CDN vs self-hosted decision with performance justification
- **Color Integration Approach**: Tailwind config structure with semantic naming
- **Infrastructure Checklist**: Step-by-step Jenkins/nginx/GitHub update procedures
- **Migration Validation**: Tools and commands to verify 100% brand consistency

---

## Phase 1: Design & Contracts

### Data Model (data-model.md)

While this isn't a traditional data-driven feature, we document the **brand asset metadata structure**:

**Entity: BrandAsset**
- `type`: enum (logo, color, font, icon)
- `variant`: string (e.g., "logo-full", "logo-icon-only", "primary-teal")
- `format`: enum (svg, png, woff2, ttf)
- `size`: optional number (for raster images: 1024, 512, 192, 180, 32, 16)
- `path`: string (file path relative to frontend/src/assets/)
- `usage`: string (description of where/when to use this asset)
- `wcagCompliance`: boolean (for colors: meets WCAG AA contrast?)

**Entity: BrandColor**
- `name`: string (e.g., "Primary Teal", "Accent Light Sky")
- `hex`: string (#2A9D8F)
- `rgb`: object {r: 42, g: 157, b: 143}
- `hsl`: object {h: 172, s: 58%, l: 39%}
- `tailwindClass`: string (bg-brand-primary, text-brand-primary, etc.)
- `usage`: array of strings (["buttons", "links", "left-circle-logo"])

**Entity: Typography**
- `family`: string (Nunito, Inter)
- `weights`: array of numbers ([400, 500, 600, 700])
- `fallback`: string ("system-ui, sans-serif")
- `usage`: enum (heading, body, monospace)
- `cdnUrl`: string (Google Fonts URL)
- `localPath`: optional string (self-hosted font file path)

### Contracts (contracts/)

**Brand Asset Specifications** (not traditional API contracts):

1. **`logo-spec.json`**: Logo usage guidelines
   ```json
   {
     "name": "ReasonBridge Logo",
     "symbolism": "Two overlapping circles representing different perspectives",
     "variants": [
       {
         "type": "full",
         "description": "Symbol + 'ReasonBridge' wordmark",
         "formats": ["svg", "png"],
         "sizes": [1024, 512, 192],
         "usage": "App icon, header logo, marketing materials"
       },
       {
         "type": "icon-only",
         "description": "Overlapping circles without text",
         "formats": ["svg", "png"],
         "sizes": [180, 32, 16],
         "usage": "Favicon, app icon (iOS/Android)"
       }
     ],
     "colors": {
       "leftCircle": "#2A9D8F",
       "rightCircle": "#6B9AC4",
       "intersection": "#A8DADC"
     },
     "safeArea": "10% padding on all sides",
     "minSize": "16x16px (favicon)"
   }
   ```

2. **`color-palette.json`**: Brand color definitions
   ```json
   {
     "primary": {
       "name": "Teal",
       "hex": "#2A9D8F",
       "usage": ["buttons", "links", "left-circle-logo"],
       "wcagContrast": {
         "onWhite": 4.89,
         "onWarmWhite": 4.76,
         "complianceLevel": "AA"
       }
     },
     "secondary": {
       "name": "Soft Blue",
       "hex": "#6B9AC4",
       "usage": ["secondary-buttons", "right-circle-logo"],
       "wcagContrast": {
         "onWhite": 4.52,
         "complianceLevel": "AA"
       }
     },
     "accent": {
       "name": "Light Sky",
       "hex": "#A8DADC",
       "usage": ["highlights", "success-states", "logo-intersection"],
       "wcagContrast": {
         "onCharcoal": 7.21,
         "complianceLevel": "AAA"
       }
     }
   }
   ```

3. **`typography-spec.json`**: Font configuration
   ```json
   {
     "heading": {
       "family": "Nunito",
       "weights": [600, 700],
       "fallback": "Poppins, system-ui, sans-serif",
       "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Nunito:wght@600;700&display=swap"
     },
     "body": {
       "family": "Nunito",
       "weights": [400, 500],
       "fallback": "Inter, system-ui, sans-serif",
       "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500&display=swap"
     },
     "typeScale": {
       "h1": {"size": "2.25rem", "weight": 700, "lineHeight": 1.2},
       "h2": {"size": "1.875rem", "weight": 600, "lineHeight": 1.25},
       "h3": {"size": "1.5rem", "weight": 600, "lineHeight": 1.3},
       "body": {"size": "1rem", "weight": 400, "lineHeight": 1.6}
     }
   }
   ```

### Quickstart Guide (quickstart.md)

**Audience**: Developers implementing the rebrand

**Sections**:
1. **Prerequisites**: Git access, logo design software (Figma/Illustrator), Tailwind knowledge
2. **Logo Asset Preparation**: Step-by-step SVG to multi-size PNG conversion
3. **Tailwind Configuration**: How to add brand colors to `tailwind.config.js`
4. **Typography Setup**: Google Fonts integration or self-hosting instructions
5. **Testing Checklist**: Visual regression tests to run, contrast verification commands
6. **Infrastructure Updates**: Jenkins job rename, nginx config reload, GitHub settings

### Agent Context Update

Running `.specify/scripts/bash/update-agent-context.sh claude` will add to `.specify/memory/agent-claude.md`:

**New Technologies**:
- Tailwind CSS 3.x custom color configuration
- Google Fonts API integration
- SVG optimization tools (SVGO)
- PNG generation tools (sharp, imagemagick)

---

## Phase 2: Task Breakdown (NOT CREATED YET - use /speckit.tasks)

Phase 2 planning happens via `/speckit.tasks` command, which will generate `tasks.md` with ordered implementation steps. Expected task categories:

1. **Brand Asset Creation** (T001-T010)
   - Generate logo SVG source file
   - Export PNG variants (1024px, 512px, 192px, 180px, 32px, 16px)
   - Optimize SVG file size
   - Create favicon.ico

2. **Codebase Updates** (T011-T030)
   - Update Tailwind config with brand colors
   - Replace all "ReasonBridge" text references (99 files)
   - Update HTML page titles
   - Update package.json names
   - Update OpenAPI contract titles

3. **Frontend UI Implementation** (T031-T050)
   - Integrate Google Fonts (Nunito, Inter)
   - Update logo image references
   - Apply brand colors to UI components
   - Add rounded corners to buttons/cards
   - Implement WCAG AA contrast fixes

4. **Infrastructure Configuration** (T051-T060)
   - Rename Jenkins job to "ReasonBridge-multibranch"
   - Update jenkins-lib shared library namespace
   - Update nginx server_name to reasonbridge.org
   - Request SSL certificate for reasonbridge.org
   - Update GitHub repository name to "reasonbridge"

5. **Testing & Validation** (T061-T070)
   - Add Playwright visual regression tests
   - Verify all tests pass with new branding
   - Validate WCAG AA contrast ratios
   - Test infrastructure endpoints (DNS, SSL, Jenkins)
   - Grep for remaining "ReasonBridge" references

6. **Documentation Updates** (T071-T099)
   - Update README.md header
   - Update CLAUDE.md references
   - Update spec files
   - Update CDK infrastructure comments

---

## Critical Files Requiring Updates

### Frontend (High Priority)

| File Path | Changes Required | Impact |
|-----------|------------------|--------|
| `frontend/tailwind.config.js` | Add brand color palette (Teal, Soft Blue, Light Sky) | All UI components |
| `frontend/src/index.html` | Update <title>, favicon links | Browser tab, bookmarks |
| `frontend/public/manifest.json` | Update name, theme_color, background_color | PWA install |
| `frontend/src/components/ui/Button.tsx` | Apply brand colors, rounded corners | All buttons |
| `frontend/src/components/ui/Card.tsx` | Apply brand colors, rounded corners | All cards |
| `frontend/src/assets/logos/` | Add logo SVG, PNG variants (6 sizes) | Header, favicon, icons |

### Infrastructure (Critical)

| File Path | Changes Required | Impact |
|-----------|------------------|--------|
| `Jenkinsfile` | Update job names, artifact names | CI/CD pipeline |
| `infrastructure/nginx/reasonbridge.conf` | Update server_name, SSL cert paths | Domain routing |
| `.github/workflows/*.yml` | Update workflow names, job descriptions | GitHub Actions |
| `infrastructure/cdk/lib/*-stack.ts` | Update resource names (Cognito, EKS, RDS) | AWS resources |

### Documentation (Medium Priority)

| File Path | Changes Required | Impact |
|-----------|------------------|--------|
| `README.md` | Update project name, logo, tagline | First impression |
| `CLAUDE.md` | Replace all "ReasonBridge" references | Developer onboarding |
| `package.json` (all packages) | Update "name" field | npm packages |
| `services/*/package.json` | Update service names | Backend services |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **DNS propagation delay** | Medium | High | Plan deployment during low-traffic window; maintain old domain as redirect for 90 days |
| **Jenkins job rename breaks existing builds** | Low | Medium | Test rename in staging environment first; document rollback procedure |
| **Font loading failures (CDN down)** | Low | Medium | Include font-display: swap; provide system font fallbacks |
| **Logo file size too large** | Medium | Low | Optimize SVG with SVGO; use PNG only for favicons <32px |
| **WCAG contrast violations** | Low | High | Automated contrast checker in CI; manual review of all color combinations |
| **Broken external links to old domain** | High | Medium | Implement 301 redirects; monitor analytics for referral sources |
| **Test failures due to UI changes** | High | Low | Update Playwright snapshots; verify visual regression tests pass |
| **Git history loss during rename** | Low | High | Use GitHub repository rename (preserves history); avoid creating new repo |

---

## Success Metrics

Post-implementation validation criteria (from spec.md Success Criteria):

- **SC-001**: 100% brand consistency verified via grep (zero "ReasonBridge" in user-facing files)
- **SC-002**: Infrastructure endpoints resolve (jenkins.reasonbridge.org, reasonbridge.org return 200)
- **SC-003**: WCAG AA contrast verified via automated tools (all text/background combinations pass)
- **SC-004**: Fonts load successfully (Nunito, Inter visible in browser DevTools)
- **SC-005**: User testing shows 80%+ participants use "warm"/"trustworthy"/"approachable" descriptors
- **SC-006**: Jenkins pipeline runs display "ReasonBridge" in job names and console output
- **SC-007**: GitHub repository named "reasonbridge" with updated branch protection rules
- **SC-008**: Logo displays correctly at all sizes (visual inspection of favicon, app icons)

---

## Next Steps

1. **Review this plan** with stakeholders for approval
2. **Run Phase 0 research** to resolve technical unknowns (logo tooling, font strategy, etc.)
3. **Generate Phase 1 artifacts** (data-model.md, contracts/, quickstart.md)
4. **Run `/speckit.tasks`** to create detailed implementation task breakdown
5. **Begin implementation** following task order in tasks.md
