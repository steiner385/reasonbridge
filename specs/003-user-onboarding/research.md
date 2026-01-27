# Research: User Onboarding

**Date**: 2026-01-25
**Feature**: 003-user-onboarding
**Purpose**: Research best practices and technology decisions for implementing user onboarding flow

## Executive Summary

This research covers authentication strategies (AWS Cognito vs. custom), OAuth provider integration patterns, email verification best practices, demo content delivery, onboarding state management, and progressive web app patterns for the landing page.

---

## 1. Authentication Strategy: AWS Cognito

**Decision**: Use AWS Cognito User Pools for authentication

**Rationale**:
- Already integrated in the project (`@aws-sdk/client-cognito-identity-provider` dependency exists)
- Provides built-in support for:
  - Email/password authentication with password policies
  - OAuth 2.0/OIDC integration for social providers (Google, Apple)
  - Email verification workflows with customizable templates
  - JWT token generation and validation
  - MFA support (future requirement)
  - Rate limiting and brute force protection
- Reduces security burden (managed service handles common vulnerabilities)
- Scales automatically
- Compliance ready (SOC 2, HIPAA eligible)

**Alternatives Considered**:
- **Custom authentication with Passport.js**: Rejected because it requires manual implementation of email verification, password reset, OAuth flows, and security best practices. Increases maintenance burden and security risk.
- **Auth0/Okta**: Rejected due to cost at scale and vendor lock-in concerns. Cognito is part of existing AWS infrastructure.
- **NextAuth.js**: Rejected because backend uses NestJS/Fastify, not Next.js. Would require separate auth service.

**Implementation Pattern**:
```typescript
// Backend: Cognito service wrapper
class CognitoService {
  async signUp(email: string, password: string): Promise<{ userSub: string;
    codeDeliveryDetails }>;
  async confirmSignUp(email: string, code: string): Promise<void>;
  async initiateOAuth(provider: 'Google' | 'Apple'): Promise<{ authUrl: string }>;
  async handleOAuthCallback(code: string): Promise<{ tokens, user }>;
}

// Frontend: Auth context with Cognito
const useAuth = () => {
  const signUp = async (email, password) => {
    // Calls backend /auth/signup
  };
  const verifyEmail = async (code) => {
    // Calls backend /auth/verify
  };
};
```

**Security Considerations**:
- Store Cognito User Pool ID and Client ID in environment variables
- Use HTTPS for all auth endpoints
- Implement CSRF protection for OAuth callbacks
- Set secure, httpOnly cookies for refresh tokens
- Use short-lived access tokens (15 min)

---

## 2. OAuth Provider Integration

**Decision**: Implement OAuth 2.0 via Cognito Federated Identities with Google and Apple as identity providers

**Rationale**:
- Cognito natively supports Google and Apple as federated identity providers
- Reduces friction for users (no password to remember)
- Automatic email verification if OAuth provider confirms email
- Standard OAuth 2.0/OIDC flow handled by Cognito
- Matches spec requirement (FR-007, FR-011)

**Google OAuth Setup**:
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Configure authorized redirect URIs: `https://{domain}/auth/google/callback`
3. Add Google as identity provider in Cognito User Pool
4. Map Google attributes to Cognito user attributes (email, name)

**Apple Sign In Setup**:
1. Configure Sign in with Apple in Apple Developer Portal
2. Create service ID and private key
3. Add Apple as identity provider in Cognito User Pool
4. Handle Apple's unique email relay format (privaterelay.appleid.com)

**Implementation Flow**:
```
User clicks "Sign in with Google"
  → Frontend redirects to Cognito hosted UI
  → Cognito redirects to Google OAuth consent screen
  → User approves
  → Google redirects to Cognito with auth code
  → Cognito creates/links user and redirects to app with tokens
  → Frontend stores tokens and marks user as authenticated
```

**Edge Case Handling**:
- **Email mismatch**: If user signs up with email then later uses OAuth with different email → treat as separate accounts, allow linking in profile settings (FR-008 compliance)
- **OAuth provider downtime**: Show fallback message to use email/password, log incident
- **Partial OAuth data**: If provider doesn't return email → prompt user to add email manually

---

## 3. Email Verification Patterns

**Decision**: Use Cognito's built-in email verification with custom email templates

**Rationale**:
- Cognito automatically generates verification codes
- Handles token expiration (24 hours per FR-012)
- Provides resend functionality with built-in rate limiting
- SES integration for reliable delivery

**Verification Flow**:
1. User signs up with email/password
2. Cognito sends verification email with 6-digit code
3. User enters code in verification page
4. Backend calls `confirmSignUp` to verify
5. User account status changes from UNCONFIRMED to CONFIRMED

**Custom Email Template** (Cognito email template syntax):
```html
<h2>Verify your uniteDiscord account</h2>
<p>Welcome! Please verify your email address by entering this code:</p>
<p style="font-size: 24px; font-weight: bold;">{####}</p>
<p>This code expires in 24 hours.</p>
<p>Didn't sign up? Ignore this email.</p>
```

