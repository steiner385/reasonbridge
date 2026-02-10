/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { CommonGroundAnalysis } from '../types/common-ground';

/**
 * WebSocket event payload for common ground generated
 */
interface CommonGroundGeneratedPayload {
  topicId: string;
  version: number;
  analysis: {
    agreementZones: CommonGroundAnalysis['agreementZones'];
    misunderstandings: CommonGroundAnalysis['misunderstandings'];
    genuineDisagreements: CommonGroundAnalysis['disagreements'];
    overallConsensusScore?: number;
  };
  timestamp: string;
}

/**
 * WebSocket event payload for common ground updated
 */
interface CommonGroundUpdatedPayload {
  topicId: string;
  previousVersion: number;
  newVersion: number;
  changes: {
    newAgreementZones: number;
    resolvedMisunderstandings: number;
    newMisunderstandings: number;
    newDisagreements: number;
    consensusScoreChange?: number;
  };
  analysis: {
    agreementZones: CommonGroundAnalysis['agreementZones'];
    misunderstandings: CommonGroundAnalysis['misunderstandings'];
    genuineDisagreements: CommonGroundAnalysis['disagreements'];
    overallConsensusScore?: number;
  };
  reason: 'threshold_reached' | 'time_elapsed';
  timestamp: string;
}

/**
 * Callback function for common ground updates
 */
export type CommonGroundUpdateCallback = (
  analysis: CommonGroundAnalysis,
  isUpdate: boolean,
) => void;

/**
 * Options for useCommonGroundUpdates hook
 */
interface UseCommonGroundUpdatesOptions {
  /**
   * The topic ID to subscribe to
   */
  topicId: string;
  /**
   * Callback when common ground analysis is generated or updated
   */
  onUpdate: CommonGroundUpdateCallback;
  /**
   * Whether to enable the WebSocket connection
   * @default true
   */
  enabled?: boolean;
}

/**
 * Return type for useCommonGroundUpdates hook
 */
interface UseCommonGroundUpdatesReturn {
  /**
   * Whether the WebSocket is currently connected
   */
  isConnected: boolean;
  /**
   * The socket ref (access .current for the socket instance)
   */
  socketRef: React.RefObject<Socket | null>;
}

/**
 * Hook for subscribing to real-time common ground updates via WebSocket
 *
 * @example
 * ```tsx
 * const { isConnected } = useCommonGroundUpdates({
 *   topicId: '123',
 *   onUpdate: (analysis, isUpdate) => {
 *     setAnalysis(analysis);
 *   },
 * });
 * ```
 */
export function useCommonGroundUpdates({
  topicId,
  onUpdate,
  enabled = true,
}: UseCommonGroundUpdatesOptions): UseCommonGroundUpdatesReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  /**
   * Transform WebSocket payload to CommonGroundAnalysis
   */
  const transformPayload = useCallback(
    (
      payload: CommonGroundGeneratedPayload | CommonGroundUpdatedPayload,
      version: number,
    ): CommonGroundAnalysis => {
      return {
        id: `${topicId}-v${version}`,
        discussionId: topicId,
        agreementZones: payload.analysis.agreementZones,
        misunderstandings: payload.analysis.misunderstandings,
        disagreements: payload.analysis.genuineDisagreements,
        lastUpdated: payload.timestamp,
        participantCount: 0, // Not provided in WebSocket payload
        overallConsensusScore: payload.analysis.overallConsensusScore || 0,
      };
    },
    [topicId],
  );

  useEffect(() => {
    if (!enabled || !topicId) {
      return;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // Check if we're in E2E test mode with a mock socket
    const isTestMode = (window as any).__wsTestMode === true;
    const mockSocket = (window as any).__testSocket;

    let socket: Socket | typeof mockSocket;
    let usingMockSocket = false;

    if (isTestMode && mockSocket) {
      // Use the mock socket from E2E tests - don't create a real connection
      socket = mockSocket;
      usingMockSocket = true;
      // Schedule the state update for after the effect completes to avoid cascading renders
      queueMicrotask(() => setIsConnected(true));
    } else {
      // Use same-origin for WebSocket (nginx proxies /socket.io/)
      const wsUrl = import.meta.env['VITE_NOTIFICATION_SERVICE_URL'] || '';

      // Create Socket.io connection
      socket = io(`${wsUrl}/notifications`, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });
    }

    socketRef.current = socket as Socket;

    // Handle connection (only for real sockets)
    if (!usingMockSocket) {
      socket.on('connect', () => {
        setIsConnected(true);

        // Subscribe to common ground updates for this topic
        socket.emit('subscribe:common-ground', { topicId });
      });
    }

    // Handle subscription confirmation
    socket.on('subscription:confirmed', () => {
      // Subscription confirmed
    });

    // Handle common ground generated event
    socket.on('common-ground:generated', (payload: CommonGroundGeneratedPayload) => {
      const analysis = transformPayload(payload, payload.version);
      onUpdate(analysis, false);
    });

    // Handle common ground updated event
    socket.on('common-ground:updated', (payload: CommonGroundUpdatedPayload) => {
      const analysis = transformPayload(payload, payload.newVersion);
      onUpdate(analysis, true);
    });

    // Handle disconnection (only for real sockets)
    if (!usingMockSocket) {
      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      // Handle connection errors
      socket.on('connect_error', (error: Error) => {
        console.error('[useCommonGroundUpdates] Connection error:', error);
        setIsConnected(false);
      });
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Cleanup on unmount
    return () => {
      if (socketRef.current && !usingMockSocket) {
        // Only cleanup real sockets - mock sockets are managed by the test
        socketRef.current.emit('unsubscribe:common-ground', { topicId });
        socketRef.current.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [topicId, enabled, onUpdate, transformPayload]);

  return {
    /**
     * Whether the WebSocket is currently connected
     */
    isConnected,
    /**
     * The socket ref (access .current for the socket instance)
     * @example
     * const { socketRef } = useCommonGroundUpdates(...);
     * if (socketRef.current) {
     *   socketRef.current.emit('customEvent', data);
     * }
     */
    socketRef,
  };
}
