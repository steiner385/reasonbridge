# Data Model: Brand Assets & Configuration

**Feature**: 003-rebrand-infrastructure
**Date**: 2026-01-26
**Purpose**: Define structure for brand asset metadata and configuration

## Overview

While this rebrand feature doesn't involve traditional database entities, we define the metadata structure for brand assets (logos, colors, fonts) to ensure consistent organization and usage across the codebase.

---

## Entity: BrandAsset

**Description**: Represents a single brand asset file (logo variant, icon, font file)

### Attributes

| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `type` | enum | Yes | Asset category | `'logo' \| 'icon' \| 'font' \| 'color'` |
| `variant` | string | Yes | Specific variant identifier | `'logo-full'`, `'logo-icon-only'`, `'primary-teal'` |
| `format` | enum | Yes | File format | `'svg' \| 'png' \| 'woff2' \| 'ttf'` |
| `size` | number | No | Pixel dimensions (for raster) | `1024`, `512`, `192`, `32` |
| `path` | string | Yes | File path relative to assets/ | `'/logos/reasonbridge-logo.svg'` |
| `usage` | string | Yes | Where/when to use this asset | `'Header logo, marketing materials'` |
| `wcagCompliance` | boolean | No | Meets WCAG AA contrast (colors) | `true`, `false` |
| `fileSize` | number | No | File size in bytes | `8192` (8KB) |

### Relationships

- BrandAsset → BrandColor (for logo colors)
- BrandAsset → Typography (for font files)

### Validation Rules

- `type === 'logo' || 'icon'` → `format` must be `svg` or `png`
- `type === 'font'` → `format` must be `woff2` or `ttf`
- `format === 'png'` → `size` is required
- `format === 'svg'` → `size` is optional (scalable)
- `path` must be unique across all assets

### State Transitions

Not applicable (static asset metadata, no lifecycle states)

---

## Entity: BrandColor

**Description**: Represents a single color in the brand palette with usage guidelines

### Attributes

| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `name` | string | Yes | Human-readable color name | `'Primary Teal'`, `'Accent Light Sky'` |
| `hex` | string | Yes | Hexadecimal color code | `'#2A9D8F'` |
| `rgb` | object | Yes | RGB representation | `{r: 42, g: 157, b: 143}` |
| `hsl` | object | No | HSL representation | `{h: 172, s: 58%, l: 39%}` |
| `tailwindClass` | string | Yes | Tailwind utility class prefix | `'bg-brand-primary'`, `'text-brand-accent'` |
| `usage` | array<string> | Yes | Where this color is used | `['buttons', 'links', 'left-circle-logo']` |
| `wcagContrast` | object | No | Contrast ratios vs. backgrounds | `{onWhite: 4.89, onWarmWhite: 4.76}` |
| `complianceLevel` | enum | No | WCAG compliance level | `'AA' \| 'AAA'` |

### Relationships

- BrandColor → BrandAsset (logo uses specific colors)
- BrandColor → UIComponent (components reference brand colors)

### Validation Rules

- `hex` must match pattern `/^#[0-9A-F]{6}$/i`
- `rgb.r`, `rgb.g`, `rgb.b` must be 0-255
- `tailwindClass` must be unique across all colors
- If `wcagContrast` is provided, `complianceLevel` is required
- `complianceLevel === 'AA'` → all contrast values ≥ 4.5:1 (normal text)
- `complianceLevel === 'AAA'` → all contrast values ≥ 7.0:1 (enhanced)

---

## Entity: Typography

**Description**: Represents a font family configuration with weights and usage

### Attributes

| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `family` | string | Yes | Font family name | `'Nunito'`, `'Inter'`, `'Fira Code'` |
| `weights` | array<number> | Yes | Available font weights | `[400, 500, 600, 700]` |
| `fallback` | string | Yes | Fallback font stack | `'system-ui, sans-serif'` |
| `usage` | enum | Yes | Where font is used | `'heading' \| 'body' \| 'monospace'` |
| `cdnUrl` | string | No | Google Fonts CDN URL | `'https://fonts.googleapis.com/...'` |
| `localPath` | string | No | Self-hosted font file path | `'/fonts/nunito-variable.woff2'` |
| `variable` | boolean | Yes | Is variable font? | `true`, `false` |
| `subset` | string | No | Character subset | `'latin'`, `'latin-ext'`, `'cyrillic'` |

