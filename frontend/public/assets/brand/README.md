# ReasonBridge Brand Assets

## Logo Concept

Two overlapping circles representing different perspectives, with the highlighted intersection symbolizing "common ground" - the core mission of ReasonBridge.

- **Left circle**: Soft Blue (#6B9AC4) or Teal (#2A9D8F) depending on variant
- **Right circle**: Teal (#2A9D8F) or Soft Blue (#6B9AC4)
- **Overlap**: Light Sky gradient (#A8DADC) with subtle glow

## Logo Variants

### Primary Logos (Light Background)

| File | Description | Use Case |
|------|-------------|----------|
| `../logos/logo-primary-clean.png` | Standard logo, light bg | Default logo |
| `../logos/logo-primary.png` | Standard variant | Alternative |
| `../logos/logo-primary-alt.png` | Alternate version | Alternative |

### Dark Background Variants

| File | Description | Use Case |
|------|-------------|----------|
| `../logos/logo-icon-dark-bg.png` | Full color on dark | Dark mode headers |
| `../logos/logo-icon-dark-bg-alt.png` | Alternate dark bg | Dark mode alt |

### Inverted Color Variants

| File | Description | Use Case |
|------|-------------|----------|
| `../logos/logo-icon-inverted.png` | Colors swapped, light bg | Special use |
| `../logos/logo-icon-inverted-dark-bg.png` | Colors swapped, dark bg | Special use |

### Outline Variants

| File | Description | Use Case |
|------|-------------|----------|
| `../logos/logo-outline-light-bg.png` | Dark outline on white | Monochrome print |
| `../logos/logo-outline-dark-bg.png` | White outline on dark | Dark backgrounds |

### Monochrome

| File | Description | Use Case |
|------|-------------|----------|
| `../logos/logo-icon-white.png` | All white | Over images/gradients |

## Optimized Sizes (Web)

| File | Size | Use Case |
|------|------|----------|
| `../logos/logo-512.png` | 512x512 | PWA icon, large displays |
| `../logos/logo-192.png` | 192x192 | PWA manifest icon |
| `../logos/logo-128.png` | 128x128 | App stores, medium |
| `../logos/logo-64.png` | 64x64 | Thumbnails |
| `../logos/logo-dark-512.png` | 512x512 | Dark mode PWA icon |
| `../logos/logo-dark-192.png` | 192x192 | Dark mode manifest |

## Favicon & App Icons

| File | Size | Usage |
|------|------|-------|
| `favicon.ico` | 16/32/48 | Browser favicon (multi-res) |
| `favicon-16.png` | 16x16 | Small favicon |
| `favicon-32.png` | 32x32 | Standard favicon |
| `apple-touch-icon.png` | 180x180 | iOS home screen |
| `favicon.svg` | Vector | Scalable favicon (legacy) |

## Brand Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Teal (Primary) | `#2A9D8F` | 42, 157, 143 | Primary UI, left circle |
| Soft Blue (Secondary) | `#6B9AC4` | 107, 154, 196 | Secondary UI, right circle |
| Light Sky (Accent) | `#A8DADC` | 168, 218, 220 | Overlap, highlights |
| Warm White | `#FAFBFC` | 250, 251, 252 | Page backgrounds |
| Surface | `#F1F5F9` | 241, 245, 249 | Cards, elevated surfaces |
| Charcoal (Text) | `#2D3748` | 45, 55, 72 | Headings, body text |
| Slate (Text Secondary) | `#64748B` | 100, 116, 139 | Captions, metadata |

## Typography

- **Primary Font**: Nunito
- **Weights**: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Fallback**: system-ui, -apple-system, BlinkMacSystemFont, sans-serif

## Source Files

High-resolution source PNGs are stored in `../logos/` with `-large` and `-light-bg` suffixes for archival purposes.

## Generating Additional Sizes

```bash
# Using ImageMagick
convert logo-primary-clean.png -resize 256x256 -gravity center -extent 256x256 logo-256.png

# Generate ICO with multiple sizes
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico
```

---

_Brand design documented in `/docs/plans/2026-01-25-reasonbridge-brand-design.md`_
_Logo assets updated: February 2, 2026_
