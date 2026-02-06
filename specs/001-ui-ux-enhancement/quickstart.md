# Quickstart Guide: UI/UX Enhancement

**Feature**: 001-ui-ux-enhancement
**Branch**: `001-ui-ux-enhancement`
**Date**: 2026-02-04

## Prerequisites

Before starting implementation, ensure you have:

- [x] Node.js 20 LTS installed
- [x] pnpm 9.x installed (`npm install -g pnpm`)
- [x] Git repository cloned
- [x] Branch `001-ui-ux-enhancement` checked out
- [x] Development environment running (frontend + backend services)

## Quick Setup (5 minutes)

### 1. Install New Dependencies

```bash
cd /mnt/ssk-ssd/tony/GitHub/reasonbridge2/frontend

# Install form validation libraries
pnpm add react-hook-form@^7.71.1 zod@^4.3.5 @hookform/resolvers@^5.2.2

# Install onboarding tour library
pnpm add react-joyride@^2.9.0

# Verify installation
pnpm list react-hook-form zod react-joyride
```

**Expected bundle size increase**: ~50KB gzipped

### 2. Create Directory Structure

```bash
# Create new directories for schemas and enhanced components
mkdir -p src/schemas
mkdir -p src/components/layouts
mkdir -p src/components/onboarding
mkdir -p src/hooks
mkdir -p tests/unit/schemas
mkdir -p tests/integration/forms
```

### 3. Update Tailwind Configuration

Add shimmer animation keyframes to `tailwind.config.js`:

```javascript
// In theme.extend section
keyframes: {
  shimmer: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },
  shimmerFade: {
    '0%, 100%': { opacity: '0.6' },
    '50%': { opacity: '1' },
  },
},
animation: {
  shimmer: 'shimmer 2s infinite ease-in-out',
  'shimmer-fade': 'shimmerFade 2s ease-in-out infinite',
},
```

### 4. Add Shimmer Utility to CSS

Add to `src/index.css`:

```css
@layer utilities {
  .skeleton-shimmer {
    position: relative;
    overflow: hidden;
    @apply bg-gray-200 dark:bg-gray-800;
  }

  .skeleton-shimmer::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      theme('colors.white / 0.6') 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    @apply animate-shimmer;
  }

  .dark .skeleton-shimmer::before {
    background: linear-gradient(
      90deg,
      transparent 0%,
      theme('colors.white / 0.1') 50%,
      transparent 100%
    );
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer::before {
      animation: none;
      @apply animate-shimmer-fade;
    }
  }
}
```

### 5. Verify Setup

```bash
# Run frontend build to verify no errors
pnpm build

# Run TypeScript type checking
pnpm typecheck

# Start dev server
pnpm dev
```

**Expected output**: No errors, dev server starts on http://localhost:5173

---

## Implementation Workflow

### Phase 1: Form Validation (Priority P1) - ~2-3 hours

**Goal**: Migrate registration form to React Hook Form + Zod

**Steps**:

1. **Create common validation schemas** (`src/schemas/common.ts`):
   ```typescript
   import { z } from 'zod';

   export const emailSchema = z
     .string()
     .min(1, 'Email is required')
     .email('Invalid email address');

   export const passwordSchema = z
     .string()
     .min(12, 'Password must be at least 12 characters')
     .regex(/[a-z]/, 'Must contain lowercase letter')
     .regex(/[A-Z]/, 'Must contain uppercase letter')
     .regex(/[0-9]/, 'Must contain number')
     .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain special character');
   ```

2. **Create registration schema** (`src/schemas/auth.ts`):
   ```typescript
   import { z } from 'zod';
   import { emailSchema, passwordSchema } from './common';

   export const registrationSchema = z.object({
     email: emailSchema,
     displayName: z.string().min(3).max(50),
     password: passwordSchema,
     confirmPassword: z.string(),
   }).refine((data) => data.password === data.confirmPassword, {
     message: 'Passwords do not match',
     path: ['confirmPassword'],
   });

   export type RegistrationFormData = z.infer<typeof registrationSchema>;
   ```

3. **Update RegisterPage.tsx**:
   ```typescript
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';
   import { registrationSchema, type RegistrationFormData } from '@/schemas/auth';

   function RegisterPage() {
     const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegistrationFormData>({
       resolver: zodResolver(registrationSchema),
       mode: 'onBlur',
     });

     const onSubmit = async (data: RegistrationFormData) => {
       // Existing registration logic
     };

     return (
       <form onSubmit={handleSubmit(onSubmit)}>
         <Input
           {...register('email')}
           label="Email"
           error={errors.email?.message}
         />
         {/* ... other fields ... */}
       </form>
     );
   }
   ```

