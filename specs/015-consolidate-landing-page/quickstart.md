# Quickstart: Consolidate Landing Page

**Branch**: `015-consolidate-landing-page` | **Date**: 2026-02-02

## Prerequisites

- Node.js 20 LTS
- pnpm 9.x
- Git

## Setup

```bash
# Clone and checkout branch
git checkout 015-consolidate-landing-page

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The frontend will be available at `http://localhost:5173`

## Testing the Feature

### Manual Testing Checklist

#### Unauthenticated User Flow
1. Open `http://localhost:5173/` (root URL)
2. Verify landing page displays with:
   - [ ] Hero section with headline and CTAs
   - [ ] Value proposition cards (3 features)
   - [ ] Interactive demo section
   - [ ] Social proof metrics
   - [ ] Footer with links

#### Authenticated User Flow
1. Log in with test credentials
2. Navigate to `http://localhost:5173/`
3. Verify redirect to `/topics?welcome=true`
4. Verify WelcomeBanner appears
5. Dismiss banner, verify it doesn't reappear on refresh

#### Brand Verification
1. Check hero gradient uses teal-to-blue (not indigo)
2. Check buttons are teal colored
3. Check font is Nunito (inspect in DevTools)
4. Check logo displays (overlapping circles)

### Automated Tests

```bash
# Run unit tests
pnpm test:unit

# Run E2E tests for landing page
pnpm exec playwright test frontend/e2e/landing-page.spec.ts

# Run all E2E tests
pnpm test:e2e
```

## Key Files

### New Files
| File | Purpose |
|------|---------|
| `src/components/layout/LandingLayout.tsx` | Landing page layout wrapper |
| `src/components/common/WelcomeBanner.tsx` | Dismissible welcome banner |
| `src/hooks/useAuthRedirect.ts` | Auth-based routing hook |
| `e2e/landing-page.spec.ts` | E2E tests |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/LandingPage.tsx` | Enhanced with brand colors, logo |
| `src/App.tsx` | Conditional layout wrapper |
| `src/routes/index.tsx` | Route configuration |
| `tailwind.config.js` | Brand color palette |
| `index.html` | Nunito font link |

### Deleted Files
| File | Reason |
|------|--------|
| `src/pages/HomePage.tsx` | Redundant placeholder |

## Troubleshooting

### Landing page shows wrong colors
- Verify `tailwind.config.js` has updated color palette
- Run `pnpm dev` to restart Vite (picks up config changes)
- Clear browser cache if needed

### Nunito font not loading
- Check `index.html` has Google Fonts link
- Check `tailwind.config.js` has Nunito in fontFamily
- Verify no network errors in DevTools → Network tab

### Auth redirect not working
- Verify AuthContext is properly providing user state
- Check `useAuthRedirect` hook is called in route component
- Check browser console for navigation errors

### Welcome banner keeps reappearing
- Check localStorage has `reasonbridge:welcome-banner-dismissed` key
- Verify localStorage isn't being cleared elsewhere
- Check WelcomeBanner component reads state correctly

## Development Tips

1. **Hot reload**: Vite provides fast HMR, no restart needed for component changes
2. **Color testing**: Use browser DevTools to temporarily change colors
3. **Responsive testing**: Use DevTools device toolbar (320px-2560px)
4. **Dark mode**: Toggle system dark mode to test theme support
