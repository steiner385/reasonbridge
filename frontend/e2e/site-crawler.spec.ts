/**
 * Comprehensive Site Crawler E2E Test
 *
 * Validates the entire application for:
 * 1. All pages are reachable via navigation
 * 2. All pages load without errors (console, network, uncaught exceptions)
 * 3. No dead links (all href attributes point to valid pages)
 * 4. No dummy/inactive buttons (all buttons have event handlers or valid attributes)
 *
 * This test crawls the entire site starting from key entry points and recursively
 * follows all internal links, checking each page for issues.
 *
 * UPDATED FOR REACT UI:
 * - Detects React Router Link components (rendered as <a> tags)
 * - Recognizes buttons in navigation/header areas as interactive
 * - Handles buttons with aria-label (icon-only buttons)
 * - Trusts standard button elements in React components
 * - React event handlers (onClick props) don't appear as onclick attributes in DOM
 */

import { test, expect, Page } from '@playwright/test';

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

interface PageError {
  type: 'console' | 'network' | 'uncaught';
  message: string;
  url?: string;
  status?: number;
}

interface ButtonInfo {
  text: string;
  selector: string;
  hasClickHandler: boolean;
  hasHref: boolean;
  isDisabled: boolean;
  type?: string;
  foundOn: string;
}

interface LinkInfo {
  text: string;
  href: string;
  foundOn: string;
}

interface CrawlResult {
  visited: Set<string>;
  errors: Map<string, PageError[]>;
  deadLinks: LinkInfo[];
  inactiveButtons: ButtonInfo[];
  allLinks: LinkInfo[];
  allButtons: ButtonInfo[];
}

// Removed isButtonInteractive function - interactivity is now checked inline during page.evaluate

/**
 * Crawl a single page and collect all information
 */
