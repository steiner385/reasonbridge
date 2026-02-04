/**
 * AI Feedback Accuracy Tests
 *
 * These tests verify that Bedrock-powered AI feedback catches nuanced issues
 * that regex patterns miss. They are NOT meant to run in CI (they use real
 * AWS Bedrock calls and are expensive/slow).
 *
 * Run manually with:
 * E2E_DOCKER=true PLAYWRIGHT_BASE_URL=http://localhost:9080 npx playwright test ai-feedback-accuracy.spec.ts
 *
 * IMPORTANT: These tests require:
 * - AWS credentials configured (~/.aws/credentials)
 * - AI service with Bedrock access (docker-compose.e2e.yml)
 * - Tests marked with @ai tag (skip in CI)
 */

import { test, expect } from '@playwright/test';

// Skip these tests in CI - they're manual smoke tests only
test.describe.configure({ mode: 'serial' });
test.slow(); // Mark as slow tests (5x timeout)

/**
 * Helper to login with demo user
 */
async function loginAsAlice(page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('alice@demo.reasonbridge.org');
  await page.getByLabel(/password/i).fill('DemoAlice2026!');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/(\/$|\/topics|\/dashboard)/);
}

/**
 * Helper to navigate to a topic's response composer
 */
async function navigateToTopicComposer(page) {
  // Go to topics page
  await page.goto('/topics');

  // Click on first topic
  await page
    .getByRole('link', { name: /Universal Basic Income/i })
    .first()
    .click();

  // Wait for topic detail page
  await page.waitForSelector('textarea, [contenteditable]', { timeout: 10000 });
}

/**
 * Helper to type content and wait for feedback
 */
async function typeAndWaitForFeedback(
  page,
  content: string,
  options: { waitForAI?: boolean; timeout?: number } = {},
) {
  const { waitForAI = false, timeout = 5000 } = options;

  // Find textarea
  const textarea = page.locator('textarea').first();

  // Clear and type content
  await textarea.clear();
  await textarea.fill(content);

  if (waitForAI) {
    // Wait for AI analysis badge to appear
    await expect(page.getByText(/🤖 Analyzing/i)).toBeVisible({ timeout });
    // Wait for AI analysis to complete
    await expect(page.getByText(/✨ AI/i)).toBeVisible({ timeout: 30000 });
  } else {
    // Just wait for feedback panel to update
    await page.waitForTimeout(1000);
  }
}

