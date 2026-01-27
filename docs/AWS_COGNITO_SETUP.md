# AWS Cognito Setup Guide for User Onboarding

This guide walks you through setting up AWS Cognito for the ReasonBridge user onboarding feature.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Access to Google/Apple Developer accounts (for OAuth)

## Step 1: Create Cognito User Pool

### Via AWS Console

1. **Navigate to Cognito**
   - Go to AWS Console → Cognito
   - Click "Create user pool"

2. **Configure Sign-in Experience**
   - Sign-in options: ✓ Email
   - Cognito user pool sign-in options: Email
   - User name requirements: Allow users to sign in with email
   - Click "Next"

3. **Configure Security Requirements**
   - Password policy: Default (or customize)
   - Multi-factor authentication: Optional (disable for now, enable later)
   - User account recovery: ✓ Email only
   - Click "Next"

4. **Configure Sign-up Experience**
   - Self-service sign-up: ✓ Enable
   - Attribute verification: ✓ Email
   - Required attributes: None (we only need email)
   - Click "Next"

5. **Configure Message Delivery**
   - Email provider: Choose one:
     - **Option A (Quick)**: Send email with Cognito
     - **Option B (Production)**: Send email with Amazon SES
       - Select your verified SES identity
       - FROM email address: `noreply@reasonbridge.org`
   - Click "Next"

6. **Integrate Your App**
   - User pool name: `reasonbridge-users`
   - App type: Public client
   - App client name: `reasonbridge-web`
   - Client secret: Don't generate (for frontend)
   - Authentication flows:
     - ✓ ALLOW_USER_PASSWORD_AUTH
     - ✓ ALLOW_REFRESH_TOKEN_AUTH
   - Click "Next"

7. **Review and Create**
   - Review all settings
   - Click "Create user pool"

8. **Note the Credentials**
   ```bash
   # Copy these values to your .env file:
   User Pool ID: us-east-1_XXXXXXXXX
   App Client ID: xxxxxxxxxxxxxxxxxxxx
   AWS Region: us-east-1 (or your region)
   ```

### Via AWS CLI

```bash
# Create user pool
aws cognito-idp create-user-pool \
  --pool-name reasonbridge-users \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}" \
  --auto-verified-attributes email \
  --username-attributes email \
  --verification-message-template "DefaultEmailOption=CONFIRM_WITH_CODE" \
  --email-configuration "EmailSendingAccount=COGNITO_DEFAULT" \
  --region us-east-1

# Note the UserPoolId from output

# Create app client
aws cognito-idp create-user-pool-client \
  --user-pool-id <YOUR_USER_POOL_ID> \
  --client-name reasonbridge-web \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region us-east-1

# Note the ClientId from output
```

## Step 2: Configure Email Verification Template

By default, Cognito sends a 6-digit verification code. To customize:

1. Go to your User Pool → Messaging → Email
2. Click "Edit"
3. Customize verification message:

   ```
   Your ReasonBridge verification code is: {####}

   This code expires in 24 hours.

   If you didn't request this code, please ignore this email.
   ```

4. Save changes

## Step 3: Set Up OAuth Providers (Optional)

### Google OAuth

1. **Create Google OAuth 2.0 Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     https://reasonbridge-users.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
     http://localhost:3000/auth/google/callback (for local dev)
     ```
   - Copy Client ID and Client Secret

2. **Configure in Cognito**
   - Go to your User Pool → Sign-in experience → Federated identity provider sign-in
   - Add identity provider → Google
   - Client ID: (paste Google Client ID)
   - Client secret: (paste Google Client Secret)
   - Authorized scopes: `profile email openid`
   - Attribute mapping:
     - `email` → `email`
     - `name` → `name`
   - Save changes

3. **Update .env**
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here
   GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

### Apple Sign In

1. **Register App ID in Apple Developer Portal**
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Certificates, Identifiers & Profiles → Identifiers
   - Register new App ID or Services ID
   - Enable "Sign In with Apple"
   - Configure domains and return URLs:
     ```
     Domains: reasonbridge.org, reasonbridge-users.auth.us-east-1.amazoncognito.com
     Return URLs: https://reasonbridge-users.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
     ```

2. **Create Private Key**
   - Keys → Create new key
   - Enable "Sign In with Apple"
   - Download .p8 file
   - Save to `config/apple-auth-key.p8`

3. **Configure in Cognito**
   - Go to your User Pool → Sign-in experience → Federated identity provider sign-in
   - Add identity provider → Apple
   - Services ID: (your Apple Services ID)
   - Team ID: (your Apple Team ID)
   - Key ID: (from Apple key)
   - Private key: (paste contents of .p8 file)
   - Authorized scopes: `name email`
   - Save changes

4. **Update .env**
   ```bash
   APPLE_SERVICE_ID=your_apple_service_id_here
   APPLE_TEAM_ID=your_apple_team_id_here
   APPLE_KEY_ID=your_apple_key_id_here
   APPLE_PRIVATE_KEY_PATH=./config/apple-auth-key.p8
   APPLE_REDIRECT_URI=http://localhost:3000/auth/apple/callback
   ```

## Step 4: Update Environment Variables

Edit your `.env` file:

```bash
# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1