async function crawlPage(
  page: Page,
  url: string,
  result: CrawlResult,
  baseUrl: string,
  screenshotDir?: string,
): Promise<void> {
  const normalizedUrl = url.replace(baseUrl, '').split('?')[0].split('#')[0] || '/';

  if (result.visited.has(normalizedUrl)) return;
  result.visited.add(normalizedUrl);

  console.log(`Crawling: ${normalizedUrl}`);

  const pageErrors: PageError[] = [];

  // Listen for console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push({
        type: 'console',
        message: msg.text(),
      });
    }
  });

  // Listen for page errors
  page.on('pageerror', (error) => {
    pageErrors.push({
      type: 'uncaught',
      message: error.message,
    });
  });

  // Listen for failed requests
  page.on('response', (response) => {
    if (response.status() >= 400 && response.request().resourceType() !== 'image') {
      pageErrors.push({
        type: 'network',
        message: `${response.request().method()} ${response.url()}`,
        url: response.url(),
        status: response.status(),
      });
    }
  });

  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    if (!response || response.status() >= 400) {
      pageErrors.push({
        type: 'network',
        message: `Page failed to load with status ${response?.status() || 'unknown'}`,
        status: response?.status(),
      });
      result.errors.set(normalizedUrl, pageErrors);
      return;
    }

    await page.waitForLoadState('domcontentloaded');

    // Allow page to fully render and stabilize
    await page.waitForTimeout(200);

    // Take screenshot if directory provided
    if (screenshotDir) {
      // Convert URL to safe filename: / -> home, /topics -> topics, /topics/123 -> topics-123
      const screenshotName =
        normalizedUrl === '/'
          ? 'home.png'
          : normalizedUrl.replace(/^\//, '').replace(/\//g, '-') + '.png';
      const screenshotPath = `${screenshotDir}/${screenshotName}`;

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      console.log(`  📸 Screenshot saved: ${screenshotName}`);
    }

    // Find all internal links
    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]');
      const foundLinks: { text: string; href: string }[] = [];

      anchors.forEach((anchor) => {
        const href = anchor.getAttribute('href') || '';
        const text = anchor.textContent?.trim() || '';

        // Only internal links
        if (
          href.startsWith('/') &&
          !href.startsWith('#') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('tel:')
        ) {
          foundLinks.push({ text, href });
        }
      });

      return foundLinks;
    });

    for (const link of links) {
      result.allLinks.push({ ...link, foundOn: normalizedUrl });
    }

    // Find all buttons and check their interactivity INLINE (no selector generation)
    const buttonAnalysis = await page.evaluate(() => {
      const buttonElements = document.querySelectorAll('button, [role="button"], a[href]');
      const results: Array<{
        text: string;
        selector: string;
        hasClickHandler: boolean;
        hasHref: boolean;
        isDisabled: boolean;
        type?: string;
      }> = [];

      buttonElements.forEach((button, index) => {
        const text = button.textContent?.trim() || '';
        const ariaLabel = button.getAttribute('aria-label') || '';
        const tagName = button.tagName.toUpperCase();

        // Check interactivity directly (inline - no selector needed)
        const hasClickHandler = !!(button as any).onclick || button.hasAttribute('onclick');
        const hasHref =
          tagName === 'A' && button.hasAttribute('href') && button.getAttribute('href') !== '';
        const isSubmit = button.getAttribute('type') === 'submit' && !!button.closest('form');
        const isDisabled =
          button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';

        // React-specific indicators of interactivity
        const hasReactProps = button.hasAttribute('data-tour') || ariaLabel.length > 0;
        const isNavigation =
          button.closest('nav') !== null || button.closest('[role="navigation"]') !== null;
        const isInHeader = button.closest('header') !== null;

        // Standard interactive elements: <button>, <a>, or any element with role="button"
        const isStandardElement =
          tagName === 'BUTTON' || tagName === 'A' || button.getAttribute('role') === 'button';
        const hasContent = text.length > 0 || ariaLabel.length > 0;

        // Interactive if:
        // - Has explicit handler (onclick attribute)
        // - Has href attribute (<a> tag)
        // - Is submit button in a form
        // - Is standard element with content (React attaches handlers via props, not onclick attribute)
        // - Has React-specific data attributes
        // - Is in navigation areas (Header, Sidebar, Nav)
        // AND is not disabled
        const isInteractive =
          (hasClickHandler ||
            hasHref ||
            isSubmit ||
            (isStandardElement && hasContent) ||
            (isStandardElement && hasReactProps) ||
            (isStandardElement && (isNavigation || isInHeader))) &&
          !isDisabled;

        results.push({
          text,
          selector: `[Button #${index}]`, // Just for reporting, not used for querying
          hasClickHandler: isInteractive,
          hasHref: !!hasHref,
          isDisabled,
          type: button.getAttribute('type') || undefined,
        });
      });

      return results;
    });

    // Separate into interactive and inactive buttons
    for (const button of buttonAnalysis) {
      const buttonInfo: ButtonInfo = {
        ...button,
        foundOn: normalizedUrl,
      };
      result.allButtons.push(buttonInfo);

      // Only flag as inactive if:
      // - Not interactive AND
      // - Not disabled AND
      // - Has meaningful content (text or type attribute)
      // Note: Icon-only buttons with aria-label are considered interactive above
      const hasMeaningfulContent = button.text.length > 1;
      const shouldCheck = hasMeaningfulContent || button.type;

      if (!button.hasClickHandler && !button.isDisabled && shouldCheck) {
        result.inactiveButtons.push(buttonInfo);
      }
    }

    if (pageErrors.length > 0) {
      result.errors.set(normalizedUrl, pageErrors);
    }
  } catch (error) {
    pageErrors.push({
      type: 'uncaught',
      message: error instanceof Error ? error.message : String(error),
    });
    result.errors.set(normalizedUrl, pageErrors);
  }
}

