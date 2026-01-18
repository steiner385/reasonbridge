import { useEffect, useRef, useCallback } from 'react';
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
   * The socket instance (for advanced usage)
   */
  socket: Socket | null;
}

/**
 * Hook for subscribing to real-time common ground updates via WebSocket
 *
 * @example
 * ```tsx
 * const { isConnected } = useCommonGroundUpdates({
 *   topicId: '123',
 *   onUpdate: (analysis, isUpdate) => {
 *     console.log('Common ground updated:', analysis);
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
  const isConnectedRef = useRef(false);

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

    // Get WebSocket URL from environment or use default
    const wsUrl =
      import.meta.env['VITE_NOTIFICATION_SERVICE_URL'] || 'http://localhost:3003';

    // Create Socket.io connection
    const socket = io(`${wsUrl}/notifications`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Handle connection
    socket.on('connect', () => {
      console.log('[useCommonGroundUpdates] Connected to WebSocket server');
      isConnectedRef.current = true;

      // Subscribe to common ground updates for this topic
      socket.emit('subscribe:common-ground', { topicId });
    });

    // Handle subscription confirmation
    socket.on('subscription:confirmed', (data: { type: string; topicId: string; room: string }) => {
      console.log('[useCommonGroundUpdates] Subscription confirmed:', data);
    });

    // Handle common ground generated event
    socket.on('common-ground:generated', (payload: CommonGroundGeneratedPayload) => {
      console.log('[useCommonGroundUpdates] Common ground generated:', payload);

      const analysis = transformPayload(payload, payload.version);
      onUpdate(analysis, false);
    });

    // Handle common ground updated event
    socket.on('common-ground:updated', (payload: CommonGroundUpdatedPayload) => {
      console.log('[useCommonGroundUpdates] Common ground updated:', payload);

      const analysis = transformPayload(payload, payload.newVersion);
      onUpdate(analysis, true);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('[useCommonGroundUpdates] Disconnected from WebSocket server:', reason);
      isConnectedRef.current = false;
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('[useCommonGroundUpdates] Connection error:', error);
      isConnectedRef.current = false;
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        // Unsubscribe from common ground updates
        socketRef.current.emit('unsubscribe:common-ground', { topicId });

        // Disconnect socket
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnectedRef.current = false;

        console.log('[useCommonGroundUpdates] Cleanup: Disconnected from WebSocket server');
      }
    };
  }, [topicId, enabled, onUpdate, transformPayload]);

  return {
    /**
     * Whether the WebSocket is currently connected
     */
    isConnected: isConnectedRef.current,
    /**
     * The socket instance (for advanced usage)
     */
    socket: socketRef.current,
  };
}