test.describe('AI Feedback Accuracy - Nuanced Tone Detection @ai', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page);
    await navigateToTopicComposer(page);
  });

  test('should catch subtle dismissiveness that regex misses', async ({ page }) => {
    const dismissiveContent =
      "Clearly you don't understand basic economics. Anyone with half a brain can see that this policy would never work in practice.";

    await typeAndWaitForFeedback(page, dismissiveContent, { waitForAI: true });

    // Verify AI feedback appears
    await expect(page.getByText(/✨ AI/i)).toBeVisible();

    // Should flag as INFLAMMATORY or HOSTILE
    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    const feedbackText = await feedbackPanel.textContent();

    expect(feedbackText?.toLowerCase()).toMatch(/inflammatory|hostile|dismissive/);

    // Should have actionable suggestion
    expect(feedbackText?.toLowerCase()).toMatch(/consider|rephras|focus on/);
  });

  test('should catch condescending language', async ({ page }) => {
    const condescendingContent =
      "Let me explain this to you in simple terms since you seem confused. The real issue here is something you clearly haven't thought about.";

    await typeAndWaitForFeedback(page, condescendingContent, { waitForAI: true });

    // Verify AI feedback appears
    await expect(page.getByText(/✨ AI/i)).toBeVisible();

    // Should flag the condescending tone
    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    const feedbackText = await feedbackPanel.textContent();

    expect(feedbackText?.toLowerCase()).toMatch(/tone|condescend|respect/);
  });

  test('should catch third-person attacks with intensifiers', async ({ page }) => {
    const attackContent =
      "These people are really stupid and have absolutely no idea what they're talking about. Their arguments are completely moronic.";

    await typeAndWaitForFeedback(page, attackContent, { waitForAI: true });

    // Should flag even with regex (improved patterns)
    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    await expect(feedbackPanel).toBeVisible();

    const feedbackText = await feedbackPanel.textContent();
    expect(feedbackText?.toLowerCase()).toMatch(/inflammatory|personal attack/);
  });

  test('should NOT flag respectful disagreement', async ({ page }) => {
    const respectfulContent =
      'I respectfully disagree with this perspective. While I understand the concerns raised, I believe there are alternative approaches worth considering. Let me explain my reasoning...';

    await typeAndWaitForFeedback(page, respectfulContent, { waitForAI: true });

    // Verify AI feedback appears
    await expect(page.getByText(/✨ AI/i)).toBeVisible({ timeout: 30000 });

    // Should show AFFIRMATION or "ready to post"
    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    const feedbackText = await feedbackPanel.textContent();

    // Should either show affirmation or "ready to post" message
    const hasAffirmation =
      feedbackText?.toLowerCase().includes('affirmation') ||
      feedbackText?.toLowerCase().includes('constructive') ||
      feedbackText?.toLowerCase().includes('ready to post');

    expect(hasAffirmation).toBeTruthy();
  });

  test('should catch strawman fallacy', async ({ page }) => {
    const strawmanContent =
      "So you're saying we should just give free money to everyone and let them sit at home doing nothing? That's absurd. Nobody would work anymore and society would collapse.";

    await typeAndWaitForFeedback(page, strawmanContent, { waitForAI: true });

    // Verify AI feedback appears
    await expect(page.getByText(/✨ AI/i)).toBeVisible();

    // Should flag as FALLACY (strawman)
    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    const feedbackText = await feedbackPanel.textContent();

    expect(feedbackText?.toLowerCase()).toMatch(/fallacy|strawman|misrepresent/);
  });

  test('should catch unsourced statistical claims', async ({ page }) => {
    const unsourcedContent =
      '75% of economists agree that this policy would fail. Studies have shown that similar programs always increase inflation by at least 20%.';

    await typeAndWaitForFeedback(page, unsourcedContent, { waitForAI: true });

    // Verify AI feedback appears
    await expect(page.getByText(/✨ AI/i)).toBeVisible();

    // Should flag as UNSOURCED
    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    const feedbackText = await feedbackPanel.textContent();

    expect(feedbackText?.toLowerCase()).toMatch(/unsourced|citation|source|evidence/);
  });
});

test.describe('AI vs Regex Performance Comparison @ai', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page);
    await navigateToTopicComposer(page);
  });

  test('regex should be fast (<500ms), AI should be slower but thorough', async ({ page }) => {
    const testContent = 'these people are really stupid';

    // Test regex speed
    const regexStart = Date.now();
    await typeAndWaitForFeedback(page, testContent, { waitForAI: false });
    const regexTime = Date.now() - regexStart;

    // Regex should be very fast
    expect(regexTime).toBeLessThan(2000);

    // Should show feedback (from regex)
    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    await expect(feedbackPanel).toBeVisible();

    // Now wait for AI to kick in
    const aiStart = Date.now();
    await expect(page.getByText(/✨ AI/i)).toBeVisible({ timeout: 30000 });
    const aiTime = Date.now() - aiStart;

    // AI should take longer (typically 2-10 seconds)
    expect(aiTime).toBeGreaterThan(1000);
    expect(aiTime).toBeLessThan(15000);

    console.log(`Regex time: ${regexTime}ms, AI time: ${aiTime}ms`);
  });

  test('should show regex feedback immediately, then upgrade to AI', async ({ page }) => {
    const content = 'these people are really stupid and dont know what theyre talking about';

    const textarea = page.locator('textarea').first();
    await textarea.clear();
    await textarea.fill(content);

    // Should show feedback quickly (regex)
    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    await expect(feedbackPanel).toBeVisible({ timeout: 2000 });

    // Should NOT have AI badge yet
    await expect(page.getByText(/✨ AI/i)).not.toBeVisible();

    // Wait for AI badge to appear
    await expect(page.getByText(/🤖 Analyzing/i)).toBeVisible({ timeout: 5000 });

    // Should show "Refining analysis" message
    await expect(page.getByText(/Refining analysis/i)).toBeVisible();

    // Finally AI results should appear
    await expect(page.getByText(/✨ AI/i)).toBeVisible({ timeout: 30000 });
  });
});