**Rate Limiting** (FR-013 compliance):
- Cognito enforces: 5 code resend requests per hour per user
- Additional application-level limit: 3 resends per hour per IP (anti-abuse)

**Unverified User Restrictions**:
- Allow: Browse discussions, view demo content (FR-015)
- Block: Post responses, create discussions, vote (FR-014)
- UI: Show persistent banner "Verify your email to participate" with resend option

---

## 4. Demo Content Strategy

**Decision**: Serve pre-selected real discussions with anonymized participants

**Rationale**:
- Authentic content demonstrates real platform value (FR-003)
- Anonymization protects user privacy
- Static selection ensures quality control
- Faster load times than dynamic queries

**Implementation Approach**:
```typescript
// Backend: Demo content service
class DemoService {
  async getDemoDiscussions(): Promise<Discussion[]> {
    // Return 3-5 curated discussions marked as "demo_featured"
    // Participants anonymized: "Participant A", "Participant B"
    // Common ground analysis pre-computed
  }
}
```

**Demo Discussion Selection Criteria**:
- High common ground score (70%+)
- Diverse perspectives visible
- 10-20 participants
- Clear proposition-based structure
- Appropriate content (no offensive language)

**Tracking for Personalization** (FR-005):
```typescript
// Store in visitor session (localStorage for unauthenticated)
interface VisitorSession {
  sessionId: string;
  viewedDemos: string[];  // Discussion IDs
  interactionTimestamps: Date[];
}

// Post-signup: merge visitor session with user account
// Use viewed topics to pre-populate topic interest suggestions
```

---

## 5. Topic Interest Selection

**Decision**: Present curated topic categories with activity indicators, require 2-3 selections

**Rationale**:
- Constrained choice (2-3) prevents analysis paralysis
- Activity indicators help users make informed selections (FR-021)
- Curated list ensures quality topics available
- Matches spec requirement (FR-018)

**Topic Categories** (initial seed):
- Politics & Governance
- Healthcare & Medicine
- Technology & AI
- Environment & Climate
- Economics & Finance
- Education & Learning
- Social Issues & Rights
- Science & Research
- Media & Information
- Culture & Society

**Activity Indicators**:
```typescript
interface TopicOption {
  id: string;
  name: string;
  description: string;
  activeDiscussions: number;     // Count of discussions in last 7 days
  participantCount: number;      // Unique participants in last 30 days
  activityLevel: 'high' | 'medium' | 'low';  // Based on thresholds
}
```

**UI Pattern**:
- Grid of topic cards
- Visual indicator (color-coded) for activity level
- Disable "Continue" button until 2-3 topics selected
- Show warning if all selected topics are low-activity (FR-022)

---

## 6. Onboarding Progress State Management

**Decision**: Database-backed onboarding progress with localStorage fallback

**Rationale**:
- Persistent across devices (desktop → mobile)
- Recoverable if user closes browser mid-flow (FR-032)
- Enables analytics on drop-off points
- Supports partial onboarding (FR-034)

**Progress Tracking Schema**:
```typescript
interface OnboardingProgress {
  userId: string;
  emailVerified: boolean;
  topicsSelected: boolean;
  orientationViewed: boolean;
  firstPostMade: boolean;
  currentStep: 'verification' | 'topics' | 'orientation' | 'complete';
  lastUpdated: Date;
}
```

**State Transitions**:
```
signup → verification → topics → orientation → complete
     ↓         ↓           ↓           ↓
   (can skip orientation, jump to feed with default topics)
```

**Recovery Flow**:
```typescript
// On app mount for authenticated user
const onboardingStatus = await getOnboardingProgress(userId);
if (!onboardingStatus.emailVerified) {
  redirect('/verify-email');
} else if (!onboardingStatus.topicsSelected) {
  showTopicSelectionPrompt();
} else if (!onboardingStatus.orientationViewed) {
  showOrientationOverlay();  // Can be dismissed
}
```

---

## 7. Landing Page Progressive Enhancement

**Decision**: Server-side rendered landing page with progressive enhancement for demo interactivity

**Rationale**:
- Core content (demo discussion text, metrics) visible without JS (NFR-012)
- Fast initial load (NFR-001: <1.5s)
- SEO friendly
- Accessible

**Implementation Pattern**:
```tsx
// Landing page hydration
const LandingPage = () => {
  // Server renders static HTML with demo content
  // Client hydrates interactive features:
  //   - Demo discussion expandable sections
  //   - Live metrics animations
  //   - Scroll-triggered animations

  return (
    <main>
      <Hero>
        {/* Static content: headline, social proof */}
      </Hero>
      <DemoSection>
        {/* Static: discussion text, participant count */}
        {/* Progressive: interactive exploration */}
      </DemoSection>
      <CTASection>
        <SignupButton />
      </CTASection>
    </main>
  );
};
```

