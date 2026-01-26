# ReasonBridge Brand Assets

## Logo Files

| File                   | Size    | Usage                    |
| ---------------------- | ------- | ------------------------ |
| `logo-icon.svg`        | 512x512 | App icon, large displays |
| `logo-full.svg`        | 400x100 | Full logo with wordmark  |
| `favicon.svg`          | 32x32   | Browser favicon          |
| `apple-touch-icon.svg` | 180x180 | iOS home screen icon     |

## Colors

| Name                    | Hex       | Usage                      |
| ----------------------- | --------- | -------------------------- |
| Teal (Primary)          | `#2A9D8F` | Left circle, primary UI    |
| Soft Blue (Secondary)   | `#6B9AC4` | Right circle, secondary UI |
| Light Sky (Accent)      | `#A8DADC` | Overlap, highlights        |
| Warm White (Background) | `#FAFBFC` | Page backgrounds           |
| Charcoal (Text)         | `#2D3748` | Body text                  |

## Typography

- **Headings:** Nunito Bold (700)
- **Body:** Nunito Regular (400)
- **Fallback:** system-ui, sans-serif

## Logo Concept

Two overlapping circles representing different perspectives, with the highlighted intersection symbolizing "common ground" - the core mission of ReasonBridge.

## Generating PNG/ICO Files

To convert SVG to PNG or ICO formats:

```bash
# Using ImageMagick
convert logo-icon.svg -resize 192x192 logo-192.png
convert logo-icon.svg -resize 512x512 logo-512.png
convert favicon.svg -resize 32x32 favicon.png
convert favicon.svg -resize 16x16 -resize 32x32 -resize 48x48 favicon.ico
```

---

_Brand design documented in `/docs/plans/2026-01-25-reasonbridge-brand-design.md`_
