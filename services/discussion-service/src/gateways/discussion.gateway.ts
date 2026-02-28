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
import { Logger, Injectable } from '@nestjs/common';
import type {
  UserTypingPayload,
  ReactionAddedPayload,
  ReactionRemovedPayload,
} from '@reason-bridge/event-schemas';

/**
 * WebSocket Gateway for real-time discussion updates
 * Handles typing indicators and reaction events
 *
 * @remarks
 * - Clients subscribe to topic rooms to receive updates
 * - Typing indicators are broadcast to all clients in the topic room except the sender
 * - Reaction events are broadcast to all clients in the topic room
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/discussions',
})
export class DiscussionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DiscussionGateway.name);

  /**
   * Handle new WebSocket connections
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle WebSocket disconnections
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to updates for a specific topic
   */
  @SubscribeMessage('subscribe:topic')
  async handleSubscribeTopic(
    @MessageBody() data: { topicId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { topicId } = data;
    const room = `topic:${topicId}`;

    await client.join(room);
    this.logger.log(`Client ${client.id} subscribed to topic ${topicId}`);

    client.emit('subscription:confirmed', {
      type: 'topic',
      topicId,
      room,
    });
  }

  /**
   * Unsubscribe from updates for a specific topic
   */
  @SubscribeMessage('unsubscribe:topic')
  async handleUnsubscribeTopic(
    @MessageBody() data: { topicId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { topicId } = data;
    const room = `topic:${topicId}`;

    await client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from topic ${topicId}`);

    client.emit('unsubscription:confirmed', {
      type: 'topic',
      topicId,
      room,
    });
  }

  /**
   * Handle user typing indicator from client
   * Broadcasts to all other clients in the topic room
   */
  @SubscribeMessage('user:typing')
  handleUserTyping(
    @MessageBody() data: UserTypingPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `topic:${data.topicId}`;

    // Broadcast to all clients in the room except the sender
    client.to(room).emit('user:typing', {
      type: 'USER_TYPING',
      payload: data,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `User ${data.userName} ${data.isTyping ? 'started' : 'stopped'} typing in topic ${data.topicId}`,
    );
  }

  /**
   * Broadcast a reaction added event to all clients in the topic room
   * Called by ReactionsService when a reaction is added
   *
   * @param topicId - The topic ID (used to determine the room)
   * @param payload - The reaction added payload
   */
  emitReactionAdded(topicId: string, payload: ReactionAddedPayload): void {
    const room = `topic:${topicId}`;

    this.server.to(room).emit('reaction:added', {
      type: 'REACTION_ADDED',
      payload,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Broadcasted reaction.added event for response ${payload.responseId} to room ${room}`,
    );
  }

  /**
   * Broadcast a reaction removed event to all clients in the topic room
   * Called by ReactionsService when a reaction is removed
   *
   * @param topicId - The topic ID (used to determine the room)
   * @param payload - The reaction removed payload
   */
  emitReactionRemoved(topicId: string, payload: ReactionRemovedPayload): void {
    const room = `topic:${topicId}`;

    this.server.to(room).emit('reaction:removed', {
      type: 'REACTION_REMOVED',
      payload,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Broadcasted reaction.removed event for response ${payload.responseId} to room ${room}`,
    );
  }

  /**
   * Broadcast a typing indicator event to all clients in the topic room
   * Can be called programmatically (e.g., from a service)
   *
   * @param payload - The user typing payload
   */
  emitUserTyping(payload: UserTypingPayload): void {
    const room = `topic:${payload.topicId}`;

    this.server.to(room).emit('user:typing', {
      type: 'USER_TYPING',
      payload,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Broadcasted user.typing event for user ${payload.userName} to room ${room}`);
  }
}
