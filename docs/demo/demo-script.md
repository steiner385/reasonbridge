# Demo Script Walkthrough

This guide provides a structured demo script for showcasing reasonBridge to prospects and stakeholders.

## Before You Begin

### Prerequisites

1. Demo environment is running (`pnpm demo:start`)
2. Demo data is seeded (`pnpm demo:seed`)
3. Access to demo credentials (see [demo-credentials.md](./demo-credentials.md))

### Verify Environment

```bash
# Check demo status
curl http://localhost:3001/demo/status

# Expected: isFullySeeded: true
```

## Demo Flow (15-20 minutes)

### Opening (2 minutes)

**Key Points:**

- reasonBridge helps find common ground in divisive discussions
- AI-powered analysis identifies agreement zones, misunderstandings, and genuine disagreements
- Platform builds trust through structured dialogue

### 1. Landing Page Demo (3 minutes)

**Show:**

1. Navigate to the landing page
2. Point out pre-populated discussion examples
3. Highlight common ground scores (60-80% range)
4. Note the views spectrum visualization

**Talking Points:**

- "These are real discussions from our community"
- "Notice how even on divisive topics, there's significant common ground"
- "The platform surfaces what people agree on, not just disagreements"

### 2. Topic Exploration as Guest (3 minutes)

**Show:**

1. Click into "Congestion Pricing in Major Cities" topic
2. Scroll through response threads
3. Show the common ground summary panel
4. Point out agreement zones and misunderstandings

**Talking Points:**

- "Users can explore discussions before signing up"
- "AI identifies where participants actually agree"
- "Misunderstandings highlight definition differences, not true disagreements"

### 3. User Experience - Alice Anderson (5 minutes)

**Login:** demo-alice@reasonbridge.demo / DemoAlice2026!

**Show:**

1. Dashboard with activity feed
2. Personal moral foundation profile
3. Create a new response to existing topic
4. Receive AI feedback on response clarity and tone
5. Vote on propositions

**Talking Points:**

- "Power users have rich engagement history"
- "AI helps users improve their argumentation"
- "Proposition voting captures nuanced positions"

### 4. Admin Features - Admin Adams (4 minutes)

**Login:** demo-admin@reasonbridge.demo / DemoAdmin2026!

**Show:**

1. Admin dashboard overview
2. User management panel
3. Moderation queue (if populated)
4. Analytics dashboard

**Talking Points:**

- "Admins have full visibility into platform health"
- "Moderation tools help maintain quality discussions"
- "Analytics track engagement and common ground trends"

### 5. AI Features Showcase (3 minutes)

**Show:**

1. Navigate to `/demo/ai/status` endpoint
2. Explain fallback system (live AI → cache → pre-computed)
3. Show AI feedback on a response
4. Display common ground analysis generation

**Talking Points:**

- "AI is powered by AWS Bedrock (Claude)"
- "Graceful fallbacks ensure features always work"
- "Analysis happens in real-time as discussions evolve"

### Closing (2 minutes)

**Key Points:**

- Demo environment can be reset for repeated demos
- Full environment setup takes under 5 minutes
- AI features work with graceful degradation

## Persona-Specific Demo Sections

### For Sales Teams (Enterprise Focus)

**Use Admin Adams to demonstrate:**

- Multi-tenant capabilities
- User management at scale
- Analytics and reporting
- Custom configuration options

**Talking Points:**

- "Enterprise admins can manage thousands of users"
- "Role-based access controls"
- "Audit logging for compliance"

### For Product Teams (Feature Focus)

**Use Alice Anderson to demonstrate:**

- Full user workflow
- AI feedback system
- Moral foundation profiles
- Engagement features

**Talking Points:**

- "AI provides actionable feedback"
- "Profiles help users understand their biases"
- "Gamification encourages quality participation"

### For Engineering Teams (Technical Focus)

**Use API endpoints to demonstrate:**

- `/demo/ai/status` - AI service health
- `/demo/status` - Environment health
- `/demo/credentials` - API structure

**Talking Points:**

- "Microservices architecture"
- "PostgreSQL + Redis + AWS Bedrock"
- "Prisma ORM for type-safe database access"

### For Investors (Vision Focus)

**Use multiple personas to demonstrate:**

- Range of user types
- Trust scoring system
- Common ground discovery
- Platform scalability

**Talking Points:**

- "Building trust infrastructure for online discourse"
- "AI that de-escalates rather than amplifies"
- "Network effects from common ground discovery"

## Troubleshooting

### Demo Data Not Showing

```bash
# Reset and re-seed demo environment
pnpm demo:reset

# Or force seed with truncation
pnpm prisma:seed --demo --force
```

### AI Features Unavailable

Check AI status:

```bash
curl http://localhost:3004/demo/ai/status
```

If Bedrock is unavailable:

- Fallback responses will be used automatically
- Demo still works with pre-computed AI feedback
- Note this in the demo: "AI operates in offline mode"

### Login Not Working

Verify demo mode is enabled:

```bash
echo $DEMO_MODE  # Should be "true"
```

Verify user exists:

```bash
curl http://localhost:3001/demo/personas
```

### Environment Reset Fails

Manual reset procedure:

1. Stop all services: `docker-compose down`
2. Clear database: `pnpm prisma:reset --force`
3. Restart: `docker-compose up -d`
4. Re-seed: `pnpm demo:seed`

## Demo Environment Reset

After each demo, reset the environment:

```bash
# Quick reset (API)
curl -X POST http://localhost:3001/demo/reset

# Full reset (CLI)
pnpm demo:reset
```

Reset takes approximately 2-3 minutes and:

- Removes any user-created content
- Re-seeds all demo data
- Clears caches
- Restores original state

## Tips for Effective Demos

1. **Start with the landing page** - Shows value before login
2. **Use multiple personas** - Demonstrates different perspectives
3. **Highlight AI feedback** - Key differentiator
4. **Show common ground** - Core value proposition
5. **End with admin view** - Enterprise readiness
6. **Reset after every demo** - Consistent experience
