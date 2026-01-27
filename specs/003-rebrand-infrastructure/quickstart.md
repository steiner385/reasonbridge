# Quick

start Guide: ReasonBridge Rebrand Implementation

**Feature**: 003-rebrand-infrastructure
**Date**: 2026-01-26
**Audience**: Developers implementing the rebrand

## Prerequisites

Before starting implementation:

- [ ] Git access to ReasonBridge repository
- [ ] Node.js 20+ and pnpm 9+ installed
- [ ] Logo design files (SVG source from design team)
- [ ] Basic understanding of Tailwind CSS configuration
- [ ] Access to Jenkins, nginx, GitHub settings (for infrastructure updates)

---

## Phase 1: Logo Asset Preparation (30 minutes)

### Step 1: Install Tools

```bash
# Add dependencies to frontend package
cd frontend
pnpm add -D svgo sharp
```

### Step 2: Create Build Script

Create `scripts/build-icons.sh`:

```bash
#!/bin/bash
# Generate all brand assets from SVG source

set -e

echo "🎨 Building ReasonBridge brand assets..."

# 1. Optimize SVG source
echo "Optimizing SVG..."
npx svgo public/assets/logos/source/reasonbridge-logo-source.svg \
  --output public/assets/logos/reasonbridge-logo.svg \
  --precision=2

# 2. Generate PNG variants using Node.js
node scripts/generate-pngs.js

echo "✅ Brand assets built successfully"
ls -lh public/assets/logos/
```

Create `scripts/generate-pngs.js`:

```javascript
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [
  { name: 'logo-1024', size: 1024, input: 'reasonbridge-logo.svg' },
  { name: 'logo-512', size: 512, input: 'reasonbridge-logo.svg' },
  { name: 'logo-192', size: 192, input: 'reasonbridge-logo.svg' },
  { name: 'icon-180', size: 180, input: 'reasonbridge-icon.svg' },
  { name: 'icon-32', size: 32, input: 'reasonbridge-icon.svg' },
  { name: 'icon-16', size: 16, input: 'reasonbridge-icon.svg' },
];

const inputDir = path.join(__dirname, '../public/assets/logos');
const outputDir = inputDir;

async function generatePNGs() {
  for (const { name, size, input } of sizes) {
    const inputPath = path.join(inputDir, input);
    const outputPath = path.join(outputDir, `reasonbridge-${name}.png`);

    console.log(`Generating ${name} (${size}×${size})...`);

    await sharp(inputPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  ✓ ${name}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  console.log('✅ All PNGs generated');
}

generatePNGs().catch(console.error);
```

### Step 3: Add npm Scripts

Update `frontend/package.json`:

```json
{
  "scripts": {
    "build:icons": "bash scripts/build-icons.sh",
    "optimize:svg": "svgo public/assets/logos/*.svg"
  }
}
```

### Step 4: Generate Assets

```bash
npm run build:icons
```

**Expected Output**:
```
frontend/public/assets/logos/
├── reasonbridge-logo.svg           # 5-8 KB
├── reasonbridge-logo-1024.png      # 15-40 KB
├── reasonbridge-logo-512.png       # 8-20 KB
├── reasonbridge-logo-192.png       # 2-8 KB
├── reasonbridge-icon.svg           # 3-5 KB
├── reasonbridge-icon-180.png       # 2-6 KB
├── reasonbridge-icon-32.png        # 0.5-1.5 KB
└── reasonbridge-icon-16.png        # 0.2-0.5 KB
```

---

## Phase 2: Typography Setup (15 minutes)

### Step 1: Install Fonts

```bash
cd frontend
pnpm add @fontsource/nunito @fontsource/fira-code
```

### Step 2: Import Fonts

Update `frontend/src/index.css`:

```css
/* Brand Fonts - Self-hosted via @fontsource */
@import '@fontsource/nunito/400.css';  /* Body regular */
@import '@fontsource/nunito/500.css';  /* Body medium */
@import '@fontsource/nunito/600.css';  /* Heading semi-bold */
@import '@fontsource/nunito/700.css';  /* Heading bold */
@import '@fontsource/fira-code/400.css';  /* Code regular */
@import '@fontsource/fira-code/700.css';  /* Code bold */

/* Tailwind directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply min-h-screen bg-gray-50 text-gray-900 antialiased;
    font-family: 'Nunito', system-ui, sans-serif;
  }
}
```

