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
      await page.waitForFunction(
        () => {
          // Check if socket.io client has connected
          // This assumes the socket is stored globally or can be accessed
          const sockets = (window as any).io?.sockets;
          if (sockets && sockets.size > 0) {
            return true;
          }
          return false;
        },
        { timeout: 10000 },
      );

      // Additional wait for connection to stabilize
      await page.waitForTimeout(500);
    },

    /**
     * Emit a Socket.io event to the client by injecting it directly
     */
    async emitEvent(eventName: string, payload: unknown): Promise<void> {
      // Inject the event into the page context
      await page.evaluate(
        ({ event, data }) => {
          // Access the socket.io client instance
          // Socket.io stores socket instances in io.sockets Map
          const sockets = (window as any).io?.sockets;
          if (!sockets) {
            throw new Error('Socket.io client not found');
          }

          // Get the first socket (there should only be one for /notifications namespace)
          const socket = Array.from(sockets.values())[0] as any;
          if (!socket) {
            throw new Error('No socket found');
          }

          // Emit the event on the socket
          // This triggers all registered event listeners
          socket.emit(event, data);
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
      // Remove test mode flag
      await page.evaluate(() => {
        delete (window as any).__wsTestMode;
      });
    },
  };
}