# Google OAuth (if configured)
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Apple Sign In (if configured)
APPLE_SERVICE_ID=your_apple_service_id_here
APPLE_TEAM_ID=your_apple_team_id_here
APPLE_KEY_ID=your_apple_key_id_here
APPLE_PRIVATE_KEY_PATH=./config/apple-auth-key.p8
APPLE_REDIRECT_URI=http://localhost:3000/auth/apple/callback
```

## Step 5: Test the Setup

### Test Email Signup

```bash
# Start backend
pnpm --filter user-service dev

# Start frontend (new terminal)
pnpm --filter frontend dev

# Navigate to http://localhost:3000/signup
# Try signing up with a test email
```

### Test Email Verification

1. Sign up with your email
2. Check your email for verification code
3. Enter the code on the verification page
4. Should redirect to topic selection

### Test OAuth (if configured)

1. Click "Sign in with Google" or "Sign in with Apple"
2. Complete OAuth flow
3. Should redirect to onboarding

## Troubleshooting

### Verification Email Not Received

**Problem**: Cognito default email has low deliverability

**Solution**: Configure Amazon SES

1. Verify your domain in SES
2. Move out of SES sandbox (request production access)
3. Update Cognito to use SES for email delivery

### OAuth Redirect Not Working

**Problem**: Redirect URI mismatch

**Solution**: Ensure redirect URIs match exactly in:

- Google/Apple Developer Console
- Cognito User Pool settings
- Your .env file

### Password Authentication Failing

**Problem**: Explicit auth flow not enabled

**Solution**: Enable `ALLOW_USER_PASSWORD_AUTH` in app client settings:

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id <POOL_ID> \
  --client-id <CLIENT_ID> \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

### CORS Errors in Browser

**Problem**: Frontend can't call Cognito API

**Solution**: This is expected - Cognito calls should go through your backend API
The backend makes Cognito SDK calls, not the frontend directly.

## Security Best Practices

1. **Production Setup**
   - Use SES for email delivery (not Cognito default)
   - Enable MFA for enhanced security
   - Use WAF to protect Cognito endpoints
   - Rotate JWT secrets regularly

2. **OAuth Security**
   - Keep client secrets secure (backend only)
   - Use PKCE for additional security
   - Validate OAuth state parameter
   - Implement CSRF protection

3. **Monitoring**
   - Enable Cognito logging in CloudWatch
   - Monitor failed authentication attempts
   - Set up alerts for suspicious activity

## Cost Optimization

**Cognito Free Tier**:

- First 50,000 MAU: Free
- After: $0.0055 per MAU

**SES Costs**:

- First 62,000 emails/month: Free (if sending from EC2)
- After: $0.10 per 1,000 emails

For development, Cognito default email is fine. For production, use SES.

## Next Steps

After Cognito is configured:

1. **Test Complete Onboarding Flow**

   ```bash
   # All services should be running
   docker compose up -d
   pnpm --filter user-service dev
   pnpm --filter frontend dev
   ```

2. **Run E2E Tests**

   ```bash
   pnpm --filter frontend test:e2e
   ```

3. **Configure Staging Environment**
   - Create separate Cognito pool for staging
   - Use different OAuth credentials
   - Test with staging domain

4. **Plan Production Deployment**
   - Set up CI/CD pipeline
   - Configure production Cognito pool
   - Enable MFA and advanced security
   - Set up monitoring and alerts

## References

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Cognito Pricing](https://aws.amazon.com/cognito/pricing/)

---

**Need Help?** Check the troubleshooting section or reach out to the team.