**Performance Optimizations**:
- Critical CSS inlined
- Demo discussions lazy-loaded below fold
- Images optimized (WebP with fallbacks)
- Prefetch signup page on CTA hover

---

## 8. Orientation Design Pattern

**Decision**: Non-modal, skippable 3-step overlay with progress dots

**Rationale**:
- Non-blocking (FR-026): Users can dismiss or click outside
- Minimal (FR-023): Only 3 key concepts
- Progressive disclosure: More help available in persistent menu (FR-025)

**Orientation Steps**:
1. **Proposition-based discussions**: "Arguments are organized by distinct positions, not replies to people"
2. **AI feedback**: "Get gentle suggestions to improve clarity and reduce bias"
3. **Common ground**: "See where different perspectives actually agree"

**UI Implementation**:
```tsx
const OrientationOverlay = () => {
  const [step, setStep] = useState(1);
  const [dismissed, setDismissed] = useLocalStorage('orientation_dismissed', false);

  if (dismissed) return null;

  return (
    <Overlay>
      <Card>
        <StepContent step={step} />
        <ProgressDots current={step} total={3} />
        <Actions>
          <Button onClick={() => dismiss()}>Skip</Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button onClick={() => dismiss()}>Get Started</Button>
          )}
        </Actions>
      </Card>
    </Overlay>
  );
};
```

---

## 9. First Post Experience

**Decision**: Enhanced first-post flow with extra context for AI feedback

**Rationale**:
- Reduces confusion about AI suggestions (FR-029)
- Encourages engagement with feedback system
- Celebrates milestone (FR-030)

**First-Time AI Feedback Wrapper**:
```tsx
const AISuggestion = ({ suggestion, isFirstPost }) => {
  return (
    <FeedbackCard>
      {isFirstPost && (
        <FirstTimeContext>
          💡 This is a helpful feature, not criticism. Our AI notices patterns
          that might derail productive conversation and offers gentle suggestions.
        </FirstTimeContext>
      )}
      <SuggestionText>{suggestion.text}</SuggestionText>
      <Actions>
        <Button>Revise</Button>
        <Button variant="secondary">Post anyway</Button>
      </Actions>
    </FeedbackCard>
  );
};
```

**Post-Submission Celebration**:
```tsx
// After first post successfully published
showToast({
  title: "Welcome to the conversation!",
  message: "Your perspective has been added. Explore more discussions to keep engaging.",
  action: {
    label: "Browse discussions",
    onClick: () => navigate('/topics')
  }
});

// Update onboarding progress
await markOnboardingStep('firstPostMade', true);
```

---

## 10. Mobile Responsiveness

**Decision**: Mobile-first responsive design with touch-optimized interactions

**Rationale**:
- Matches NFR-011: No degradation on mobile
- Majority of users may access on mobile
- Single codebase serves all devices

**Key Mobile Patterns**:
- **Touch targets**: Minimum 44x44px for buttons
- **Forms**: Large input fields, show password toggle
- **Navigation**: Hamburger menu for topic selection
- **Orientation**: Bottom sheet instead of modal overlay
- **Demo**: Swipeable cards for demo discussions

**Viewport Breakpoints**:
```css
/* Mobile first */
.topic-grid {
  grid-template-columns: 1fr;  /* Single column */
}

@media (min-width: 640px) {
  .topic-grid {
    grid-template-columns: repeat(2, 1fr);  /* 2 columns on tablet */
  }
}

@media (min-width: 1024px) {
  .topic-grid {
    grid-template-columns: repeat(3, 1fr);  /* 3 columns on desktop */
  }
}
```

---

## Research Conclusions

All technical decisions have been made. No open questions remain. Ready to proceed to Phase 1 (Design & Contracts).

**Key Takeaways**:
1. AWS Cognito provides comprehensive auth solution (email/password + OAuth)
2. Email verification flow leverages Cognito's built-in capabilities
3. Demo content strategy uses curated real discussions with anonymization
4. Topic selection enforces 2-3 choices with activity indicators
5. Onboarding progress persisted in database with localStorage fallback
6. Landing page uses progressive enhancement for performance and accessibility
7. Orientation is non-modal, skippable, and minimal (3 steps)
8. First post experience includes enhanced AI feedback context
9. Mobile-first responsive design ensures cross-device consistency

**Dependencies**:
- AWS Cognito User Pool (already provisioned)
- Google OAuth credentials (needs setup in Google Cloud Console)
- Apple Sign In credentials (needs setup in Apple Developer Portal)
- SES for email delivery (Cognito integration)
- Demo discussion curation (manual one-time setup)

**Risks & Mitigations**:
- **Risk**: OAuth provider changes API → **Mitigation**: Use official SDKs, monitor provider changelogs
- **Risk**: Email delivery failures → **Mitigation**: Monitor SES bounce rates, provide alternative verification methods in future
- **Risk**: Users skip onboarding → **Mitigation**: Persistent prompts, graceful degradation with default topic selection
