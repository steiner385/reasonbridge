/**
 * Shared utilities and constants for Unite Discord
 */

// Export shared utilities and types
export const SHARED_CONSTANTS = {
  VERSION: '0.1.0',
  APP_NAME: 'Unite Discord',
};

export function getVersionInfo(): string {
  return `${SHARED_CONSTANTS.APP_NAME} v${SHARED_CONSTANTS.VERSION}`;
}
