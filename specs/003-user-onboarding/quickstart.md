# Developer Quickstart: User Onboarding

**Feature**: 003-user-onboarding
**Last Updated**: 2026-01-25

This guide helps developers set up and test the user onboarding feature locally, including authentication flows, email verification, OAuth integration, and onboarding progression.

---

## Prerequisites

Before starting, ensure you have the following installed and configured:

### Required Tools

- **Node.js**: v20.x LTS ([download](https://nodejs.org/))
- **pnpm**: v9.x or later (install: `npm install -g pnpm`)
- **PostgreSQL**: v15.x or later ([download](https://www.postgresql.org/download/))
- **Docker & Docker Compose**: For running local services ([download](https://docs.docker.com/get-docker/))
- **Git**: For version control

### Required Accounts & Services

- **AWS Account**: For Cognito User Pools (authentication backend)
  - Free tier sufficient for development
  - Create account at [aws.amazon.com](https://aws.amazon.com/)
- **Google Cloud Console**: For Google OAuth (optional but recommended)
  - Create project at [console.cloud.google.com](https://console.cloud.google.com/)
- **Apple Developer Account**: For Apple Sign-In (optional, can skip for initial development)
  - Requires paid developer program membership ($99/year)

### Development Environment

- **IDE**: VS Code recommended with extensions:
  - Prisma
  - ESLint
  - TypeScript and JavaScript Language Features
  - REST Client (for API testing)
- **Terminal**: Bash or Zsh for running scripts
- **API Testing Tool**: Postman, Insomnia, or VS Code REST Client extension

---

## Quick Start (5 Minutes)

If you just want to get the system running quickly without OAuth integration:

```bash
# 1. Clone repository (if not already done)
git clone https://github.com/unitediscord/unitediscord.git
cd unitediscord

# 2. Checkout feature branch
git checkout 003-user-onboarding

# 3. Install dependencies
pnpm install

# 4. Start PostgreSQL via Docker
docker compose up -d postgres

# 5. Set up minimal environment variables
cp .env.example .env
# Edit .env and set:
#   DATABASE_URL=postgresql://postgres:password@localhost:5432/unitediscord_dev
#   JWT_SECRET=your-super-secret-jwt-key-change-this
#   AWS_COGNITO_USER_POOL_ID=your-cognito-pool-id
#   AWS_COGNITO_CLIENT_ID=your-cognito-client-id
#   AWS_REGION=us-east-1

# 6. Run database migrations
pnpm --filter db-models db:migrate:dev

# 7. Seed demo data
pnpm --filter db-models db:seed

# 8. Start backend service
pnpm --filter user-service dev

# 9. In another terminal, start frontend
pnpm --filter frontend dev
```

Now visit `http://localhost:5173` to see the landing page.

---

## Detailed Setup Guide

### 1. AWS Cognito Setup

AWS Cognito handles authentication, password hashing, email verification codes, and OAuth federation.

#### Create Cognito User Pool

1. **Log in to AWS Console** → Navigate to **Amazon Cognito**

2. **Create User Pool**:
   - Click "Create user pool"
   - **Provider types**: Select "Email" (Cognito User Pool)
   - **Sign-in options**: Check "Email"
   - Click "Next"

3. **Password Policy**:
   - **Password policy mode**: "Cognito defaults" or custom
   - **MFA**: "No MFA" (for development; enable in production)
   - **User account recovery**: Check "Enable self-service account recovery"
   - **Delivery method**: "Email only"
   - Click "Next"

4. **Sign-up Experience**:
   - **Self-service sign-up**: Enable
   - **Attribute verification**: Check "Email"
   - **Required attributes**: Add "email"
   - **Custom attributes**: None needed for MVP
   - Click "Next"

5. **Message Delivery**:
   - **Email provider**: "Send email with Cognito" (for development)
     - Production: Use Amazon SES for better deliverability
   - **FROM email address**: Use default or verified SES email
   - Click "Next"

6. **App Integration**:
   - **User pool name**: `unitediscord-dev`
   - **App client name**: `unitediscord-web`
   - **Client secret**: "Don't generate a client secret" (public client)
   - **Authentication flows**: Check:
     - `ALLOW_USER_PASSWORD_AUTH`
     - `ALLOW_REFRESH_TOKEN_AUTH`
     - `ALLOW_USER_SRP_AUTH`
   - Click "Next"

7. **Review and Create**:
   - Review settings
   - Click "Create user pool"

8. **Note Important Values**:
   ```
   User Pool ID: us-east-1_abcd1234
   App Client ID: 1a2b3c4d5e6f7g8h9i0j
   AWS Region: us-east-1
   ```

#### Configure OAuth Providers (Optional)

**For Google OAuth**:

1. In Cognito User Pool → **Sign-in experience** → **Federated identity providers**
2. Click "Add identity provider" → Select "Google"
3. Enter:
   - **Google app ID**: From Google Cloud Console (see step 2)
   - **Google app secret**: From Google Cloud Console
   - **Authorized scopes**: `profile email openid`
4. Save

**For Apple Sign-In**:

1. In Cognito User Pool → **Sign-in experience** → **Federated identity providers**
2. Click "Add identity provider" → Select "Apple"
3. Enter:
   - **Services ID**: From Apple Developer Console
   - **Team ID**: From Apple Developer Console
   - **Key ID**: From Apple Developer Console
   - **Private key**: Upload .p8 file from Apple
4. Save

---

### 2. Google OAuth Setup (Optional)

Required only if you want to test Google Sign-In.

#### Create Google OAuth Client

1. **Go to Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com/)

2. **Create or Select Project**:
   - Click project dropdown → "New Project"
   - Name: `uniteDiscord-dev`
   - Click "Create"

3. **Enable Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click "Enable"

4. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services** → **OAuth consent screen**
   - User type: "External" (for development)
   - App name: `uniteDiscord (Dev)`
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `email`, `profile`, `openid`
   - Test users: Add your email
   - Click "Save and Continue"

5. **Create OAuth Client ID**:
   - Go to **APIs & Services** → **Credentials**
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: `uniteDiscord Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     http://localhost:3000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:5173/auth/callback
     https://<your-cognito-domain>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
     ```
   - Click "Create"

6. **Note Important Values**:
   ```
   Client ID: 123456789-abc123.apps.googleusercontent.com
   Client Secret: GOCSPX-abc123def456
   ```

---

### 3. Apple Sign-In Setup (Optional)

Required only if you want to test Apple Sign-In. Requires paid Apple Developer Program membership.

#### Configure Apple Sign-In

1. **Go to Apple Developer Portal**: [developer.apple.com](https://developer.apple.com/)

2. **Create App ID**:
   - Go to **Certificates, Identifiers & Profiles**
   - Click "Identifiers" → "+" → "App IDs"
   - Select "App"
   - Description: `uniteDiscord Web`
   - Bundle ID: `org.unitediscord.web`
   - Capabilities: Check "Sign In with Apple"
   - Click "Continue" → "Register"

3. **Create Services ID**:
   - Click "Identifiers" → "+" → "Services IDs"
   - Description: `uniteDiscord Web Service`
   - Identifier: `org.unitediscord.web.service`
   - Check "Sign In with Apple"
   - Click "Configure"
   - Primary App ID: Select `org.unitediscord.web`
   - Web domain: `unitediscord.org` (or localhost for dev)
   - Return URLs:
     ```
     https://<your-cognito-domain>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
     ```
   - Click "Save" → "Continue" → "Register"

4. **Create Key for Apple Sign-In**:
   - Click "Keys" → "+" → Name: `uniteDiscord Sign-In Key`
   - Check "Sign In with Apple"
   - Click "Configure" → Select primary App ID
   - Click "Save" → "Continue" → "Register"
   - **Download the .p8 key file** (only shown once!)

5. **Note Important Values**:
   ```
   Services ID: org.unitediscord.web.service
   Team ID: ABC123DEF4
   Key ID: XYZ987WVU6
   Private Key: (contents of .p8 file)
   ```

---

### 4. Local Environment Setup

#### Clone Repository & Install Dependencies

```bash
# Clone repository
git clone https://github.com/unitediscord/unitediscord.git
cd unitediscord

# Checkout feature branch
git checkout 003-user-onboarding

# Install all dependencies
pnpm install
```

#### Configure Environment Variables

Create `.env` file in repository root:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/unitediscord_dev

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=3600

# AWS Cognito
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_abcd1234
AWS_COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
AWS_COGNITO_DOMAIN=unitediscord-dev

# OAuth (optional - only if configured)
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
APPLE_SERVICES_ID=org.unitediscord.web.service
APPLE_TEAM_ID=ABC123DEF4
APPLE_KEY_ID=XYZ987WVU6
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XYZ987WVU6.p8

# Email (for demo purposes, Cognito handles actual sending)
EMAIL_FROM=noreply@unitediscord.org

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:5173

# Backend URL
BACKEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000/v1

# Node Environment
NODE_ENV=development

# Logging
LOG_LEVEL=debug
```

**Important**: Never commit `.env` file to version control. Use `.env.example` as template.

#### Start PostgreSQL Database

```bash
# Using Docker Compose (recommended)
docker compose up -d postgres

# OR using local PostgreSQL installation
# Ensure PostgreSQL is running and create database:
createdb unitediscord_dev
```

#### Run Database Migrations

```bash
# Generate Prisma client
pnpm --filter db-models db:generate

# Run migrations
pnpm --filter db-models db:migrate:dev

# Verify migration succeeded
pnpm --filter db-models db:studio
# This opens Prisma Studio at http://localhost:5555
```

#### Seed Demo Data

```bash
# Seed database with demo discussions, topics, and test users
pnpm --filter db-models db:seed

# This creates:
# - 18 topic categories (Climate, Economics, Tech, etc.)
# - 10 demo discussions with common ground examples
# - Test users (optional): test@unitediscord.org / password123
```

---

### 5. Running the Services

#### Start Backend Service

```bash
# In one terminal window
cd services/user-service
pnpm dev

# OR from repository root
pnpm --filter user-service dev
```

Backend will start on `http://localhost:3000`

**Verify backend is running**:
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"2026-01-25T12:00:00.000Z"}
```

#### Start Frontend Application

```bash
# In another terminal window
cd frontend
pnpm dev

# OR from repository root
pnpm --filter frontend dev
```

Frontend will start on `http://localhost:5173`

**Verify frontend is running**:
- Open browser to `http://localhost:5173`
- Should see landing page with demo discussions

---

## Testing the Onboarding Flow

### End-to-End User Journey

#### 1. Landing Page Demo (No Auth Required)

```bash
# Visit landing page
open http://localhost:5173

# Test API endpoint for demo discussions
curl http://localhost:3000/v1/demo/discussions?limit=5
```

**What to test**:
- [ ] Landing page loads within 1.5 seconds
- [ ] Demo discussions are visible with metrics (common ground scores)
- [ ] Can click into sample discussion
- [ ] "Join uniteDiscord" button is prominent
- [ ] No authentication required to browse

#### 2. Email/Password Signup

**Via Frontend**:
1. Click "Join uniteDiscord" button
2. Select "Sign up with email"
3. Enter email: `test-user@example.com`
4. Enter password: `SecureP@ssw0rd`
5. Click "Create Account"

**Expected behavior**:
- Account created
- Verification email sent (check Cognito console for code if SES not configured)
- Redirected to email verification page
- JWT token stored in localStorage

**Via API (cURL)**:
```bash
curl -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-user@example.com",
    "password": "SecureP@ssw0rd"
  }'

# Expected response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 3600,
  "user": {
    "id": "550e8400-...",
    "email": "test-user@example.com",
    "emailVerified": false,
    "authMethod": "EMAIL_PASSWORD"
  },
  "onboardingProgress": {
    "currentStep": "VERIFICATION",
    "emailVerified": false,
    "topicsSelected": false,
    "orientationViewed": false,
    "firstPostMade": false
  }
}
```

#### 3. Email Verification

**Get verification code from Cognito**:
- Go to AWS Console → Cognito → User Pool → Users
- Find user by email
- Verification code is sent via email (check email or use AWS Console in dev)

**Via Frontend**:
1. Enter 6-digit code from email
2. Click "Verify Email"

**Via API**:
```bash
curl -X POST http://localhost:3000/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-user@example.com",
    "verificationCode": "123456"
  }'

# Expected response:
{
  "success": true,
  "message": "Email verified successfully",
  "nextStep": "TOPICS",
  "user": {
    "id": "550e8400-...",
    "email": "test-user@example.com",
    "emailVerified": true
  }
}
```

#### 4. Topic Interest Selection

**Via Frontend**:
1. Browse topic cards (Climate, Economics, Tech, etc.)
2. Select 2-3 topics
3. Click "Continue"

**Via API**:
```bash
# First, get available topics
curl -X GET http://localhost:3000/v1/topics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Then select topics (use actual topic IDs from response)
curl -X POST http://localhost:3000/v1/onboarding/select-topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "topicIds": [
      "550e8400-e29b-41d4-a716-446655440000",
      "650e8400-e29b-41d4-a716-446655440001"
    ]
  }'

# Expected response:
{
  "success": true,
  "message": "Topic interests saved",
  "selectedTopics": [
    {
      "topicId": "550e8400-...",
      "name": "Climate & Environment",
      "priority": 1
    },
    {
      "topicId": "650e8400-...",
      "name": "Economics & Policy",
      "priority": 2
    }
  ],
  "onboardingProgress": {
    "currentStep": "ORIENTATION",
    "topicsSelected": true
  }
}
```

#### 5. Orientation Overlay

**Via Frontend**:
1. View 3-step orientation (or skip)
2. Learn about: Proposition-based discussions, AI feedback, Common ground

**Via API**:
```bash
curl -X PUT http://localhost:3000/v1/onboarding/mark-orientation-viewed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "viewed": true,
    "skipped": false
  }'
```

#### 6. First Discussion Participation

**Via Frontend**:
1. Browse personalized feed (topics you selected)
2. Click into a discussion
3. Click "Add Your Perspective"
4. Type first response
5. Submit

**Via API** (simulated - actual posting would use discussion service):
```bash
curl -X PUT http://localhost:3000/v1/onboarding/mark-first-post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "discussionId": "550e8400-e29b-41d4-a716-446655440000",
    "postId": "650e8400-e29b-41d4-a716-446655440001"
  }'

# Expected response:
{
  "success": true,
  "message": "Congratulations on your first post!",
  "onboardingProgress": {
    "currentStep": "COMPLETE",
    "firstPostMade": true,
    "completedAt": "2026-01-25T15:45:00Z"
  },
  "encouragement": "Great start! Your perspective adds value..."
}
```

#### 7. Check Onboarding Progress

```bash
curl -X GET http://localhost:3000/v1/onboarding/progress \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response shows current step and completion percentage
{
  "userId": "550e8400-...",
  "currentStep": "COMPLETE",
  "progress": {
    "emailVerified": true,
    "topicsSelected": true,
    "orientationViewed": true,
    "firstPostMade": true
  },
  "percentComplete": 100,
  "completedAt": "2026-01-25T15:45:00Z"
}
```

---

### OAuth Flow Testing

#### Google OAuth

**Manual Test**:
1. Click "Sign in with Google" on signup page
2. Should redirect to Google consent screen
3. Grant permissions
4. Redirected back to app with account created

**API Test**:
```bash
# 1. Initiate OAuth flow
curl -X POST http://localhost:3000/v1/auth/oauth/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "GOOGLE",
    "redirectUri": "http://localhost:5173/auth/callback"
  }'

# Response contains authorizationUrl
# 2. Open URL in browser, complete OAuth flow
# 3. Check callback handling

# Callback URL will look like:
# http://localhost:5173/auth/callback?code=4/0AY0e-g7X...&state=random-csrf-token
```

#### Apple OAuth

Similar to Google OAuth but with Apple Sign-In interface.

---

## Testing Utilities

### Postman Collection

Import the provided Postman collection for easy API testing:

**File**: `/specs/003-user-onboarding/contracts/postman-collection.json` (create this from OpenAPI spec)

**Import to Postman**:
1. Open Postman
2. Click "Import"
3. Select OpenAPI spec: `/specs/003-user-onboarding/contracts/openapi.yaml`
4. Postman will auto-generate collection

**Usage**:
1. Set environment variables:
   - `BASE_URL`: `http://localhost:3000/v1`
   - `ACCESS_TOKEN`: (obtained from signup/login response)
2. Run requests in order: Signup → Verify → Select Topics → etc.

### VS Code REST Client

Create `.http` files for quick API testing:

**File**: `test-onboarding.http`
```http
### Variables
@baseUrl = http://localhost:3000/v1
@email = test-user@example.com
@password = SecureP@ssw0rd

### 1. Signup
POST {{baseUrl}}/auth/signup
Content-Type: application/json

{
  "email": "{{email}}",
  "password": "{{password}}"
}

### 2. Verify Email
POST {{baseUrl}}/auth/verify-email
Content-Type: application/json

{
  "email": "{{email}}",
  "verificationCode": "123456"
}

### 3. Get Topics
GET {{baseUrl}}/topics
Authorization: Bearer {{accessToken}}

### 4. Select Topics
POST {{baseUrl}}/onboarding/select-topics
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{
  "topicIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "650e8400-e29b-41d4-a716-446655440001"
  ]
}
```

### Automated Testing

Run automated tests:

```bash
# Unit tests
pnpm --filter user-service test:unit

# Integration tests (requires running database)
pnpm --filter user-service test:integration

# E2E tests (requires running backend and frontend)
pnpm --filter frontend test:e2e

# Contract tests (validates API against OpenAPI spec)
pnpm --filter user-service test:contract
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Fails

**Error**: `ECONNREFUSED` or `Can't reach database server`

**Solutions**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check DATABASE_URL in .env
echo $DATABASE_URL

# Restart PostgreSQL
docker compose restart postgres

# Check logs
docker logs unitediscord-postgres
```

#### 2. Verification Emails Not Received

**Error**: Email verification code not received

**Solutions**:
- **Development**: Check AWS Cognito console → Users → Find user → See verification code
- **Production**: Configure Amazon SES for reliable email delivery
- **Alternative**: Use manual verification via API for testing:
  ```bash
  # Admin endpoint to mark email as verified (dev only)
  curl -X POST http://localhost:3000/v1/admin/verify-user \
    -H "Content-Type: application/json" \
    -d '{"userId": "550e8400-..."}'
  ```

#### 3. OAuth Redirect Issues

**Error**: OAuth callback fails or redirects to wrong URL

**Solutions**:
- Verify `redirectUri` in initiate request matches configured callback URL
- Check Google/Apple console for authorized redirect URIs
- Ensure Cognito domain is configured correctly
- Check CORS settings in backend (`FRONTEND_URL` in `.env`)

#### 4. JWT Token Expired

**Error**: `401 Unauthorized` after some time

**Solution**:
```bash
# Use refresh token to get new access token
curl -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### 5. Prisma Client Out of Sync

**Error**: `Prisma schema doesn't match database`

**Solution**:
```bash
# Regenerate Prisma client
pnpm --filter db-models db:generate

# Reset database (WARNING: deletes all data)
pnpm --filter db-models db:reset

# Re-run migrations
pnpm --filter db-models db:migrate:dev
```

#### 6. Port Already in Use

**Error**: `EADDRINUSE` - port 3000 or 5173 already in use

**Solution**:
```bash
# Find process using port
lsof -i :3000
lsof -i :5173

# Kill process
kill -9 <PID>

# OR change port in .env:
# BACKEND_PORT=3001
# FRONTEND_PORT=5174
```

#### 7. CORS Errors in Browser

**Error**: `Access-Control-Allow-Origin` blocked

**Solution**:
- Ensure `FRONTEND_URL=http://localhost:5173` in backend `.env`
- Check backend CORS configuration in `main.ts`:
  ```typescript
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  ```

#### 8. Cognito User Pool Not Found

**Error**: `UserPoolNotFoundException` or invalid credentials

**Solution**:
- Verify `AWS_COGNITO_USER_POOL_ID` and `AWS_COGNITO_CLIENT_ID` in `.env`
- Check AWS region matches (`AWS_REGION=us-east-1`)
- Ensure AWS credentials are configured (if using local credentials):
  ```bash
  aws configure list
  ```

---

## Development Tips

### Hot Reload

Both backend and frontend support hot reload:

- **Backend**: NestJS watches for file changes, auto-restarts
- **Frontend**: Vite HMR updates browser instantly

### Debugging

**Backend (VS Code)**:

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "user-service", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Frontend (Browser DevTools)**:
- Use React DevTools extension
- Check Network tab for API calls
- Use Console for errors

### Database Inspection

**Prisma Studio** (GUI):
```bash
pnpm --filter db-models db:studio
# Opens at http://localhost:5555
```

**psql CLI**:
```bash
# Connect to database
docker exec -it unitediscord-postgres psql -U postgres -d unitediscord_dev

# View tables
\dt

# View users
SELECT id, email, email_verified, auth_method, created_at FROM "User";

# View onboarding progress
SELECT * FROM "OnboardingProgress";
```

### Resetting Data

**Reset specific user's onboarding**:
```sql
UPDATE "OnboardingProgress"
SET current_step = 'VERIFICATION',
    email_verified = false,
    topics_selected = false,
    orientation_viewed = false,
    first_post_made = false
WHERE user_id = 'your-user-id';
```

**Delete test users**:
```sql
DELETE FROM "User" WHERE email LIKE 'test-%@example.com';
```

### Testing Email Templates

Preview email templates without sending:

```bash
# Start email preview server (if configured)
pnpm --filter user-service email:preview

# Opens at http://localhost:3001/email-preview
```

---

## Production Readiness Checklist

Before deploying to production, ensure:

### Security
- [ ] `JWT_SECRET` is cryptographically secure (32+ characters)
- [ ] HTTPS enabled on all endpoints
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled (configured in NestJS)
- [ ] AWS Cognito MFA enabled for admin accounts
- [ ] Database connection uses SSL
- [ ] Secrets stored in AWS Secrets Manager (not `.env`)

### Email Delivery
- [ ] AWS SES configured and verified
- [ ] Email templates reviewed and tested
- [ ] Verification email deliverability tested (check spam folders)
- [ ] Unsubscribe links added (if required by regulations)

### OAuth
- [ ] Production redirect URIs configured in Google/Apple
- [ ] OAuth consent screens approved (Google)
- [ ] Privacy policy and terms of service linked

### Monitoring
- [ ] Sentry error tracking configured
- [ ] CloudWatch logs enabled
- [ ] Cognito analytics reviewed
- [ ] Performance monitoring (New Relic, Datadog, etc.)

### Performance
- [ ] Database indexes verified (see `data-model.md`)
- [ ] Connection pooling configured (Prisma)
- [ ] CDN configured for frontend assets
- [ ] Image optimization (if applicable)

### Compliance
- [ ] GDPR data export/deletion endpoints implemented
- [ ] Privacy policy updated
- [ ] Cookie consent (if using tracking cookies)
- [ ] Accessibility audit completed (WCAG 2.2 AA)

---

## Additional Resources

### Documentation
- [Spec Document](./spec.md) - Feature requirements and user stories
- [Plan Document](./plan.md) - Implementation plan and technical design
- [Data Model](./data-model.md) - Database schema and entity relationships
- [OpenAPI Spec](./contracts/openapi.yaml) - Complete API reference

### External References
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign-In Documentation](https://developer.apple.com/sign-in-with-apple/)

### Support
- **Internal**: Slack channel `#unitediscord-dev`
- **Issues**: GitHub issues on `unitediscord/unitediscord` repository
- **Email**: dev-support@unitediscord.org

---

## Next Steps

After completing local setup:

1. **Implement Feature**: Follow tasks in `tasks.md` (generated by `/speckit.tasks`)
2. **Write Tests**: Ensure >80% code coverage (see `plan.md` for test strategy)
3. **Code Review**: Submit PR following project contribution guidelines
4. **QA Testing**: Test against acceptance scenarios in `spec.md`
5. **Deploy to Staging**: Verify in staging environment
6. **Production Release**: Deploy to production after approval

**Questions?** Reach out on Slack `#unitediscord-dev` or review the [Contributing Guide](../../CONTRIBUTING.md).
