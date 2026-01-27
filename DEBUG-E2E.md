# E2E Debugging Guide

## Quick Start - Run Tests Locally

```bash
cd /mnt/ssk-ssd/tony/GitHub/reasonBridge
./scripts/run-e2e-local.sh
```

This runs E2E tests in Docker containers exactly like Jenkins CI.

## What Was Added for Debugging

### 1. Console Logging

The test now logs every step of the registration process:

- Form field filling
- Button state (visible, enabled)
- Current URL before/after button click
- API calls being made
- Navigation events

### 2. Browser Console Capture

All browser console messages (log, warn, error) are captured and prefixed with `BROWSER [type]:`.

### 3. Page Error Capture

JavaScript errors in the page are captured and logged with full stack traces.

### 4. Network Monitoring

All API requests/responses to `/api/*` or `/auth/*` are logged:

- `API REQUEST: POST /api/auth/register`
- `API RESPONSE: 200 /api/auth/register`

### 5. Timeout Error Details

If navigation times out, you'll see:

- Current URL when timeout occurred
- All API calls that were made
- Page body text (first 500 chars)
- Whether register button is still visible
- Screenshot: `debug-registration-timeout.png`

### 6. Playwright Trace

Enabled full trace capture (not just on retry). Traces saved to `frontend/test-results/*/trace.zip`.

## Interpreting the Output

### Expected Successful Flow

```
DEBUG: Navigating to /register
DEBUG: Registration page loaded, current URL: http://frontend/register
DEBUG: Filling registration form with: { email: 'trust-test-1234@example.com', ... }
DEBUG: Form filled, looking for register button...
DEBUG: Register button visible: true
DEBUG: Register button enabled: true
DEBUG: Register button text: Create Account
DEBUG: About to click register button...
DEBUG: Current URL before click: http://frontend/register
DEBUG: API calls so far: []
DEBUG: Register button clicked!
DEBUG: Current URL immediately after click: http://frontend/register
API REQUEST: POST http://frontend/api/auth/register          ← SHOULD SEE THIS
API RESPONSE: 200 http://frontend/api/auth/register          ← AND THIS
DEBUG: URL after 1 second: http://frontend/login             ← OR THIS
DEBUG: Waiting for navigation to /login, /dashboard, /home, /profile, or /topics...
DEBUG: Navigation completed!
DEBUG: Final URL after registration: http://frontend/login
DEBUG: Total API calls made: ['POST http://frontend/api/auth/register']
```

### Current Failing Flow (Hypothesis)

```
DEBUG: About to click register button...
DEBUG: Register button clicked!
DEBUG: Current URL immediately after click: http://frontend/register
DEBUG: URL after 1 second: http://frontend/register          ← STILL ON SAME PAGE
DEBUG: API calls after button click: []                      ← NO API CALL MADE!
DEBUG: Waiting for navigation...
[...15 seconds pass...]
DEBUG: Navigation timeout! Still on URL: http://frontend/register
DEBUG: API calls that were made: []
BROWSER [error]: [Some JavaScript error that prevented form submission]
```

## Key Things to Look For

1. **Does the button click register?**
   - Look for "Register button clicked!" message

2. **Does the API call happen?**
   - Look for "API REQUEST: POST .../auth/register"
   - If NO: Form submission is blocked (JavaScript error, validation, event handler issue)
   - If YES: Check the response status

3. **What's the response status?**
   - 200/201: Success, should redirect
   - 400: Validation error
   - 409: User already exists
   - 500: Server error
   - Network error: Connection refused

4. **Are there browser errors?**
   - Look for "BROWSER [error]:" or "PAGE ERROR:"
   - These indicate JavaScript exceptions

5. **Does the URL change?**
   - Compare URL before/after click
   - If unchanged after 1 second, form didn't submit

## Next Steps Based on Results

### If NO API call is made:

- Check browser console errors
- Form validation might be failing silently
- JavaScript error preventing submission
- Event handler not attached correctly

### If API call returns error:

- Check response status and body
- Backend might be rejecting the request
- CORS issue
- Network connectivity problem

### If API call succeeds but no redirect:

- Frontend navigation logic broken
- React Router issue
- Check for errors in `RegisterPage.tsx`

## Viewing Playwright Traces

```bash
# Install Playwright locally (if not already)
npm install -D @playwright/test

# Open the trace viewer
npx playwright show-trace frontend/test-results/[test-name]/trace.zip
```

This shows a timeline of all actions, network requests, console messages, and screenshots.

## Running Specific Tests

To run just the trust indicator tests (faster for debugging):

```bash
# Modify run-e2e-local.sh line 194 to:
npx playwright test profile-trust-indicators.spec.ts --reporter=list,junit,json
```

Or run single test:

```bash
npx playwright test profile-trust-indicators.spec.ts:87 --reporter=list
```

## Cleanup

The script automatically cleans up all containers on exit (even Ctrl+C). If cleanup fails:

```bash
# Manual cleanup
docker ps -a | grep 'e2e-local' | awk '{print $1}' | xargs docker rm -f
docker network prune -f
docker volume prune -f
```

## Common Issues

### Port Already in Use

If you get "port 9080 already in use":

```bash
docker ps | grep 9080
docker stop [container-id]
```

### Out of Memory (Exit Code 137)

If Playwright crashes with exit code 137:

**Diagnosis (as of Build #9):**
Jenkins pipeline now includes memory monitoring via `docker stats`. Check build logs for:

- Memory usage before tests
- Memory usage during tests (sampled continuously)
- Peak memory usage

This helps determine if 137 is truly OOM or another resource limit.

**If confirmed OOM:**

```bash
# Increase Docker memory limit in Docker Desktop settings
# Or reduce parallel workers in playwright.config.ts
# Or disable Allure reporter temporarily in playwright.config.ts
```

### Tests Hang Forever

Check if services started:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

All containers should show "(healthy)" or "Up".
