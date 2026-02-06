/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NestJS module for queue management in moderation service
 */

import { Module } from '@nestjs/common';
import { type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { loadQueueConfig, validateQueueConfig } from './queue.config.js';
import type { QueueConfig } from './queue.config.js';

@Module({
  providers: [
    {
      provide: 'QueueConfig',
      useFactory: () => {
        const config = loadQueueConfig();
        validateQueueConfig(config);
        return config;
      },
    },
    {
      provide: QueueService,
      useFactory: (config: QueueConfig) => new QueueService(config),
      inject: ['QueueConfig'],
    },
  ],
  exports: [QueueService, 'QueueConfig'],
})
export class QueueModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly queueService: QueueService) {}

  /**
   * Initialize queue service and start consuming events on module init
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.queueService.initialize();
      await this.queueService.startConsuming();
    } catch (error) {
      console.error('Failed to initialize QueueModule', error);
      // Don't throw here - allow the service to start without queue if disabled
      if (this.queueService.getConfig().enabled) {
        throw error;
      }
    }
  }

  /**
   * Stop consuming events on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.queueService.stopConsuming();
    } catch (error) {
      console.error('Error stopping QueueModule', error);
    }
  }
}
