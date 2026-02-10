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
  emitCommonGroundGenerated(topicId: string, analysis: unknown): Promise<void>;

  /**
   * Emit common-ground:updated event
   * @param topicId - Topic ID
   * @param analysis - Updated common ground analysis data
   */
  emitCommonGroundUpdated(topicId: string, analysis: unknown): Promise<void>;

  /**
   * Cleanup and disconnect mock
   */
  cleanup(): Promise<void>;
}

/**
 * Setup WebSocket mock for Playwright E2E tests
 * Creates a fake Socket.io client that bypasses the real WebSocket server.
 * This is necessary because the E2E environment may not have a WebSocket server running.
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
  // Inject mock mode flag and create a mock socket object BEFORE the app connects
  // This allows us to bypass the real WebSocket server entirely
  await page.addInitScript(() => {
    // Mark test mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__wsTestMode = true;

    // Create a mock socket that mimics Socket.io client API
    const mockSocket = {
      connected: true,
      id: 'mock-socket-id',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _callbacks: {} as Record<string, ((...args: any[]) => void)[]>,

      // Socket.io on() method to register event listeners
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on(event: string, callback: (...args: any[]) => void) {
        const key = `$${event}`;
        if (!this._callbacks[key]) {
          this._callbacks[key] = [];
        }
        this._callbacks[key].push(callback);
        return this;
      },

      // Socket.io emit() method (for client -> server, no-op in mock)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      emit(_event: string, _data?: any) {
        return this;
      },

      // Socket.io off() method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off(event: string, callback?: (...args: any[]) => void) {
        const key = `$${event}`;
        if (callback && this._callbacks[key]) {
          this._callbacks[key] = this._callbacks[key].filter((cb) => cb !== callback);
        } else {
          delete this._callbacks[key];
        }
        return this;
      },

      // Disconnect method (no-op in mock)
      disconnect() {
        this.connected = false;
        return this;
      },
    };

    // Expose the mock socket for tests to inject events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__testSocket = mockSocket;

    // Also expose a function to trigger 'connect' event after hook subscribes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__triggerSocketConnect = () => {
      const listeners = mockSocket._callbacks['$connect'];
      if (listeners) {
        listeners.forEach((fn) => fn());
      }
    };
  });

  return {
    /**
     * Wait for WebSocket connection to establish (mock is instant)
     */
    async waitForConnection(_namespace: string = '/notifications'): Promise<void> {
      // Wait for the mock socket to be available (set by addInitScript)
      await page.waitForFunction(
        () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const socket = (window as any).__testSocket;
          return socket && socket.connected;
        },
        { timeout: 10000 },
      );

      // Trigger the connect event so any listeners are notified
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).__triggerSocketConnect) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__triggerSocketConnect();
        }
      });

      // Small wait for React to process
      await page.waitForTimeout(100);
    },

    /**
     * Emit a Socket.io event to the client by triggering registered listeners
     */
    async emitEvent(eventName: string, payload: unknown): Promise<void> {
      await page.evaluate(
        ({ event, data }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const socket = (window as any).__testSocket;
          if (!socket) {
            throw new Error('Test socket not found - ensure setupWebSocketMock was called');
          }

          // Trigger all registered listeners for this event
          const listeners = socket._callbacks?.[`$${event}`];
          if (listeners) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            listeners.forEach((listener: any) => listener(data));
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
    async emitCommonGroundGenerated(topicId: string, analysis: unknown): Promise<void> {
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
    async emitCommonGroundUpdated(topicId: string, analysis: unknown): Promise<void> {
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
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).__wsTestMode;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).__testSocket;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).__triggerSocketConnect;
      });
    },
  };
}
