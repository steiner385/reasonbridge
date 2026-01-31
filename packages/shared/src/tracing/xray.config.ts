/**
 * AWS X-Ray Tracing Configuration
 *
 * This module provides X-Ray distributed tracing configuration for all services.
 * X-Ray enables end-to-end request tracing across the microservices architecture.
 *
 * ## Prerequisites
 *
 * 1. AWS X-Ray Daemon running locally or in the deployment environment
 *    - Local: `docker run -d --name xray-daemon -p 2000:2000/udp amazon/aws-xray-daemon`
 *    - ECS: Use the X-Ray daemon sidecar container
 *
 * 2. AWS credentials with X-Ray permissions:
 *    - xray:PutTraceSegments
 *    - xray:PutTelemetryRecords
 *
 * 3. Install required packages in each service:
 *    ```bash
 *    pnpm add aws-xray-sdk-core aws-xray-sdk-express
 *    ```
 *
 * ## Usage
 *
 * ```typescript
 * // In main.ts (before any other imports)
 * import { initXRay } from '@reason-bridge/shared/tracing';
 *
 * initXRay({
 *   serviceName: 'api-gateway',
 *   daemonAddress: process.env.XRAY_DAEMON_ADDRESS || 'localhost:2000',
 * });
 *
 * // Then import everything else
 * import { NestFactory } from '@nestjs/core';
 * ```
 *
 * ## Tracing HTTP Calls
 *
 * The X-Ray SDK automatically captures:
 * - Outbound HTTP/HTTPS requests (when using captured http module)
 * - AWS SDK calls
 * - Database queries (with appropriate driver instrumentation)
 *
 * ## Annotations and Metadata
 *
 * Add annotations for filtering in the X-Ray console:
 * ```typescript
 * import { addAnnotation, addMetadata } from '@reason-bridge/shared/tracing';
 *
 * addAnnotation('userId', userId);
 * addMetadata('requestBody', body);
 * ```
 */

/**
 * X-Ray configuration options
 */
export interface XRayConfig {
  /** Service name for identification in X-Ray console */
  serviceName: string;
  /** X-Ray daemon address (default: localhost:2000) */
  daemonAddress?: string;
  /** Enable/disable X-Ray (default: true in production) */
  enabled?: boolean;
  /** Sampling rules (default: all requests) */
  samplingRules?: SamplingRule[];
}

/**
 * X-Ray sampling rule for controlling which requests are traced
 */
export interface SamplingRule {
  /** Rule name */
  name: string;
  /** URL pattern to match */
  urlPath: string;
  /** HTTP method (GET, POST, etc. or * for all) */
  httpMethod: string;
  /** Sampling rate (0.0 to 1.0) */
  rate: number;
}

/**
 * Default sampling rules - traces all requests by default
 */
export const DEFAULT_SAMPLING_RULES: SamplingRule[] = [
  {
    name: 'Default',
    urlPath: '*',
    httpMethod: '*',
    rate: 1.0,
  },
];

/**
 * Initialize X-Ray tracing
 *
 * IMPORTANT: Call this function BEFORE any other imports in main.ts
 * X-Ray needs to patch modules before they are loaded.
 *
 * @param config X-Ray configuration options
 * @returns true if X-Ray was initialized, false if disabled
 */
export function initXRay(config: XRayConfig): boolean {
  const enabled = config.enabled ?? process.env['NODE_ENV'] === 'production';

  if (!enabled) {
    // X-Ray disabled - no action needed
    return false;
  }

  // Dynamic import to avoid issues when X-Ray SDK is not installed
  // This will be implemented when aws-xray-sdk-core is added as a dependency
  // To enable X-Ray:
  // 1. Install: pnpm add aws-xray-sdk-core
  // 2. Configure AWS credentials
  // 3. Run X-Ray daemon
  // 4. Uncomment implementation below

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _serviceName = config.serviceName;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _daemonAddress = config.daemonAddress ?? 'localhost:2000';

  return false;
}

/**
 * Add an annotation to the current segment
 * Annotations are indexed and searchable in the X-Ray console
 *
 * @param key Annotation key (limited to alphanumeric + underscore)
 * @param value Annotation value (string, number, or boolean)
 */
export function addAnnotation(key: string, value: string | number | boolean): void {
  // Will be implemented when X-Ray SDK is installed
  // AWSXRay.getSegment()?.addAnnotation(key, value);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _annotation = { key, value };
}

/**
 * Add metadata to the current segment
 * Metadata is not indexed but can contain complex data structures
 *
 * @param key Metadata key
 * @param value Any serializable value
 * @param namespace Optional namespace for grouping (default: 'default')
 */
export function addMetadata(key: string, value: unknown, namespace?: string): void {
  // Will be implemented when X-Ray SDK is installed
  // AWSXRay.getSegment()?.addMetadata(key, value, namespace);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _metadata = { key, value, namespace: namespace ?? 'default' };
}

/**
 * Get the current trace ID for propagation to other services
 * Include this in outbound requests via the X-Amzn-Trace-Id header
 *
 * @returns Trace ID string or undefined if no active segment
 */
export function getTraceId(): string | undefined {
  // Will be implemented when X-Ray SDK is installed
  // return AWSXRay.getSegment()?.trace_id;
  return undefined;
}

/**
 * Create a subsegment for tracking specific operations
 * Subsegments provide detailed timing for individual components
 *
 * @param name Subsegment name
 * @param fn Function to execute within the subsegment
 * @returns Result of the function
 */
export async function withSubsegment<T>(name: string, fn: () => Promise<T>): Promise<T> {
  // Will be implemented when X-Ray SDK is installed
  // const segment = AWSXRay.getSegment();
  // const subsegment = segment?.addNewSubsegment(name);
  // try {
  //   return await fn();
  // } catch (error) {
  //   subsegment?.addError(error);
  //   throw error;
  // } finally {
  //   subsegment?.close();
  // }
  return fn();
}
