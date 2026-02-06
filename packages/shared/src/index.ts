/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared utilities and constants for ReasonBridge
 */

// Export shared utilities and types
export const SHARED_CONSTANTS = {
  VERSION: '0.1.0',
  APP_NAME: 'ReasonBridge',
};

export function getVersionInfo(): string {
  return `${SHARED_CONSTANTS.APP_NAME} v${SHARED_CONSTANTS.VERSION}`;
}

// Export tracing module
export * from './tracing/index.js';
