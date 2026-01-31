# Demo Credentials

This document provides login credentials for the reasonBridge demo environment.

## Quick Reference

| Persona        | Email                        | Password       |
| -------------- | ---------------------------- | -------------- |
| Admin Adams    | demo-admin@reasonbridge.demo | DemoAdmin2026! |
| Mod Martinez   | demo-mod@reasonbridge.demo   | DemoMod2026!   |
| Alice Anderson | demo-alice@reasonbridge.demo | DemoAlice2026! |
| Bob Builder    | demo-bob@reasonbridge.demo   | DemoBob2026!   |
| New User       | demo-new@reasonbridge.demo   | DemoNew2026!   |

## Password Pattern

All demo passwords follow the pattern: `Demo{Role}2026!`

- Replace `{Role}` with the persona's role name
- Example: Admin Adams → DemoAdmin2026!

## Persona Details

### Admin Adams (Administrator)

**Email:** demo-admin@reasonbridge.demo
**Purpose:** Showcase administrative features

**Capabilities:**

- User management
- Moderation queue access
- System settings
- Analytics dashboard
- Content removal

**Use When Demonstrating:**

- Admin dashboard
- User management workflows
- System configuration
- Platform analytics

### Mod Martinez (Moderator)

**Email:** demo-mod@reasonbridge.demo
**Purpose:** Demonstrate moderation workflows

**Capabilities:**

- Content moderation
- Appeals review
- User warnings
- Report handling

**Use When Demonstrating:**

- Content moderation queue
- Appeal handling process
- User warning system
- Report management

### Alice Anderson (Power User)

**Email:** demo-alice@reasonbridge.demo
**Purpose:** High engagement user experience

**Capabilities:**

- Create topics
- Full response capabilities
- Proposition voting
- Profile customization

**Characteristics:**

- Very high activity level
- Progressive viewpoints
- High trust score (0.85)
- ENHANCED verification level

**Use When Demonstrating:**

- Active user experience
- Topic creation flow
- Response threading
- Moral foundation profiles

### Bob Builder (Regular User)

**Email:** demo-bob@reasonbridge.demo
**Purpose:** Typical user experience

**Capabilities:**

- Create topics
- Basic responses
- Proposition voting

**Characteristics:**

- Medium activity level
- Balanced viewpoints
- Standard trust score (0.70)
- BASIC verification level

**Use When Demonstrating:**

- Normal user workflow
- Standard permissions
- Topic participation

### New User (Fresh Account)

**Email:** demo-new@reasonbridge.demo
**Purpose:** Onboarding experience

**Capabilities:**

- Limited responses
- Basic voting
- Profile setup

**Characteristics:**

- Low activity level
- Neutral viewpoints
- Entry-level trust score (0.50)
- BASIC verification level

**Use When Demonstrating:**

- New user onboarding
- First-time experience
- Progressive feature unlock

## Security Notes

- Demo credentials are **blocked in production environments**
- These credentials are for demonstration purposes only
- Never use demo credentials for real user data
- The `@reasonbridge.demo` domain identifies demo accounts

## Credential Helper Page

Access `/demo/credentials` in the application for an interactive credential reference with copy-to-clipboard functionality.

## API Access

Credential information is also available via API:

```bash
# Get credential hints
curl http://localhost:3001/demo/credentials

# Get full persona details
curl http://localhost:3001/demo/personas
```
