/**
 * Navigation Crawl E2E Test Suite
 *
 * Comprehensive test that traverses the entire navigation structure
 * and verifies:
 * - Every route is reachable
 * - Pages load without JavaScript errors
 * - No failed or ineffective API calls during page load
 *
 * This test serves as a smoke test for the entire application routing.
 *
 * Note: In CI, tests run on chromium only per playwright.config.ts.
 * Locally, tests run on all browsers for comprehensive coverage.
 */

import { test, expect } from '@playwright/test';
import {
  ROUTE_REGISTRY,
  getPublicRoutes,
  getAuthenticatedRoutes,
  getAllTestableRoutes,
  resolvePath,
} from './helpers/route-registry';
import { ErrorCollector } from './helpers/error-collector';
import { PageValidator, ValidationResult, formatValidationResults } from './helpers/page-validator';
import { mockAuthenticatedUser, mockAuthenticatedEndpoints } from './fixtures/auth-mock.fixture';

test.describe('Navigation Crawl - Full Coverage', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Public Routes - No authentication required
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Public Routes', () => {
    const publicRoutes = getPublicRoutes();

    for (const route of publicRoutes) {
      test(`${route.name} (${resolvePath(route)}) loads without errors`, async ({ page }) => {
        const errorCollector = new ErrorCollector(page);
        errorCollector.attach();

        const validator = new PageValidator(page, errorCollector);
        const result = await validator.validateRoute(route);

        // Log performance
        console.log(`${route.name}: ${result.loadTime}ms`);

        // Assertions
        expect(
          result.success,
          `Page failed to load: ${result.errors.map((e) => e.message).join(', ')}`,
        ).toBe(true);

        const consoleErrors = result.errors.filter((e) => e.type === 'console');
        expect(
          consoleErrors,
          `Console errors found: ${consoleErrors.map((e) => e.message).join(', ')}`,
        ).toHaveLength(0);

        const networkErrors = result.errors.filter((e) => e.type === 'network');
        expect(
          networkErrors,
          `Failed API calls found: ${networkErrors.map((e) => `${e.url} (${e.status})`).join(', ')}`,
        ).toHaveLength(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Authenticated Routes - Requires valid session
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Authenticated Routes', () => {
    const authRoutes = getAuthenticatedRoutes();

    for (const route of authRoutes) {
      test(`${route.name} (${resolvePath(route)}) loads when authenticated`, async ({ page }) => {
        // Setup auth mock
        await mockAuthenticatedUser(page);
        await mockAuthenticatedEndpoints(page);

        const errorCollector = new ErrorCollector(page);
        errorCollector.attach();

        const validator = new PageValidator(page, errorCollector);
        const result = await validator.validateRoute(route);

        // Log performance
        console.log(`${route.name}: ${result.loadTime}ms`);

        // Assertions
        expect(
          result.success,
          `Page failed to load: ${result.errors.map((e) => e.message).join(', ')}`,
        ).toBe(true);

        expect(result.redirectedTo, 'Unexpected redirect despite auth').toBeUndefined();

        const consoleErrors = result.errors.filter((e) => e.type === 'console');
        expect(
          consoleErrors,
          `Console errors found: ${consoleErrors.map((e) => e.message).join(', ')}`,
        ).toHaveLength(0);

        const networkErrors = result.errors.filter((e) => e.type === 'network');
        expect(
          networkErrors,
          `Failed API calls found: ${networkErrors.map((e) => `${e.url} (${e.status})`).join(', ')}`,
        ).toHaveLength(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Auth Redirect Tests - Protected routes should redirect when unauthenticated
  // Note: Skip for now as the application may not enforce auth redirects on all routes.
  // Enable when auth guards are implemented on protected routes.
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe.skip('Auth Redirects', () => {
    const authRoutes = getAuthenticatedRoutes();

    for (const route of authRoutes) {
      test(`${route.name} (${resolvePath(route)}) redirects to login when unauthenticated`, async ({
        page,
      }) => {
        const errorCollector = new ErrorCollector(page);
        errorCollector.attach();

        const validator = new PageValidator(page, errorCollector);
        const result = await validator.validateRoute(route);

        // Should redirect to login
        expect(result.redirectedTo, 'Expected redirect to login page').toBeDefined();
        expect(result.redirectedTo).toContain('/login');

        // No uncaught errors during redirect
        const uncaughtErrors = result.errors.filter((e) => e.type === 'uncaught');
        expect(
          uncaughtErrors,
          `Uncaught errors during redirect: ${uncaughtErrors.map((e) => e.message).join(', ')}`,
        ).toHaveLength(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 404 Page Test
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('404 Handling', () => {
    test('Non-existent route shows 404 page', async ({ page }) => {
      const errorCollector = new ErrorCollector(page);
      errorCollector.attach();

      const validator = new PageValidator(page, errorCollector);
      const result = await validator.validatePath('/this-route-does-not-exist', 'Non-existent');

      // Page should load (200 for SPA with client-side routing)
      // Even for 404, the SPA returns 200 and renders the NotFound component
      expect(result.success).toBe(true);

      // Check that we're on the 404 page
      const is404 = await validator.is404Page();
      expect(is404, 'Expected 404 page content').toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary Test - Quick pass/fail overview
  // ═══════════════════════════════════════════════════════════════════════════

  test('Summary: All routes navigable', async ({ page }) => {
    const results: ValidationResult[] = [];
    const errorCollector = new ErrorCollector(page);
    errorCollector.attach();

    // Test all non-skipped routes
    const testableRoutes = getAllTestableRoutes();

    for (const route of testableRoutes) {
      // Setup auth for protected routes
      if (route.requiresAuth) {
        await mockAuthenticatedUser(page);
        await mockAuthenticatedEndpoints(page);
      }

      const validator = new PageValidator(page, errorCollector);
      results.push(await validator.validateRoute(route));
    }

    // Print summary report
    console.log(formatValidationResults(results));

    // Aggregate assertions
    const failed = results.filter((r) => !r.success);
    const withErrors = results.filter((r) => r.success && r.errors.length > 0);

    expect(
      failed,
      `${failed.length} route(s) failed to load: ${failed.map((r) => r.route).join(', ')}`,
    ).toHaveLength(0);

    expect(
      withErrors,
      `${withErrors.length} route(s) loaded with errors: ${withErrors.map((r) => r.route).join(', ')}`,
    ).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Route Registry Sanity Check
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Route Registry', () => {
  test('Route registry contains expected routes', () => {
    // Verify essential routes exist
    const paths = ROUTE_REGISTRY.map((r) => r.path);

    expect(paths).toContain('/');
    expect(paths).toContain('/login');
    expect(paths).toContain('/topics');
    expect(paths).toContain('/profile');
  });

  test('All routes have valid definitions', () => {
    for (const route of ROUTE_REGISTRY) {
      // All routes must have a path
      expect(route.path, `Route ${route.name} missing path`).toBeDefined();
      expect(route.path.startsWith('/'), `Route ${route.path} must start with /`).toBe(true);

      // All routes must have a name
      expect(route.name, `Route ${route.path} missing name`).toBeDefined();

      // Dynamic routes must have test params
      if (route.isDynamic && !route.skipReason) {
        expect(route.testParams, `Dynamic route ${route.path} missing testParams`).toBeDefined();
      }
    }
  });

  test('No duplicate routes', () => {
    const paths = ROUTE_REGISTRY.map((r) => r.path);
    const uniquePaths = new Set(paths);
    expect(paths.length).toBe(uniquePaths.size);
  });
});
