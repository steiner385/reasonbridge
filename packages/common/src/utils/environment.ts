/**
 * Environment detection utilities
 *
 * Provides helpers for detecting demo mode and environment types.
 */

/**
 * Check if the application is running in demo mode
 *
 * Demo mode is determined by:
 * 1. DEMO_MODE environment variable set to 'true'
 * 2. NODE_ENV is 'demo'
 *
 * @returns true if running in demo mode
 */
export function isDemoEnvironment(): boolean {
  const demoMode = process.env['DEMO_MODE'];
  const nodeEnv = process.env['NODE_ENV'];

  return demoMode === 'true' || nodeEnv === 'demo';
}

/**
 * Check if the application is running in production
 *
 * @returns true if running in production
 */
export function isProductionEnvironment(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

/**
 * Check if the application is running in development
 *
 * @returns true if running in development
 */
export function isDevelopmentEnvironment(): boolean {
  return process.env['NODE_ENV'] === 'development' || process.env['NODE_ENV'] === undefined;
}

/**
 * Check if the application is running in test mode
 *
 * @returns true if running in test mode
 */
export function isTestEnvironment(): boolean {
  return process.env['NODE_ENV'] === 'test';
}

/**
 * Get the current environment name
 *
 * @returns The current environment name
 */
export function getEnvironmentName(): string {
  if (isDemoEnvironment()) return 'demo';
  if (isProductionEnvironment()) return 'production';
  if (isTestEnvironment()) return 'test';
  return 'development';
}