### Relationships

- Typography → BrandAsset (font files are assets)
- Typography → UIComponent (components use specific fonts)

### Validation Rules

- Either `cdnUrl` OR `localPath` must be provided (not both)
- `weights` must contain at least one value
- `weights` values must be 100, 200, 300, 400, 500, 600, 700, 800, or 900
- `variable === true` → `weights` can be omitted (variable fonts support all weights)
- `usage === 'heading'` → typically weights ≥ 600
- `usage === 'body'` → typically weights 400-500
- `usage === 'monospace'` → `family` should be monospace font

---

## Entity: UIComponent (Conceptual)

**Description**: Represents UI components that consume brand assets

### Attributes

| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `name` | string | Yes | Component name | `'Button'`, `'Card'`, `'Header'` |
| `brandColors` | array<string> | Yes | Referenced brand color names | `['Primary Teal', 'Accent Light Sky']` |
| `typography` | array<string> | Yes | Referenced font families | `['Nunito', 'Inter']` |
| `brandAssets` | array<string> | No | Referenced asset paths | `['/logos/reasonbridge-logo.svg']` |
| `wcagCompliance` | boolean | Yes | Component meets WCAG AA | `true`, `false` |

### Relationships

- UIComponent → BrandColor (many-to-many)
- UIComponent → Typography (many-to-many)
- UIComponent → BrandAsset (many-to-many)

### Validation Rules

- All `brandColors` must exist in BrandColor entity
- All `typography` must exist in Typography entity
- All `brandAssets` must exist in BrandAsset entity
- `wcagCompliance === true` → all color combinations meet 4.5:1 contrast

---

## File System Structure

### Brand Assets Directory Layout

```
frontend/
├── public/
│   └── assets/
│       ├── logos/
│       │   ├── reasonbridge-logo.svg           # Full logo (symbol + wordmark)
│       │   ├── reasonbridge-logo-1024.png      # PNG 1024×1024
│       │   ├── reasonbridge-logo-512.png       # PNG 512×512
│       │   ├── reasonbridge-logo-192.png       # PNG 192×192
│       │   ├── reasonbridge-icon.svg           # Icon only (overlapping circles)
│       │   ├── reasonbridge-icon-180.png       # Apple Touch Icon
│       │   ├── reasonbridge-icon-32.png        # Favicon 32×32
│       │   └── reasonbridge-icon-16.png        # Favicon 16×16
│       └── favicon.ico                         # ICO fallback (16×16, 32×32)
├── src/
│   └── assets/
│       ├── fonts/                              # Self-hosted fonts (if used)
│       │   ├── nunito-variable.woff2
│       │   ├── inter-variable.woff2
│       │   └── fira-code-regular.woff2
│       └── brand/
│           └── colors.ts                       # TypeScript color constants
└── tailwind.config.js                          # Brand color palette config
```

### Configuration Files

```
specs/003-rebrand-infrastructure/
└── contracts/
    ├── logo-spec.json                          # Logo usage guidelines
    ├── color-palette.json                      # Brand color definitions
    └── typography-spec.json                    # Font configuration
```

---

## TypeScript Type Definitions