### Step 3: Update HTML for Preload (Optional Performance Boost)

Update `frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/assets/logos/reasonbridge-icon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/logos/reasonbridge-icon-32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/assets/logos/reasonbridge-icon-16.png" />
    <link rel="apple-touch-icon" href="/assets/logos/reasonbridge-icon-180.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#2A9D8F" />
    <meta name="description" content="ReasonBridge - Find common ground through rational discussion" />
    <title>ReasonBridge - Rational Discussion Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Phase 3: Tailwind Configuration (10 minutes)

### Step 1: Update Brand Colors

Edit `frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ADD THESE BRAND COLORS
      colors: {
        brand: {
          primary: '#2A9D8F',    // Teal (left circle)
          secondary: '#6B9AC4',  // Soft Blue (right circle)
          accent: '#A8DADC',     // Light Sky (intersection)
        },
      },
      // UPDATE FONT FAMILY
      fontFamily: {
        sans: ['Nunito', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
```

### Step 2: Verify Tailwind Compilation

```bash
pnpm dev
# Check browser console for font loading
# Check DevTools → Network → Fonts tab
```

---

## Phase 4: Codebase Renaming (30 minutes)

### Step 1: Backup

```bash
git checkout -b rebrand-implementation
git add -A
git commit -m "chore: backup before rebrand"
```

### Step 2: Find All Instances

```bash
# Count occurrences
rg "ReasonBridge" --type ts --type js --type md | wc -l
# Should show: 9 files

# Preview changes
rg "ReasonBridge" -l
```

**Expected files**:
- packages/common/src/index.ts
- packages/db-models/src/index.ts
- packages/event-schemas/src/index.ts
- packages/testing-utils/src/index.ts
- packages/common/src/types/index.ts
- packages/common/src/utils/index.ts
- specs/003-rebrand-infrastructure/spec.md
- specs/003-rebrand-infrastructure/plan.md
- docs/conversations/2026-01-25-branding-naming-conversation.md

### Step 3: Bulk Replace

```bash
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" \
  ! -path "*/dist/*" ! -path "*/build/*" \
  -exec sed -i.bak 's/ReasonBridge/ReasonBridge/g' {} +
```

### Step 4: Validate

```bash
# Should show 0
rg "ReasonBridge" | wc -l

# Verify no false positives
rg "unite" | grep -v "ReasonBridge"

# Check git diff
git diff --stat
# Should show exactly 9 files modified

# Run tests
pnpm typecheck
pnpm lint
pnpm test:unit
```

### Step 5: Cleanup Backups

```bash
find . -name "*.bak" -delete
```

---

## Phase 5: Testing Checklist (15 minutes)

### Visual Regression Tests

Add Playwright visual snapshot tests:

```typescript
// frontend/tests/visual/brand.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Brand Identity', () => {
  test('Logo displays correctly in header', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('header img[alt*="ReasonBridge"]');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('src', /reasonbridge-logo/);
  });

  test('Brand colors applied to buttons', async ({ page }) => {
    await page.goto('/');
    const primaryButton = page.locator('button.bg-brand-primary').first();
    await expect(primaryButton).toHaveCSS('background-color', 'rgb(42, 157, 143)');
  });

  test('Typography uses Nunito font', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h1').first();
    const computedFont = await heading.evaluate(el =>
      window.getComputedStyle(el).fontFamily
    );
    expect(computedFont).toContain('Nunito');
  });
});
```

### WCAG Contrast Verification

Create `scripts/verify-contrast.js`:

```javascript
const contrastRatio = (hex1, hex2) => {
  const getLuminance = (hex) => {
    const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255);
    const [rs, gs, bs] = [r, g, b].map(x =>
      x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

const colors = {
  'Primary Teal': '#2A9D8F',
  'Soft Blue': '#6B9AC4',
  'Light Sky': '#A8DADC',
};

const backgrounds = {
  'White': '#FFFFFF',
  'Warm White': '#FAFBFC',
  'Charcoal': '#2D3748',
};

console.log('\n📊 WCAG AA Contrast Verification\n');

let passed = 0, failed = 0;

Object.entries(colors).forEach(([colorName, color]) => {
  Object.entries(backgrounds).forEach(([bgName, bg]) => {
    const ratio = contrastRatio(color, bg);
    const meetsAA = ratio >= 4.5;
    const status = meetsAA ? '✓' : '✗';
    console.log(`${status} ${colorName} on ${bgName}: ${ratio.toFixed(2)}:1`);
    meetsAA ? passed++ : failed++;
  });
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
```

Run verification:

```bash
node scripts/verify-contrast.js
```

---

## Phase 6: Infrastructure Updates (Jenkins/nginx/GitHub)

### Jenkins Job Rename

```bash
# SSH to Jenkins server
ssh jenkins-server

# Stop Jenkins
sudo systemctl stop jenkins

# Rename job directory
sudo mv /var/lib/jenkins/jobs/OLD_NAME /var/lib/jenkins/jobs/ReasonBridge-multibranch

# Start Jenkins
sudo systemctl start jenkins

# Verify via web UI: http://jenkins.reasonbridge.org/
```

### nginx Configuration

```bash
# SSH to web server
ssh web-server

# Backup current config
sudo cp /etc/nginx/sites-available/old.conf /etc/nginx/sites-available/reasonbridge.conf

# Edit config (update server_name)
sudo nano /etc/nginx/sites-available/reasonbridge.conf
# Change: server_name reasonbridge.org www.reasonbridge.org;

# Test syntax (CRITICAL)
sudo nginx -t

# Reload (zero downtime)
sudo systemctl reload nginx

# Verify
curl -I https://reasonbridge.org
```

### GitHub Repository Rename

1. Navigate to https://github.com/steiner385/reasonbridge/settings
2. Scroll to "Danger Zone" → "Rename repository"
3. Enter new name: `reasonbridge`
4. Confirm

**Update local clone**:

```bash
git remote set-url origin https://github.com/steiner385/reasonbridge.git
git fetch
```

---

## Completion Checklist

- [ ] Logo assets generated and optimized (8 files)
- [ ] Fonts installed and imported (@fontsource/nunito, @fontsource/fira-code)
- [ ] Tailwind config updated with brand colors
- [ ] All 9 "ReasonBridge" references replaced with "ReasonBridge"
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Unit tests pass (`pnpm test:unit`)
- [ ] Visual regression tests added and passing
- [ ] WCAG contrast ratios verified (all AA compliant)
- [ ] Jenkins job renamed
- [ ] nginx config updated and reloaded
- [ ] GitHub repository renamed
- [ ] Documentation updated (README.md, CLAUDE.md)

---

## Troubleshooting

### Fonts Not Loading

**Problem**: Nunito not visible in browser

**Solution**:
1. Check Network tab → Fonts section (should see `nunito-*.woff2`)
2. Verify import in `index.css`
3. Clear browser cache (Ctrl+Shift+R)
4. Ensure `@fontsource/nunito` is in `node_modules/`

### Logo Not Displaying

**Problem**: Logo shows broken image

**Solution**:
1. Check file paths in `public/assets/logos/`
2. Verify SVG syntax with `cat public/assets/logos/reasonbridge-logo.svg`
3. Test in browser: `http://localhost:5173/assets/logos/reasonbridge-logo.svg`
4. Check for CORS issues (shouldn't occur for same-origin)

### Tailwind Colors Not Applied

**Problem**: `bg-brand-primary` not working

**Solution**:
1. Restart Vite dev server
2. Check `tailwind.config.js` syntax (valid JavaScript)
3. Verify Tailwind content paths include your components
4. Use browser DevTools → Computed styles to inspect actual CSS

### Search-Replace False Positives

**Problem**: "united" or "reunite" changed incorrectly

**Solution**:
1. Pattern was too broad - should only match exact "ReasonBridge"
2. Restore from backup: `git checkout -- <file>`
3. Use more specific pattern: `sed 's/\bReasonBridge\b/ReasonBridge/g'`

---

## Support

For implementation help:
- Review `research.md` for technical decisions
- Check `data-model.md` for asset structure
- Refer to `contracts/` for specifications
- Run `/speckit.tasks` to generate detailed implementation tasks

**Ready to implement!** Follow phases 1-6 in order for smooth rebrand deployment.
