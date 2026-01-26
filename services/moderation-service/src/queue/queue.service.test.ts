import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueService } from './queue.service.js';

// Mock AWS SDK-based publishers/subscribers
vi.mock('@reason-bridge/common', () => ({
  SnsEventPublisher: vi.fn().mockImplementation(() => ({
    publish: vi.fn().mockResolvedValue({ messageId: 'msg-123' }),
  })),
  SqsEventSubscriber: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
  DeadLetterQueueHandler: vi.fn().mockImplementation(() => ({})),
}));

const createMockConfig = (overrides = {}) => ({
  enabled: true,
  awsRegion: 'us-east-1',
  snsTopicArn: 'arn:aws:sns:us-east-1:123456789:moderation-events',
  sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/moderation-queue',
  dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/moderation-dlq',
  serviceName: 'moderation-service',
  maxMessages: 10,
  waitTimeSeconds: 20,
  visibilityTimeout: 60,
  ...overrides,
});

describe('QueueService', () => {
  let service: QueueService;
  let mockConfig: ReturnType<typeof createMockConfig>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = createMockConfig();
    service = new QueueService(mockConfig as any);
  });

  describe('initialize', () => {
    it('should skip initialization if disabled', async () => {
      const disabledConfig = createMockConfig({ enabled: false });
      const disabledService = new QueueService(disabledConfig as any);

      await disabledService.initialize();

      const status = disabledService.getHealthStatus();
      expect(status.publisherReady).toBe(false);
      expect(status.subscriberReady).toBe(false);
    });

    it('should initialize publisher, subscriber, and DLQ handler when enabled', async () => {
      await service.initialize();

      const status = service.getHealthStatus();
      expect(status.publisherReady).toBe(true);
      expect(status.subscriberReady).toBe(true);
      expect(status.dlqHandlerReady).toBe(true);
      expect(status.enabled).toBe(true);
    });

    it('should propagate initialization errors', async () => {
      const { SnsEventPublisher } = await import('@reason-bridge/common');
      (SnsEventPublisher as any).mockImplementationOnce(() => {
        throw new Error('SNS initialization failed');
      });

      const failingService = new QueueService(mockConfig as any);

      await expect(failingService.initialize()).rejects.toThrow('SNS initialization failed');
    });
  });

  describe('publishEvent', () => {
    it('should return empty string if publisher not initialized', async () => {
      const event = {
        id: 'event-1',
        type: 'test.event',
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {},
      };

      const result = await service.publishEvent(event);

      expect(result).toBe('');
    });

    it('should publish event and return messageId', async () => {
      await service.initialize();

      const event = {
        id: 'event-1',
        type: 'moderation.action.requested',
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          targetType: 'response',
          targetId: 'response-1',
        },
      };

      const result = await service.publishEvent(event);

      expect(result).toBe('msg-123');
    });

    it('should propagate publish errors', async () => {
      await service.initialize();

      // Get the internal publisher and make it throw
      const { SnsEventPublisher } = await import('@reason-bridge/common');
      const mockPublisher = { publish: vi.fn().mockRejectedValue(new Error('Publish failed')) };
      (SnsEventPublisher as any).mockImplementation(() => mockPublisher);

      const newService = new QueueService(mockConfig as any);
      await newService.initialize();

      const event = {
        id: 'event-1',
        type: 'test.event',
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {},
      };

      await expect(newService.publishEvent(event)).rejects.toThrow('Publish failed');
    });
  });

  describe('registerEventHandler', () => {
    it('should not register handler if subscriber not initialized', () => {
      const handler = vi.fn();

      service.registerEventHandler('test.event', handler);

      // No error should be thrown, just a warning logged
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register handler with subscriber', async () => {
      await service.initialize();

      const handler = vi.fn();

      // This should succeed without error
      service.registerEventHandler('moderation.action.requested', handler);
    });
  });

  describe('startConsuming', () => {
    it('should not start if subscriber not initialized', async () => {
      // Should complete without error
      await service.startConsuming();
    });

    it('should start subscriber when initialized', async () => {
      await service.initialize();

      await service.startConsuming();
      // No error means success
    });

    it('should propagate start errors', async () => {
      const { SqsEventSubscriber } = await import('@reason-bridge/common');
      const mockSubscriber = {
        on: vi.fn(),
        start: vi.fn().mockRejectedValue(new Error('Start failed')),
        stop: vi.fn(),
      };
      (SqsEventSubscriber as any).mockImplementation(() => mockSubscriber);

      const newService = new QueueService(mockConfig as any);
      await newService.initialize();

      await expect(newService.startConsuming()).rejects.toThrow('Start failed');
    });
  });

  describe('stopConsuming', () => {
    it('should not stop if subscriber not initialized', async () => {
      // Should complete without error
      await service.stopConsuming();
    });

    it('should stop subscriber when initialized', async () => {
      await service.initialize();

      await service.stopConsuming();
      // No error means success
    });

    it('should propagate stop errors', async () => {
      const { SqsEventSubscriber } = await import('@reason-bridge/common');
      const mockSubscriber = {
        on: vi.fn(),
        start: vi.fn(),
        stop: vi.fn().mockRejectedValue(new Error('Stop failed')),
      };
      (SqsEventSubscriber as any).mockImplementation(() => mockSubscriber);

      const newService = new QueueService(mockConfig as any);
      await newService.initialize();

      await expect(newService.stopConsuming()).rejects.toThrow('Stop failed');
    });
  });

  describe('getHealthStatus', () => {
    it('should return not ready status before initialization', () => {
      const status = service.getHealthStatus();

      expect(status.publisherReady).toBe(false);
      expect(status.subscriberReady).toBe(false);
      expect(status.dlqHandlerReady).toBe(false);
      expect(status.enabled).toBe(true);
    });

    it('should return ready status after initialization', async () => {
      await service.initialize();

      const status = service.getHealthStatus();

      expect(status.publisherReady).toBe(true);
      expect(status.subscriberReady).toBe(true);
      expect(status.dlqHandlerReady).toBe(true);
      expect(status.enabled).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return the queue configuration', () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.awsRegion).toBe('us-east-1');
      expect(config.serviceName).toBe('moderation-service');
    });
  });
});
