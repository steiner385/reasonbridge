/**
 * Error Collector for E2E Navigation Tests
 *
 * Tracks console errors, failed network requests, and uncaught exceptions
 * during page navigation to ensure pages load cleanly.
 */

import type { Page, ConsoleMessage, Response } from '@playwright/test';

export type ErrorType = 'console' | 'network' | 'uncaught';

export interface CollectedError {
  type: ErrorType;
  message: string;
  url?: string;
  status?: number;
  timestamp: Date;
}

/**
 * URL patterns to ignore during error collection.
 * These are expected 404s or development artifacts.
 */
const IGNORED_URL_PATTERNS = [
  '/favicon.ico',
  '/robots.txt',
  '/manifest.json',
  '/__vite', // Vite HMR
  '/sockjs-node', // Webpack dev server (if used)
  '/@vite/', // Vite module resolution
  '/node_modules/.vite/', // Vite cache
  '.hot-update.', // Hot module replacement
];

/**
 * Console message patterns to ignore.
 * React development warnings and expected messages.
 */
const IGNORED_CONSOLE_PATTERNS = [
  'Download the React DevTools', // React extension prompt
  'Warning: ReactDOM.render is no longer supported', // React 18 migration
  '[HMR]', // Hot module replacement
  'WebSocket connection', // Dev server connection
  'Failed to load resource: net::ERR_FAILED', // Network errors without status
];

export class ErrorCollector {
  private errors: CollectedError[] = [];
  private readonly page: Page;
  private attached = false;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Attach error listeners to the page.
   * Must be called before navigation.
   */
  attach(): void {
    if (this.attached) return;

    // Console errors (error level only, not warnings)
    this.page.on('console', this.handleConsoleMessage.bind(this));

    // Failed network requests (4xx, 5xx)
    this.page.on('response', this.handleResponse.bind(this));

    // Page crashes / uncaught exceptions
    this.page.on('pageerror', this.handlePageError.bind(this));

    this.attached = true;
  }

  /**
   * Detach error listeners from the page.
   */
  detach(): void {
    if (!this.attached) return;

    this.page.off('console', this.handleConsoleMessage.bind(this));
    this.page.off('response', this.handleResponse.bind(this));
    this.page.off('pageerror', this.handlePageError.bind(this));

    this.attached = false;
  }

  private handleConsoleMessage(msg: ConsoleMessage): void {
    if (msg.type() !== 'error') return;

    const text = msg.text();

    // Skip ignored patterns
    if (this.shouldIgnoreConsoleMessage(text)) return;

    this.errors.push({
      type: 'console',
      message: text,
      timestamp: new Date(),
    });
  }

  private handleResponse(response: Response): void {
    const status = response.status();
    if (status < 400) return;

    const url = response.url();

    // Skip expected 404s for static assets
    if (this.shouldIgnoreUrl(url)) return;

    this.errors.push({
      type: 'network',
      message: `HTTP ${status}`,
      url: url,
      status: status,
      timestamp: new Date(),
    });
  }

  private handlePageError(error: Error): void {
    this.errors.push({
      type: 'uncaught',
      message: error.message,
      timestamp: new Date(),
    });
  }

  private shouldIgnoreUrl(url: string): boolean {
    return IGNORED_URL_PATTERNS.some((pattern) => url.includes(pattern));
  }

  private shouldIgnoreConsoleMessage(message: string): boolean {
    return IGNORED_CONSOLE_PATTERNS.some((pattern) => message.includes(pattern));
  }

  /**
   * Get all collected errors.
   */
  getErrors(): CollectedError[] {
    return [...this.errors];
  }

  /**
   * Get errors filtered by type.
   */
  getErrorsByType(type: ErrorType): CollectedError[] {
    return this.errors.filter((e) => e.type === type);
  }

  /**
   * Get console errors only.
   */
  getConsoleErrors(): CollectedError[] {
    return this.getErrorsByType('console');
  }

  /**
   * Get network errors only.
   */
  getNetworkErrors(): CollectedError[] {
    return this.getErrorsByType('network');
  }

  /**
   * Get uncaught exceptions only.
   */
  getUncaughtErrors(): CollectedError[] {
    return this.getErrorsByType('uncaught');
  }

  /**
   * Clear all collected errors.
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Check if any errors were collected.
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get a formatted summary of all errors.
   */
  getSummary(): string {
    if (!this.hasErrors()) return 'No errors collected';

    const lines: string[] = [];
    for (const error of this.errors) {
      const prefix = `[${error.type.toUpperCase()}]`;
      const url = error.url ? ` (${error.url})` : '';
      lines.push(`${prefix} ${error.message}${url}`);
    }
    return lines.join('\n');
  }
}
