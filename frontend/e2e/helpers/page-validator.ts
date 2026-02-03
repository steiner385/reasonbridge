/**
 * Page Validator for E2E Navigation Tests
 *
 * Validates page load success, checks for errors,
 * and tracks redirects during navigation.
 */

import type { Page } from '@playwright/test';
import { ErrorCollector, CollectedError } from './error-collector';
import { RouteDefinition, resolvePath } from './route-registry';

export interface ValidationResult {
  route: string;
  name: string;
  success: boolean;
  loadTime: number;
  errors: CollectedError[];
  redirectedTo?: string;
  httpStatus?: number;
}

export interface ValidationOptions {
  /**
   * Navigation timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;

  /**
   * Wait until this state before validating.
   * @default 'networkidle'
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';

  /**
   * Additional wait time after navigation completes.
   * Useful for pages with async data loading.
   * @default 0
   */
  additionalWaitMs?: number;
}

const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  timeout: 30000,
  waitUntil: 'networkidle',
  additionalWaitMs: 0,
};

export class PageValidator {
  private readonly page: Page;
  private readonly errorCollector: ErrorCollector;

  constructor(page: Page, errorCollector: ErrorCollector) {
    this.page = page;
    this.errorCollector = errorCollector;
  }

  /**
   * Validate a route by navigating to it and checking for errors.
   */
  async validateRoute(
    route: RouteDefinition,
    options?: ValidationOptions,
  ): Promise<ValidationResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const path = resolvePath(route);

    // Clear any previous errors
    this.errorCollector.clear();

    const startTime = Date.now();

    try {
      const response = await this.page.goto(path, {
        waitUntil: opts.waitUntil,
        timeout: opts.timeout,
      });

      // Wait for React hydration
      await this.page.waitForLoadState('domcontentloaded');

      // Additional wait if specified
      if (opts.additionalWaitMs > 0) {
        await this.page.waitForTimeout(opts.additionalWaitMs);
      }

      // Check for redirect
      const currentUrl = new URL(this.page.url());
      const expectedPath = path.startsWith('/') ? path : `/${path}`;
      const redirected = currentUrl.pathname !== expectedPath;

      const loadTime = Date.now() - startTime;
      const httpStatus = response?.status();

      return {
        route: path,
        name: route.name,
        success: httpStatus === 200 || httpStatus === 304,
        loadTime,
        errors: this.errorCollector.getErrors(),
        redirectedTo: redirected ? this.page.url() : undefined,
        httpStatus,
      };
    } catch (error) {
      const loadTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        route: path,
        name: route.name,
        success: false,
        loadTime,
        errors: [
          ...this.errorCollector.getErrors(),
          {
            type: 'uncaught',
            message: errorMessage,
            timestamp: new Date(),
          },
        ],
      };
    }
  }

  /**
   * Validate a raw path (without route definition).
   */
  async validatePath(
    path: string,
    name?: string,
    options?: ValidationOptions,
  ): Promise<ValidationResult> {
    const route: RouteDefinition = {
      path,
      name: name || path,
      requiresAuth: false,
      isDynamic: false,
    };
    return this.validateRoute(route, options);
  }

  /**
   * Check if the page is currently showing the 404 page.
   */
  async is404Page(): Promise<boolean> {
    // Common patterns for 404 pages
    const pageText = await this.page.textContent('body');
    if (!pageText) return false;

    const lowerText = pageText.toLowerCase();
    return (
      lowerText.includes('page not found') ||
      lowerText.includes('404') ||
      lowerText.includes("doesn't exist") ||
      lowerText.includes('not found')
    );
  }

  /**
   * Check if the page redirected to the landing page (login is via modal on landing page).
   */
  async isLoginRedirect(): Promise<boolean> {
    const currentUrl = new URL(this.page.url());
    return currentUrl.pathname === '/' || currentUrl.pathname === '/signin';
  }

  /**
   * Get the current page title.
   */
  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Wait for a specific element to be visible (useful for SPA content loading).
   */
  async waitForContent(selector: string, timeout = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Format validation results for reporting.
 */
export function formatValidationResults(results: ValidationResult[]): string {
  const lines: string[] = [];
  const passed = results.filter((r) => r.success && r.errors.length === 0);
  const failed = results.filter((r) => !r.success);
  const withErrors = results.filter((r) => r.success && r.errors.length > 0);

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    NAVIGATION CRAWL RESULTS                    ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Total routes:     ${results.length}`);
  lines.push(`Passed:           ${passed.length}`);
  lines.push(`Failed:           ${failed.length}`);
  lines.push(`With errors:      ${withErrors.length}`);
  lines.push('');

  if (failed.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                       FAILED ROUTES                           ');
    lines.push('───────────────────────────────────────────────────────────────');
    for (const result of failed) {
      lines.push(`  ✗ ${result.name} (${result.route})`);
      lines.push(`    HTTP: ${result.httpStatus || 'N/A'}`);
      lines.push(`    Load time: ${result.loadTime}ms`);
      if (result.errors.length > 0) {
        lines.push('    Errors:');
        for (const error of result.errors) {
          lines.push(`      - [${error.type}] ${error.message}`);
        }
      }
      lines.push('');
    }
  }

  if (withErrors.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                    ROUTES WITH ERRORS                         ');
    lines.push('───────────────────────────────────────────────────────────────');
    for (const result of withErrors) {
      lines.push(`  ⚠ ${result.name} (${result.route})`);
      lines.push(`    Load time: ${result.loadTime}ms`);
      lines.push('    Errors:');
      for (const error of result.errors) {
        lines.push(`      - [${error.type}] ${error.message}`);
      }
      lines.push('');
    }
  }

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                    PERFORMANCE SUMMARY                         ');
  lines.push('───────────────────────────────────────────────────────────────');
  const loadTimes = results.map((r) => r.loadTime);
  const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
  const maxLoadTime = Math.max(...loadTimes);
  const minLoadTime = Math.min(...loadTimes);
  lines.push(`  Average load time: ${avgLoadTime.toFixed(0)}ms`);
  lines.push(`  Max load time:     ${maxLoadTime}ms`);
  lines.push(`  Min load time:     ${minLoadTime}ms`);
  lines.push('');

  return lines.join('\n');
}
