# ReasonBridge Brand Guidelines

**Version**: 1.0.0  
**Last Updated**: 2026-01-25

## Brand Identity

### Mission

Find common ground through rational discussion.

### Brand Personality

- **Warm**: Approachable and inviting, not cold or clinical
- **Trustworthy**: Professional and credible
- **Encouraging**: Supportive of thoughtful discourse
- **Clear**: Straightforward communication

## Logo Usage

### Logo Assets

Located in `frontend/public/assets/logos/`:

- **Full Logo**: `reasonbridge-logo.svg` (icon + wordmark)
- **Icon Only**: `reasonbridge-icon.svg` (overlapping circles)
- **PNG Variants**: Available in 6 sizes (16px - 1024px)

### Logo Concept

Two overlapping circles represent:

- Different perspectives meeting
- Finding common ground (overlap area)
- Bridging between viewpoints

### Clear Space

Maintain minimum padding around logo equal to the height of one circle.

### Minimum Size

- Full logo: 120px wide minimum
- Icon only: 32px minimum

## Color Palette

### Primary Colors

```
Teal (Primary)
#2A9D8F
rgb(42, 157, 143)
Use: Primary buttons, header backgrounds, primary CTAs
```

```
Soft Blue (Secondary)
#6B9AC4
rgb(107, 154, 196)
Use: Secondary buttons, links (hover state), secondary UI elements
```

```
Light Sky (Accent)
#A8DADC
rgb(168, 218, 220)
Use: Success states, hover effects (with opacity), subtle highlights
```

### Usage Guidelines

✅ **Do:**

- Use teal for primary actions and branding
- Use soft blue for secondary elements
- Use light sky for success states and gentle accents
- Pair with neutral grays for text and backgrounds

❌ **Don't:**

- Use light sky for text (insufficient contrast)
- Use brand colors for body text on white backgrounds
- Combine brand colors without sufficient contrast testing

### Background Colors

- **Warm White**: `#FAFBFC` - Primary page background
- **Pure White**: `#FFFFFF` - Card and modal backgrounds

## Typography

### Font Families

**Primary (Nunito)**

- Use for: Headings, body text, UI elements
- Weights: 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
- Self-hosted via @fontsource for performance and privacy

**Monospace (Fira Code)**

- Use for: Code snippets, technical content
- Weights: 400 (regular), 700 (bold)

### Type Scale

- **Headings**: Nunito Semi-Bold (600 weight)
- **Body**: Nunito Regular (400 weight), 1.6 line-height
- **Small text**: Minimum 14px for accessibility

## UI Components

### Buttons

- **Border Radius**: `rounded-lg` (0.5rem / 8px)
- **Primary**: Teal background, white text
- **Secondary**: Soft blue background, white text
- **Transitions**: `transition-colors` for smooth interactions

### Cards

- **Border Radius**: `rounded-xl` (0.75rem / 12px)
- **Shadow**: Soft shadows (`shadow-sm` for default, `shadow-md` for elevated)
- **Hover**: Lift effect with increased shadow

### Form Inputs

- **Border Radius**: `rounded-lg`
- **Focus State**: Teal border and ring
- **Error State**: Red border with warm tone

### Modals

- **Border Radius**: `rounded-lg`
- **Backdrop**: Semi-transparent dark overlay
- **Shadow**: `shadow-xl` for depth

## Interactive States

### Hover

- Add smooth transitions (`transition-colors`, `transition-all`)
- Darken colors slightly (10-15% darker)
- Subtle elevation for clickable cards

### Focus

- Ring color: Brand primary
- Ring offset: 2px
- Clear visual indicator for keyboard navigation

### Active/Pressed

- Slight scale reduction or darker shade

## Accessibility

### Contrast Requirements

Follow WCAG AA standards:

- **Normal text**: 4.5:1 minimum contrast ratio
- **Large text**: 3.0:1 minimum contrast ratio
- **UI components**: 3.0:1 minimum

### Usage Notes

- Body text uses gray-900 on warm white (21:1 ratio)
- Brand colors used for large elements (buttons, headers)
- Links underlined for non-color identification
- Focus states clearly visible

## Messaging & Voice

### Tone

- **Warm**: Use friendly, inviting language
- **Encouraging**: Frame errors as opportunities to improve
- **Clear**: Avoid jargon, explain technical concepts
- **Respectful**: Acknowledge different perspectives

### Examples

✅ Good:

- "Let's find common ground"
- "Help us understand your perspective"
- "This could be clearer - try rephrasing?"

❌ Avoid:

- "Invalid input"
- "Error: Failed to process"
- "You must complete this field"

## File Structure

```
frontend/public/assets/logos/
├── source/
│   ├── reasonbridge-logo-source.svg
│   └── reasonbridge-icon-source.svg
├── reasonbridge-logo.svg (optimized)
├── reasonbridge-icon.svg (optimized)
├── reasonbridge-logo-1024.png
├── reasonbridge-logo-512.png
├── reasonbridge-logo-192.png
├── reasonbridge-icon-180.png
├── reasonbridge-icon-32.png
└── reasonbridge-icon-16.png
```

## Build Process

Generate optimized assets:

```bash
cd frontend
pnpm run build:icons
```

This script:

1. Optimizes SVGs with SVGO (2 decimal precision)
2. Generates PNG variants with sharp
3. Outputs to `public/assets/logos/`

## Questions?

For brand usage questions or new asset requests, open an issue in the GitHub repository.