4. **Test the form**:
   ```bash
   # Start dev server if not running
   pnpm dev

   # Navigate to http://localhost:5173/register
   # Test validation by:
   # - Leaving email blank (should show "Email is required")
   # - Entering invalid email (should show "Invalid email address")
   # - Password not matching criteria (should show specific error)
   ```

**Success Criteria**:
- [x] Real-time validation on blur
- [x] Field-specific error messages
- [x] TypeScript type safety
- [x] Form submits only when valid

---

### Phase 2: Navigation (Priority P1) - ~3-4 hours

**Goal**: Implement hybrid header + sidebar + mobile drawer navigation

**Steps**:

1. **Create SidebarContext** (`src/contexts/SidebarContext.tsx`):
   ```typescript
   import { createContext, useContext, useState, useEffect } from 'react';

   interface SidebarContextType {
     isCollapsed: boolean;
     isMobileOpen: boolean;
     toggleCollapsed: () => void;
     toggleMobile: () => void;
     closeMobile: () => void;
   }

   const SidebarContext = createContext<SidebarContextType | null>(null);

   export function SidebarProvider({ children }: { children: React.ReactNode }) {
     const [isCollapsed, setIsCollapsed] = useState(() =>
       localStorage.getItem('sidebarCollapsed') === 'true'
     );
     const [isMobileOpen, setIsMobileOpen] = useState(false);

     useEffect(() => {
       localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
     }, [isCollapsed]);

     return (
       <SidebarContext.Provider value={{
         isCollapsed,
         isMobileOpen,
         toggleCollapsed: () => setIsCollapsed(prev => !prev),
         toggleMobile: () => setIsMobileOpen(prev => !prev),
         closeMobile: () => setIsMobileOpen(false),
       }}>
         {children}
       </SidebarContext.Provider>
     );
   }

   export const useSidebar = () => {
     const context = useContext(SidebarContext);
     if (!context) throw new Error('useSidebar must be used within SidebarProvider');
     return context;
   };
   ```

2. **Wrap app with SidebarProvider** (in `main.tsx`):
   ```typescript
   <SidebarProvider>
     <App />
   </SidebarProvider>
   ```

3. **Create MobileDrawer component** (`src/components/layouts/MobileDrawer.tsx`):
   ```typescript
   export function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
     // Prevent body scroll when drawer open
     useEffect(() => {
       document.body.style.overflow = isOpen ? 'hidden' : 'unset';
       return () => { document.body.style.overflow = 'unset'; };
     }, [isOpen]);

     // Close on Escape key
     useEffect(() => {
       const handleEscape = (e: KeyboardEvent) => {
         if (e.key === 'Escape') onClose();
       };
       if (isOpen) document.addEventListener('keydown', handleEscape);
       return () => document.removeEventListener('keydown', handleEscape);
     }, [isOpen, onClose]);

     return (
       <>
         {/* Backdrop */}
         <div
           className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity ${
             isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
           }`}
           onClick={onClose}
           aria-hidden="true"
         />

         {/* Drawer */}
         <div
           className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 md:hidden ${
             isOpen ? 'translate-x-0' : '-translate-x-full'
           }`}
           role="dialog"
           aria-modal="true"
           aria-label="Mobile navigation"
         >
           {children}
         </div>
       </>
     );
   }
   ```

4. **Update AppLayout** with hybrid navigation
5. **Test responsive behavior** at 320px, 768px, 1024px viewports

**Success Criteria**:
- [x] Desktop: Persistent sidebar + header
- [x] Mobile (<768px): Header + hamburger → drawer
- [x] Sidebar state persists across page reloads
- [x] Drawer closes on route change, backdrop click, Escape
- [x] Keyboard navigation works (TAB, Enter, Escape)

---

### Phase 3: Dark Mode (Priority P1) - ~2-3 hours

**Goal**: Complete dark mode implementation across all components

**Steps**:

1. **Add dark mode colors to Tailwind config** (if not already present)
2. **Update all components with dark: variants**:
   ```typescript
   // Example: Button.tsx
   className="bg-primary-500 dark:bg-primary-600
              text-white dark:text-gray-100
              hover:bg-primary-600 dark:hover:bg-primary-700"
   ```

