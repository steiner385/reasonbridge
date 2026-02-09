/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Page } from '@playwright/test';

/**
 * WebSocket mock interface for E2E tests
 */
export interface WebSocketMock {
  /**
   * Wait for WebSocket connection to establish
   * @param namespace - Optional namespace to wait for (default: '/notifications')
   */
  waitForConnection(namespace?: string): Promise<void>;

  /**
   * Emit a Socket.io event to the client
   * @param eventName - Name of the event
   * @param payload - Event payload
   */
  emitEvent(eventName: string, payload: unknown): Promise<void>;

  /**
   * Emit common-ground:generated event
   * @param topicId - Topic ID
   * @param analysis - Common ground analysis data
   */
  emitCommonGroundGenerated(topicId: string, analysis: any): Promise<void>;

  /**
   * Emit common-ground:updated event
   * @param topicId - Topic ID
   * @param analysis - Updated common ground analysis data
   */
  emitCommonGroundUpdated(topicId: string, analysis: any): Promise<void>;

  /**
   * Cleanup and disconnect mock
   */
  cleanup(): Promise<void>;
}

/**
 * Setup WebSocket mock for Playwright E2E tests
 * Injects events directly into the page's Socket.io client
 *
 * @param page - Playwright page instance
 * @returns WebSocketMock instance
 *
 * @example
 * ```typescript
 * const wsMock = await setupWebSocketMock(page);
 * await wsMock.waitForConnection();
 * await wsMock.emitCommonGroundUpdated(topicId, analysis);
 * await wsMock.cleanup();
 * ```
 */
export async function setupWebSocketMock(page: Page): Promise<WebSocketMock> {
  // Inject a global flag to signal the mock is active
  await page.evaluate(() => {
    (window as any).__wsTestMode = true;
  });

  return {
    /**
     * Wait for WebSocket connection to establish
     */
    async waitForConnection(_namespace: string = '/notifications'): Promise<void> {
      // Poll for socket existence in the page context
      // The useCommonGroundUpdates hook exposes socket as window.__testSocket when __wsTestMode is true
      await page.waitForFunction(
        () => {
          const socket = (window as any).__testSocket;
          return socket && socket.connected;
        },
        { timeout: 30000 }, // Increased timeout for Docker cold starts
      );

      // Additional wait for connection to stabilize
      await page.waitForTimeout(500);
    },

    /**
     * Emit a Socket.io event to the client by injecting it directly
     */
    async emitEvent(eventName: string, payload: unknown): Promise<void> {
      // Inject the event into the page context using the exposed test socket
      await page.evaluate(
        ({ event, data }) => {
          const socket = (window as any).__testSocket;
          if (!socket) {
            throw new Error('Test socket not found - ensure __wsTestMode is set before navigation');
          }

          // Simulate receiving an event FROM the server by triggering registered listeners
          // Socket.io client stores event listeners in _callbacks with $ prefix
          const listeners = socket._callbacks?.[`$${event}`];
          if (listeners) {
            listeners.forEach((listener: Function) => listener(data));
          }
        },
        { event: eventName, data: payload },
      );

      // Small delay to allow React to process the event
      await page.waitForTimeout(100);
    },

    /**
     * Emit common-ground:generated event
     */
    async emitCommonGroundGenerated(topicId: string, analysis: any): Promise<void> {
      const payload = {
        topicId,
        version: 1,
        analysis,
        timestamp: new Date().toISOString(),
      };

      await this.emitEvent('common-ground:generated', payload);
    },

    /**
     * Emit common-ground:updated event
     */
    async emitCommonGroundUpdated(topicId: string, analysis: any): Promise<void> {
      const payload = {
        topicId,
        previousVersion: 1,
        newVersion: 2,
        changes: {
          newAgreementZones: 1,
          resolvedMisunderstandings: 0,
          newMisunderstandings: 0,
          newDisagreements: 1,
          consensusScoreChange: 0.05,
        },
        analysis,
        reason: 'threshold_reached' as const,
        timestamp: new Date().toISOString(),
      };

      await this.emitEvent('common-ground:updated', payload);
    },

    /**
     * Cleanup and disconnect mock
     */
    async cleanup(): Promise<void> {
      // Remove test mode flag and test socket reference
      await page.evaluate(() => {
        delete (window as any).__wsTestMode;
        delete (window as any).__testSocket;
      });
    },
  };
}
