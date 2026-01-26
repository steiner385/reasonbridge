# Orientation Component Tests

This directory would contain unit tests for the orientation components once a unit testing framework (e.g., Vitest + React Testing Library) is configured for the frontend.

## Test Coverage Requirements

### OrientationOverlay Component

#### State Management Tests
- **Initial state**: Should start at step 1 when opened
- **Step navigation**: Should correctly update currentStep state
- **Step boundaries**: Should not allow navigating before step 1 or after step 3
- **Progress calculation**: Should correctly calculate percentage (33%, 67%, 100%)

#### Navigation Tests
- **Next button**: Should increment step by 1
- **Previous button**: Should decrement step by 1
- **Step indicators**: Should jump to specific step when clicked
- **Complete action**: Should call onComplete when finishing step 3
- **Skip action**: Should call onSkip when clicking Skip to End
- **Dismiss action**: Should call onDismiss when clicking Dismiss or X button

#### Keyboard Navigation Tests
- **Arrow Right**: Should advance to next step
- **Arrow Left**: Should go to previous step (if not on step 1)
- **Escape key**: Should call onDismiss
- **Tab navigation**: Should focus next focusable element
- **Shift+Tab**: Should focus previous focusable element

#### Accessibility Tests
- **Dialog role**: Should have role="dialog"
- **aria-modal**: Should be set to true
- **aria-labelledby**: Should reference heading ID
- **Focus management**: Should focus first focusable element on open
- **Focus trap**: Should keep focus within overlay
- **Button labels**: All buttons should have aria-label or text
- **Progress bar**: Should have proper ARIA attributes

#### Rendering Tests
- **Conditional rendering**: Should only render when isOpen is true
- **Step content**: Should render correct step component based on currentStep
- **Button visibility**: Previous button should only show on steps 2-3
- **Button text**: Next button should say "Get Started" on step 3
- **Progress indicator**: Should show "Step X of 3" and progress percentage

### OrientationPage Component

#### API Integration Tests
- **Progress fetching**: Should call getOnboardingProgress on mount
- **Already viewed**: Should redirect if orientationViewed is true
- **Mark as viewed**: Should call markOrientationViewed with (true, false) on complete
- **Mark as skipped**: Should call markOrientationViewed with (false, true) on skip
- **Error handling**: Should display error message on API failure
- **Retry logic**: Should refetch progress when clicking Try Again

#### Loading States Tests
- **Initial loading**: Should show loading spinner while fetching
- **Error state**: Should show error UI with retry button
- **Success state**: Should show OrientationOverlay when loaded

#### Navigation Tests
- **Redirect on complete**: Should navigate to nextAction.url after complete
- **Redirect on skip**: Should navigate to nextAction.url after skip
- **Fallback navigation**: Should navigate to / if no nextAction provided

### HelpMenu Component

#### Dropdown Tests
- **Initial state**: Should be closed by default
- **Toggle open**: Should open dropdown when clicking button
- **Toggle close**: Should close dropdown when clicking button again
- **Click outside**: Should close dropdown when clicking outside
- **Escape key**: Should close dropdown when pressing Escape

#### Accessibility Tests
- **Button attributes**: Should have aria-label, aria-expanded, aria-haspopup
- **Focus management**: Should focus first menu item when opened
- **Keyboard navigation**: Should support arrow keys in menu
- **Screen reader**: Menu items should have proper labels

#### Callback Tests
- **Reopen orientation**: Should call onReopenOrientation when clicking menu item
- **Menu close**: Should close menu after selecting an item

### Step Content Components

#### Step1PropositionBased Tests
- **Rendering**: Should render heading and description
- **Example content**: Should show 3 example propositions
- **Visual indicators**: Should show agreement percentages
- **Call to action**: Should display "Your Turn" message

#### Step2AIFeedback Tests
- **Rendering**: Should render heading and description
- **Insight cards**: Should show 3 types of AI insights
- **Icons**: Should display appropriate icons for each insight type
- **Explanation**: Should include disclaimer about helpful suggestions

#### Step3CommonGround Tests
- **Rendering**: Should render heading and description
- **Agreement spectrum**: Should show visual spectrum
- **Results example**: Should display example voting results with percentages
- **Action items**: Should show bulleted list of what this means
- **Call to action**: Should encourage jumping into discussions

## Running Tests (Once Configured)

```bash
# Run all unit tests
pnpm test:unit

# Run tests in watch mode
pnpm test:unit:watch

# Run tests with coverage
pnpm test:unit:coverage

# Run specific test file
pnpm test:unit OrientationOverlay
```

## Test Setup Requirements

### Dependencies to Install
```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^25.0.0"
  }
}
```

### Vitest Configuration
Create `frontend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
});
```

### Test Setup File
Create `frontend/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

## Example Unit Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OrientationOverlay from '../OrientationOverlay';

describe('OrientationOverlay', () => {
  it('should render when isOpen is true', () => {
    const mockComplete = vi.fn();
    const mockSkip = vi.fn();
    const mockDismiss = vi.fn();

    render(
      <OrientationOverlay
        isOpen={true}
        onComplete={mockComplete}
        onSkip={mockSkip}
        onDismiss={mockDismiss}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Platform Orientation/i)).toBeInTheDocument();
  });

  it('should advance to next step when clicking Next', () => {
    const mockComplete = vi.fn();
    const mockSkip = vi.fn();
    const mockDismiss = vi.fn();

    render(
      <OrientationOverlay
        isOpen={true}
        onComplete={mockComplete}
        onSkip={mockSkip}
        onDismiss={mockDismiss}
      />
    );

    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
  });

  it('should call onSkip when clicking Skip to End', () => {
    const mockComplete = vi.fn();
    const mockSkip = vi.fn();
    const mockDismiss = vi.fn();

    render(
      <OrientationOverlay
        isOpen={true}
        onComplete={mockComplete}
        onSkip={mockSkip}
        onDismiss={mockDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /skip to end/i }));

    expect(mockSkip).toHaveBeenCalledTimes(1);
  });
});
```

## Notes

- E2E tests using Playwright are already comprehensive and cover the full user flow
- Unit tests would provide faster feedback for component logic
- Consider adding React Testing Library for component-level testing
- Mock API calls using vitest's `vi.fn()` and `vi.mock()`
- Test user interactions with `@testing-library/user-event`
