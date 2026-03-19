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
import { Logger, Injectable, Optional } from '@nestjs/common';
import type {
  CommonGroundGeneratedEvent,
  CommonGroundUpdatedEvent,
} from '@reason-bridge/event-schemas/ai';
import type {
  ModerationActionRequestedEvent,
  UserTrustUpdatedEvent,
  SafetyReportCreatedEvent,
} from '@reason-bridge/event-schemas/moderation';
import { JwtVerificationService, type JwtPayload } from '../auth/jwt-verification.service.js';

/**
 * Extended Socket interface with user data from JWT validation
 */
interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
  userId?: string;
}

/**
 * WebSocket Gateway for real-time notifications
 * Handles Socket.io connections and broadcasts events to subscribed clients
 *
 * @remarks
 * All connections are authenticated via JWT from the handshake auth object.
 * Unauthenticated connections are allowed but limited to public subscriptions.
 * Authenticated connections have access to personalized notifications.
 */
@Injectable()
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

  constructor(@Optional() private readonly jwtVerificationService?: JwtVerificationService) {}

  /**
   * Handle new WebSocket connections
   * Validates JWT from handshake auth and attaches user info to socket
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    this.logger.log(`Client connected: ${client.id}`);

    // Extract token from handshake auth
    const token = client.handshake.auth?.['token'] as string | undefined;

    if (token && this.jwtVerificationService) {
      try {
        const payload = await this.jwtVerificationService.verifyToken(token);

        if (payload) {
          // Attach user info to socket for use in subscription handlers
          client.user = payload;
          client.userId = payload.userId ?? payload.sub;
          this.logger.log(`Client ${client.id} authenticated as user ${client.userId}`);

          // Emit authentication success
          client.emit('auth:success', {
            userId: client.userId,
            message: 'Authentication successful',
          });
        } else {
          this.logger.warn(`Client ${client.id} provided invalid token`);
          client.emit('auth:failed', {
            message: 'Invalid or expired token',
          });
          // Don't disconnect - allow unauthenticated access to public subscriptions
        }
      } catch (error) {
        this.logger.error(`Error validating token for client ${client.id}:`, error);
        client.emit('auth:failed', {
          message: 'Token validation error',
        });
      }
    } else if (!token) {
      this.logger.debug(`Client ${client.id} connected without authentication token`);
      // Allow unauthenticated connections for public subscriptions (e.g., topic updates)
    }
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
   * Requires authentication - moderators and admins only
   */
  @SubscribeMessage('subscribe:moderation')
  async handleSubscribeModeration(
    @MessageBody() _data: Record<string, any>,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    // Require authentication for moderation updates
    if (!client.userId) {
      this.logger.warn(
        `Client ${client.id} attempted to subscribe to moderation updates without authentication`,
      );
      client.emit('subscription:error', {
        type: 'moderation',
        message: 'Authentication required for moderation updates',
      });
      return;
    }

    // Note: Role-based authorization should be checked here
    // For now, we allow all authenticated users (role check can be added later with Prisma lookup)

    const room = 'moderation:actions';

    await client.join(room);
    this.logger.log(`Client ${client.id} (user ${client.userId}) subscribed to moderation updates`);

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

  /**
   * Subscribe to personal notifications for a specific user
   * Requires authentication - only allows subscription to the authenticated user's own notifications
   */
  @SubscribeMessage('subscribe:personal')
  async handleSubscribePersonal(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const { userId } = data;

    // Require authentication for personal notifications
    if (!client.userId) {
      this.logger.warn(
        `Client ${client.id} attempted to subscribe to personal notifications without authentication`,
      );
      client.emit('subscription:error', {
        type: 'personal',
        message: 'Authentication required for personal notifications',
      });
      return;
    }

    // Ensure users can only subscribe to their own notifications
    if (client.userId !== userId) {
      this.logger.warn(
        `Client ${client.id} (user ${client.userId}) attempted to subscribe to notifications for different user ${userId}`,
      );
      client.emit('subscription:error', {
        type: 'personal',
        message: "Cannot subscribe to another user's notifications",
      });
      return;
    }

    const room = `user:${userId}:notifications`;

    await client.join(room);
    this.logger.log(`Client ${client.id} subscribed to personal notifications for user ${userId}`);

    client.emit('subscription:confirmed', {
      type: 'personal',
      userId,
      room,
    });
  }

  /**
   * Unsubscribe from personal notifications
   */
  @SubscribeMessage('unsubscribe:personal')
  async handleUnsubscribePersonal(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { userId } = data;
    const room = `user:${userId}:notifications`;

    await client.leave(room);
    this.logger.log(
      `Client ${client.id} unsubscribed from personal notifications for user ${userId}`,
    );

    client.emit('unsubscription:confirmed', {
      type: 'personal',
      userId,
      room,
    });
  }

  /**
   * Emit an event to a specific user's notification room
   * Used by handlers to send personalized notifications
   */
  emitToUser(userId: string, eventType: string, payload: Record<string, unknown>): void {
    const room = `user:${userId}:notifications`;

    this.server.to(room).emit(eventType, {
      ...payload,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Emitted ${eventType} to user ${userId} in room ${room}`);
  }

  /**
   * Subscribe to safety report notifications (for moderators)
   * Used to receive real-time alerts when children submit panic button reports
   * Requires authentication - should be limited to moderators/admins
   */
  @SubscribeMessage('subscribe:safety-reports')
  async handleSubscribeSafetyReports(
    @MessageBody() _data: Record<string, unknown>,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    // Require authentication for safety report notifications
    if (!client.userId) {
      this.logger.warn(
        `Client ${client.id} attempted to subscribe to safety reports without authentication`,
      );
      client.emit('subscription:error', {
        type: 'safety-reports',
        message: 'Authentication required for safety report notifications',
      });
      return;
    }

    // Note: Role-based authorization should be checked here (MODERATOR or ADMIN)
    // For now, we allow all authenticated users (role check can be added later with Prisma lookup)

    const room = 'safety:reports';

    await client.join(room);
    this.logger.log(
      `Client ${client.id} (user ${client.userId}) subscribed to safety report notifications`,
    );

    client.emit('subscription:confirmed', {
      type: 'safety-reports',
      room,
    });
  }

  /**
   * Unsubscribe from safety report notifications
   */
  @SubscribeMessage('unsubscribe:safety-reports')
  async handleUnsubscribeSafetyReports(
    @MessageBody() _data: Record<string, unknown>,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const room = 'safety:reports';

    await client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from safety report notifications`);

    client.emit('unsubscription:confirmed', {
      type: 'safety-reports',
      room,
    });
  }

  /**
   * Broadcast safety report created event to subscribed moderators
   * Called by SafetyReportNotificationHandler when a child submits a panic button report
   *
   * @remarks
   * URGENT and HIGH priority reports trigger immediate notifications to ensure
   * rapid moderator response for child safety incidents.
   */
  emitSafetyReportCreated(event: SafetyReportCreatedEvent): void {
    const room = 'safety:reports';

    this.server.to(room).emit('safety:report-created', {
      reportId: event.payload.reportId,
      reporterId: event.payload.reporterId,
      reason: event.payload.reason,
      priority: event.payload.priority,
      additionalInfo: event.payload.additionalInfo,
      contextUrl: event.payload.contextUrl,
      contextTopicId: event.payload.contextTopicId,
      contextResponseId: event.payload.contextResponseId,
      createdAt: event.payload.createdAt,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Broadcasted safety.report.created event (priority: ${event.payload.priority}) for report ${event.payload.reportId} to room ${room}`,
    );
  }
}
