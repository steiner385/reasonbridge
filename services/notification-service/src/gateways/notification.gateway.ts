/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import type {
  CommonGroundGeneratedEvent,
  CommonGroundUpdatedEvent,
} from '@reason-bridge/event-schemas/ai';
import type {
  ModerationActionRequestedEvent,
  UserTrustUpdatedEvent,
} from '@reason-bridge/event-schemas/moderation';

/**
 * WebSocket Gateway for real-time notifications
 * Handles Socket.io connections and broadcasts events to subscribed clients
 */
@WebSocketGateway({
  cors: {
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  /**
   * Handle new WebSocket connections
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);

    // TODO: Add authentication validation using JWT from handshake
    // const token = client.handshake.auth.token;
    // Validate token and attach userId to socket
  }

  /**
   * Handle WebSocket disconnections
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to common ground updates for a specific topic
   */
  @SubscribeMessage('subscribe:common-ground')
  async handleSubscribeCommonGround(
    @MessageBody() data: { topicId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { topicId } = data;
    const room = `topic:${topicId}:common-ground`;

    await client.join(room);
    this.logger.log(`Client ${client.id} subscribed to common ground updates for topic ${topicId}`);

    client.emit('subscription:confirmed', {
      type: 'common-ground',
      topicId,
      room,
    });
  }

  /**
   * Unsubscribe from common ground updates for a specific topic
   */
  @SubscribeMessage('unsubscribe:common-ground')
  async handleUnsubscribeCommonGround(
    @MessageBody() data: { topicId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { topicId } = data;
    const room = `topic:${topicId}:common-ground`;

    await client.leave(room);
    this.logger.log(
      `Client ${client.id} unsubscribed from common ground updates for topic ${topicId}`,
    );

    client.emit('unsubscription:confirmed', {
      type: 'common-ground',
      topicId,
      room,
    });
  }

  /**
   * Broadcast common ground generated event to subscribed clients
   * Called by CommonGroundNotificationHandler when event is received
   */
  emitCommonGroundGenerated(event: CommonGroundGeneratedEvent): void {
    const room = `topic:${event.payload.topicId}:common-ground`;

    this.server.to(room).emit('common-ground:generated', {
      topicId: event.payload.topicId,
      version: event.payload.version,
      analysis: {
        agreementZones: event.payload.agreementZones,
        misunderstandings: event.payload.misunderstandings,
        genuineDisagreements: event.payload.genuineDisagreements,
        overallConsensusScore: event.payload.overallConsensusScore,
      },
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Broadcasted common-ground.generated event for topic ${event.payload.topicId} to room ${room}`,
    );
  }

  /**
   * Broadcast common ground updated event to subscribed clients
   * Called by CommonGroundNotificationHandler when event is received
   */
  emitCommonGroundUpdated(event: CommonGroundUpdatedEvent): void {
    const room = `topic:${event.payload.topicId}:common-ground`;

    this.server.to(room).emit('common-ground:updated', {
      topicId: event.payload.topicId,
      previousVersion: event.payload.previousVersion,
      newVersion: event.payload.newVersion,
      changes: event.payload.changes,
      analysis: {
        agreementZones: event.payload.newAnalysis.agreementZones,
        misunderstandings: event.payload.newAnalysis.misunderstandings,
        genuineDisagreements: event.payload.newAnalysis.genuineDisagreements,
        overallConsensusScore: event.payload.newAnalysis.overallConsensusScore,
      },
      reason: event.payload.reason,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Broadcasted common-ground.updated event for topic ${event.payload.topicId} to room ${room}`,
    );
  }

  /**
   * Subscribe to moderation action updates
   */
  @SubscribeMessage('subscribe:moderation')
  async handleSubscribeModeration(
    @MessageBody() data: Record<string, any>,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const room = 'moderation:actions';

    await client.join(room);
    this.logger.log(`Client ${client.id} subscribed to moderation updates`);

    client.emit('subscription:confirmed', {
      type: 'moderation',
      room,
    });
  }

  /**
   * Unsubscribe from moderation action updates
   */
  @SubscribeMessage('unsubscribe:moderation')
  async handleUnsubscribeModeration(
    @MessageBody() _data: Record<string, any>,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const room = 'moderation:actions';

    await client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from moderation updates`);

    client.emit('unsubscription:confirmed', {
      type: 'moderation',
      room,
    });
  }

  /**
   * Broadcast moderation action requested event to subscribed clients
   * Called by ModerationNotificationHandler when event is received
   */
  emitModerationActionRequested(event: ModerationActionRequestedEvent): void {
    const room = 'moderation:actions';

    this.server.to(room).emit('moderation:action-requested', {
      targetType: event.payload.targetType,
      targetId: event.payload.targetId,
      actionType: event.payload.actionType,
      severity: event.payload.severity,
      reasoning: event.payload.reasoning,
      aiConfidence: event.payload.aiConfidence,
      violationContext: event.payload.violationContext,
      requestedAt: event.payload.requestedAt,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Broadcasted moderation.action.requested event for ${event.payload.targetType} ${event.payload.targetId} to room ${room}`,
    );
  }

  /**
   * Subscribe to trust updates for a specific user
   */
  @SubscribeMessage('subscribe:trust-updates')
  async handleSubscribeTrustUpdates(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { userId } = data;
    const room = `user:${userId}:trust`;

    await client.join(room);
    this.logger.log(`Client ${client.id} subscribed to trust updates for user ${userId}`);

    client.emit('subscription:confirmed', {
      type: 'trust-updates',
      userId,
      room,
    });
  }

  /**
   * Unsubscribe from trust updates for a specific user
   */
  @SubscribeMessage('unsubscribe:trust-updates')
  async handleUnsubscribeTrustUpdates(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { userId } = data;
    const room = `user:${userId}:trust`;

    await client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from trust updates for user ${userId}`);

    client.emit('unsubscription:confirmed', {
      type: 'trust-updates',
      userId,
      room,
    });
  }

  /**
   * Broadcast user trust updated event to subscribed clients
   * Called by ModerationNotificationHandler when event is received
   */
  emitUserTrustUpdated(event: UserTrustUpdatedEvent): void {
    const room = `user:${event.payload.userId}:trust`;

    this.server.to(room).emit('user:trust-updated', {
      userId: event.payload.userId,
      reason: event.payload.reason,
      previousScores: event.payload.previousScores,
      newScores: event.payload.newScores,
      moderationActionId: event.payload.moderationActionId,
      updatedAt: event.payload.updatedAt,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Broadcasted user.trust.updated event for user ${event.payload.userId} to room ${room}`,
    );
  }
}