```typescript
// frontend/src/types/brand.ts

export type AssetType = 'logo' | 'icon' | 'font' | 'color';
export type AssetFormat = 'svg' | 'png' | 'woff2' | 'ttf';
export type WCAGLevel = 'AA' | 'AAA';
export type TypographyUsage = 'heading' | 'body' | 'monospace';

export interface BrandAsset {
  type: AssetType;
  variant: string;
  format: AssetFormat;
  size?: number;
  path: string;
  usage: string;
  wcagCompliance?: boolean;
  fileSize?: number;
}

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface HSL {
  h: number; // 0-360
  s: string; // percentage (e.g., "58%")
  l: string; // percentage (e.g., "39%")
}

export interface WCAGContrast {
  onWhite?: number;
  onWarmWhite?: number;
  onCharcoal?: number;
  [background: string]: number | undefined;
}

export interface BrandColor {
  name: string;
  hex: string; // #RRGGBB
  rgb: RGB;
  hsl?: HSL;
  tailwindClass: string;
  usage: string[];
  wcagContrast?: WCAGContrast;
  complianceLevel?: WCAGLevel;
}

export interface Typography {
  family: string;
  weights: number[];
  fallback: string;
  usage: TypographyUsage;
  cdnUrl?: string;
  localPath?: string;
  variable: boolean;
  subset?: string;
}

export interface UIComponent {
  name: string;
  brandColors: string[];
  typography: string[];
  brandAssets?: string[];
  wcagCompliance: boolean;
}
```

---

## Data Integrity Constraints

### Cross-Entity Constraints

1. **Color-Asset Consistency**:
   - Logo assets MUST reference only defined BrandColor hex values
   - UI components MUST use only colors from BrandColor entity

2. **Typography-Asset Consistency**:
   - Font files (BrandAsset where type='font') MUST match Typography.family names
   - UI components MUST reference only Typography.family values defined in config

3. **WCAG Compliance Chain**:
   - If UIComponent.wcagCompliance === true, ALL BrandColor combinations used MUST have complianceLevel 'AA' or 'AAA'
   - If BrandColor.complianceLevel === 'AA', wcagContrast values MUST all be ≥ 4.5:1

4. **File Path Uniqueness**:
   - All BrandAsset.path values MUST be unique (no duplicate file paths)
   - All Typography.localPath values MUST be unique (if provided)

### Validation Examples

```typescript
// Example validation functions

function validateBrandColor(color: BrandColor): boolean {
  // Validate hex format
  if (!/^#[0-9A-F]{6}$/i.test(color.hex)) return false;

  // Validate RGB values
  if (color.rgb.r < 0 || color.rgb.r > 255) return false;
  if (color.rgb.g < 0 || color.rgb.g > 255) return false;
  if (color.rgb.b < 0 || color.rgb.b > 255) return false;

  // Validate WCAG compliance
  if (color.complianceLevel === 'AA') {
    const contrastValues = Object.values(color.wcagContrast || {});
    return contrastValues.every(ratio => ratio >= 4.5);
  }

  if (color.complianceLevel === 'AAA') {
    const contrastValues = Object.values(color.wcagContrast || {});
    return contrastValues.every(ratio => ratio >= 7.0);
  }

  return true;
}

function validateTypography(typo: Typography): boolean {
  // Must have either CDN or local path
  if (!typo.cdnUrl && !typo.localPath) return false;

  // Cannot have both
  if (typo.cdnUrl && typo.localPath) return false;

  // Variable fonts don't need explicit weights
  if (typo.variable && typo.weights.length > 0) {
    console.warn(`Variable font ${typo.family} should not specify explicit weights`);
  }

  // Validate weight values
  const validWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  return typo.weights.every(w => validWeights.includes(w));
}
```

---

## Migration Strategy

### From ReasonBridge to ReasonBridge

1. **Asset Replacement**: Replace all logo files in `public/assets/logos/` with ReasonBridge variants
2. **Color Updates**: Update `tailwind.config.js` color definitions
3. **Typography**: Add Nunito/Inter fonts via @fontsource packages
4. **Metadata**: Create brand asset JSON files in `specs/003-rebrand-infrastructure/contracts/`
5. **Validation**: Run WCAG contrast checks to verify all colors meet AA compliance

### Rollback Plan

- Keep old logo files in `public/assets/logos/archive/` for 90 days
- Git tags for pre-rebrand state: `git tag pre-rebrand-backup`
- Rollback command: `git checkout pre-rebrand-backup -- public/assets/`

---

**Status**: Data model defined, ready for contract generation (Phase 1)