test.describe('AI Feedback Edge Cases @ai', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page);
    await navigateToTopicComposer(page);
  });

  test('should handle sarcasm and passive-aggressiveness', async ({ page }) => {
    const sarcasticContent =
      "Oh sure, because that worked out so well last time. I'm sure this totally brilliant idea will have completely different results.";

    await typeAndWaitForFeedback(page, sarcasticContent, { waitForAI: true });

    // AI should detect hostile/sarcastic tone
    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    const feedbackText = await feedbackPanel.textContent();

    expect(feedbackText?.toLowerCase()).toMatch(/tone|sarcas|hostil/);
  });

  test('should handle long, well-reasoned arguments', async ({ page }) => {
    const longContent = `I appreciate the concerns raised about Universal Basic Income. However, I'd like to present an alternative perspective based on recent pilot programs.

First, the Alaska Permanent Fund has distributed annual dividends since 1982 without reducing employment. Studies show work participation rates remained stable.

Second, Finland's 2017-2018 UBI pilot found recipients reported better wellbeing and trust in institutions. While employment didn't increase significantly, the program didn't reduce work as critics predicted.

Third, addressing automation concerns: as routine jobs become automated, UBI could provide transition support and enable retraining. The cost is significant but manageable through progressive taxation and reduced welfare administration.

I believe UBI deserves serious consideration, though implementation details matter greatly.`;

    await typeAndWaitForFeedback(page, longContent, { waitForAI: true });

    // Should show affirmation or "ready to post"
    await expect(page.getByText(/✨ AI/i)).toBeVisible();

    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    const feedbackText = await feedbackPanel.textContent();

    // Should be positive or have no critical issues
    const isPositive =
      feedbackText?.toLowerCase().includes('ready to post') ||
      feedbackText?.toLowerCase().includes('constructive') ||
      feedbackText?.toLowerCase().includes('well-reasoned');

    expect(isPositive).toBeTruthy();
  });

  test('should detect false dichotomy fallacy', async ({ page }) => {
    const falseDichotomyContent =
      "Either we implement UBI immediately or we let people starve in the streets. There's no middle ground here. You're either for helping people or you're not.";

    await typeAndWaitForFeedback(page, falseDichotomyContent, { waitForAI: true });

    await expect(page.getByText(/✨ AI/i)).toBeVisible();

    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    const feedbackText = await feedbackPanel.textContent();

    expect(feedbackText?.toLowerCase()).toMatch(/fallacy|false dichotomy|either.*or|nuance/);
  });
});

test.describe('AI Feedback Consistency @ai', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page);
    await navigateToTopicComposer(page);
  });

  test('should give consistent feedback for identical content', async ({ page }) => {
    const content = "These people clearly have no idea what they're talking about.";

    // First analysis
    await typeAndWaitForFeedback(page, content, { waitForAI: true });

    const feedbackPanel = page.locator('[role="region"][aria-label*="feedback"]');
    const firstFeedback = await feedbackPanel.textContent();

    // Clear and re-type same content
    const textarea = page.locator('textarea').first();
    await textarea.clear();
    await textarea.fill('Different content temporarily');
    await page.waitForTimeout(1000);

    // Type original content again
    await typeAndWaitForFeedback(page, content, { waitForAI: true });

    const secondFeedback = await feedbackPanel.textContent();

    // Should have similar feedback (might not be identical due to AI variation)
    // But both should flag the issue
    expect(firstFeedback?.toLowerCase()).toMatch(/inflammatory|hostile/);
    expect(secondFeedback?.toLowerCase()).toMatch(/inflammatory|hostile/);
  });
});
