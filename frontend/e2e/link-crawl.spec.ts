import { test, expect, Page } from '@playwright/test';
import { mockAuthenticatedUser, mockAuthenticatedEndpoints } from './fixtures/auth-mock.fixture';

interface LinkInfo {
  text: string;
  href: string;
  foundOn: string;
}

interface CrawlResult {
  visited: Set<string>;
  deadLinks: LinkInfo[];
  unreachablePages: string[];
  allLinks: LinkInfo[];
}

async function crawlPage(
  page: Page,
  url: string,
  result: CrawlResult,
  baseUrl: string,
): Promise<void> {
  const normalizedUrl = url.replace(baseUrl, '').split('?')[0].split('#')[0] || '/';

  if (result.visited.has(normalizedUrl)) return;
  result.visited.add(normalizedUrl);

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });

    if (!response || response.status() >= 400) {
      result.unreachablePages.push(normalizedUrl);
      return;
    }

    await page.waitForLoadState('domcontentloaded');

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
  } catch {
    result.unreachablePages.push(normalizedUrl);
  }
}

test.describe('Link Crawl - Dead Link Detection', () => {
  test('Find all links and check for dead links', async ({ page, baseURL }) => {
    const base = baseURL || 'http://localhost:3000';

    await mockAuthenticatedUser(page);
    await mockAuthenticatedEndpoints(page);

    const result: CrawlResult = {
      visited: new Set(),
      deadLinks: [],
      unreachablePages: [],
      allLinks: [],
    };

    // Key entry points to crawl
    const startPages = [
      '/',
      '/topics',
      '/about',
      '/login',
      '/profile',
      '/admin/moderation',
      '/verification',
      '/appeals',
      '/settings/feedback',
    ];

    for (const startPage of startPages) {
      await crawlPage(page, base + startPage, result, base);
    }

    // Check all discovered links
    const uniqueHrefs = [...new Set(result.allLinks.map((l) => l.href))];

    console.log('\n=== LINK CRAWL RESULTS ===\n');
    console.log('Pages visited:', result.visited.size);
    console.log('Total links found:', result.allLinks.length);
    console.log('Unique link destinations:', uniqueHrefs.length);

    // Check each unique link
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

    console.log('\n=== DEAD LINKS:', result.deadLinks.length, '===');
    if (result.deadLinks.length > 0) {
      result.deadLinks.forEach((link) => {
        console.log('  X "' + link.text + '" -> ' + link.href + ' (on page: ' + link.foundOn + ')');
      });
    } else {
      console.log('  OK No dead links found!');
    }

    console.log('\n=== UNREACHABLE PAGES:', result.unreachablePages.length, '===');
    if (result.unreachablePages.length > 0) {
      result.unreachablePages.forEach((p) => console.log('  X ' + p));
    }

    console.log('\n=== ALL NAVIGATION LINKS BY PAGE ===\n');
    const linksByPage = new Map<string, Set<string>>();
    result.allLinks.forEach((link) => {
      const existing = linksByPage.get(link.foundOn) || new Set();
      existing.add('"' + link.text + '" -> ' + link.href);
      linksByPage.set(link.foundOn, existing);
    });

    linksByPage.forEach((links, pagePath) => {
      console.log(pagePath + ':');
      [...links].forEach((l) => console.log('  - ' + l));
    });

    // Assert no dead links
    expect(result.deadLinks.length).toBe(0);
  });
});