3. **Create ThemeContext** for theme toggle
4. **Add theme toggle to Settings page**
5. **Persist theme preference in localStorage**
6. **Auto-detect system preference** on first visit

**Success Criteria**:
- [x] All components render correctly in both themes
- [x] Theme persists across page reloads
- [x] System preference detected on first visit
- [x] Smooth 200ms transition between themes
- [x] WCAG AA contrast ratios maintained

---

### Phase 4: Loading States (Priority P2) - ~1-2 hours

**Goal**: Implement shimmer skeleton screens across the app

**Steps**:

1. **Update Skeleton component** to use shimmer animation
2. **Replace all spinner loading states** with skeleton screens
3. **Add loading states to topic list, profile page**
4. **Test with network throttling** (Chrome DevTools → 3G)

**Success Criteria**:
- [x] Skeleton screens match final layout
- [x] Shimmer animation runs at 60fps
- [x] Respects prefers-reduced-motion
- [x] Appears only for loads >500ms

---

### Phase 5: Onboarding Tour (Priority P3) - ~2-3 hours

**Goal**: Add interactive tour for new users

**Steps**:

1. **Create OnboardingTourContext**
2. **Define tour steps** with data-testid targets
3. **Add data-testid attributes** to target elements
4. **Style tour with brand colors**
5. **Implement skip/restart functionality**
6. **Auto-start for new users**

**Success Criteria**:
- [x] Tour auto-starts for new users
- [x] All steps visible and accessible
- [x] Keyboard navigation works
- [x] Can be restarted from Settings
- [x] Progress persisted in localStorage

---

## Testing Checklist

### Unit Tests

```bash
# Run unit tests for schemas
pnpm test src/schemas

# Expected: All validation rules tested
# - Email validation (valid/invalid formats)
# - Password validation (all regex rules)
# - Cross-field validation (password confirmation)
```

### E2E Tests

```bash
# Run E2E tests for registration flow
E2E_DOCKER=true PLAYWRIGHT_BASE_URL=http://localhost:9080 \
  npx playwright test user-registration-login-flow.spec.ts

# Expected: 15 previously failing tests now pass
# - Full registration flow
# - Duplicate email handling
# - Invalid credentials error
```

### Accessibility Audit

```bash
# Run Lighthouse accessibility audit
npx lighthouse http://localhost:5173 --only-categories=accessibility

# Expected: Score ≥95
# - ARIA attributes present
# - Contrast ratios meet WCAG AA
# - Keyboard navigation functional
```

### Performance Audit

```bash
# Run Lighthouse performance audit
npx lighthouse http://localhost:5173 --only-categories=performance

# Expected: Score ≥90
# - FCP ≤1.5s
# - Bundle size ≤500KB gzipped
# - No layout shifts (CLS <0.1)
```

---

## Common Issues & Solutions

### Issue: React Hook Form not validating on blur

**Solution**: Ensure `mode: 'onBlur'` is set in useForm config

```typescript
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur', // ← Add this
});
```

### Issue: Shimmer animation not appearing

**Solution**: Verify Tailwind config includes keyframes and animation is built

```bash
# Rebuild Tailwind
pnpm dev
# Check browser DevTools → Elements → Computed styles
# Should see animation: shimmer 2s infinite ease-in-out
```

### Issue: Mobile drawer not closing on route change

**Solution**: Add useEffect to listen for route changes

```typescript
const location = useLocation();
const { isMobileOpen, closeMobile } = useSidebar();

useEffect(() => {
  if (isMobileOpen) closeMobile();
}, [location.pathname]);
```

### Issue: Dark mode flashing on page load

**Solution**: Add dark mode class to <html> before React hydrates

```typescript
// In index.html <head>
<script>
  const theme = localStorage.getItem('theme-preference');
  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
</script>
```

---

## Next Steps

After completing the quickstart:

1. Review [tasks.md](./tasks.md) for detailed task breakdown (created via `/speckit.tasks`)
2. Follow test-driven development: Write E2E test → Implement feature → Verify test passes
3. Commit frequently with descriptive messages following Conventional Commits format
4. Run linting and type checking before each commit (`pnpm lint && pnpm typecheck`)
5. Request code review when completing each phase

---

## Resources

- **Spec**: [spec.md](./spec.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Implementation Plan**: [plan.md](./plan.md)

- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **React Joyride**: https://docs.react-joyride.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