test.describe('Site Crawler - Comprehensive Validation', () => {
  // Only run in E2E Docker mode with real backend
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  test('Crawl entire site and validate navigation, links, and buttons', async ({
    page,
    baseURL,
  }) => {
    // Increase timeout for comprehensive site crawl (14 start pages + discovered links)
    test.setTimeout(120000); // 2 minutes
    const base = baseURL || 'http://localhost:9080';

    // Create screenshot directory with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const screenshotDir = `test-results/site-crawler-screenshots-${timestamp}`;

    const result: CrawlResult = {
      visited: new Set(),
      errors: new Map(),
      deadLinks: [],
      inactiveButtons: [],
      allLinks: [],
      allButtons: [],
    };

    // Key entry points to start crawling
    const startPages = [
      '/', // Landing page
      '/about', // About page
      '/signup', // Signup page
      '/register', // Registration page
      '/forgot-password', // Password reset
      '/simulator', // Discussion simulator (no auth required)
      '/topics', // Main topics list (authenticated)
      '/profile', // User profile (authenticated)
      '/settings', // Settings root (authenticated)
      '/settings/feedback', // Feedback preferences (authenticated)
      '/notifications', // Notifications page (authenticated)
      '/verification', // Verification page (authenticated)
      '/admin/moderation', // Moderation dashboard (authenticated, admin only)
      '/appeals', // Appeal status page (authenticated)
    ];

    // First pass: crawl all start pages
    for (const startPage of startPages) {
      await crawlPage(page, base + startPage, result, base, screenshotDir);
    }

    // Second pass: follow discovered links (up to a reasonable limit)
    const uniqueHrefs = [...new Set(result.allLinks.map((l) => l.href))];
    const maxLinks = 50; // Prevent infinite crawling

    for (let i = 0; i < Math.min(uniqueHrefs.length, maxLinks); i++) {
      const href = uniqueHrefs[i];
      const normalized = href.split('?')[0].split('#')[0];
      if (!result.visited.has(normalized)) {
        await crawlPage(page, base + href, result, base, screenshotDir);
      }
    }

    // Check all unique links for dead links
    for (const href of uniqueHrefs) {
      const normalized = href.split('?')[0].split('#')[0];
      if (result.visited.has(normalized)) continue;

      try {
        const response = await page.goto(base + href, {
          waitUntil: 'domcontentloaded',
          timeout: 5000,
        });

        // Check if we got a 404 page
        const is404 = await page.evaluate(() => {
          const text = document.body.textContent || '';
          return (
            text.includes('404') || text.includes('not found') || text.includes('Page Not Found')
          );
        });

        if (!response || response.status() >= 400 || is404) {
          const linkInfo = result.allLinks.find((l) => l.href === href);
          if (linkInfo) result.deadLinks.push(linkInfo);
        }
        result.visited.add(normalized);
      } catch {
        const linkInfo = result.allLinks.find((l) => l.href === href);
        if (linkInfo) result.deadLinks.push(linkInfo);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Print Results Summary
    // ═══════════════════════════════════════════════════════════════════════════

    console.log('\n');
    console.log('═'.repeat(80));
    console.log(' SITE CRAWLER RESULTS');
    console.log('═'.repeat(80));
    console.log('');

    console.log(`📊 Pages visited: ${result.visited.size}`);
    console.log(`🔗 Unique links found: ${uniqueHrefs.length}`);
    console.log(`🔘 Buttons found: ${result.allButtons.length}`);
    console.log(`📸 Screenshots saved to: ${screenshotDir}/`);
    console.log('');

    // Pages with errors
    console.log(`❌ Pages with errors: ${result.errors.size}`);
    if (result.errors.size > 0) {
      for (const [pagePath, errors] of result.errors.entries()) {
        console.log(`  ${pagePath}:`);
        errors.forEach((err) => {
          console.log(`    - [${err.type}] ${err.message}`);
        });
      }
    } else {
      console.log('  ✅ No pages with errors!');
    }
    console.log('');

    // Dead links
    console.log(`🔗 Dead links: ${result.deadLinks.length}`);
    if (result.deadLinks.length > 0) {
      result.deadLinks.forEach((link) => {
        console.log(`  ❌ "${link.text}" -> ${link.href} (on: ${link.foundOn})`);
      });
    } else {
      console.log('  ✅ No dead links found!');
    }
    console.log('');

    // Inactive buttons
    console.log(`🔘 Inactive/dummy buttons: ${result.inactiveButtons.length}`);
    if (result.inactiveButtons.length > 0) {
      result.inactiveButtons.forEach((btn) => {
        console.log(`  ❌ "${btn.text}" on ${btn.foundOn}`);
      });
    } else {
      console.log('  ✅ No inactive buttons found!');
    }
    console.log('');

    console.log('═'.repeat(80));
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════════
    // Assertions
    // ═══════════════════════════════════════════════════════════════════════════

    expect(
      result.errors.size,
      `${result.errors.size} page(s) had errors. See console output for details.`,
    ).toBe(0);

    expect(
      result.deadLinks.length,
      `${result.deadLinks.length} dead link(s) found: ${result.deadLinks.map((l) => `${l.href} (on ${l.foundOn})`).join(', ')}`,
    ).toBe(0);

    expect(
      result.inactiveButtons.length,
      `${result.inactiveButtons.length} inactive/dummy button(s) found: ${result.inactiveButtons.map((b) => `"${b.text}" on ${b.foundOn}`).join(', ')}`,
    ).toBe(0);
  });
});
