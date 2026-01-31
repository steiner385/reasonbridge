/**
 * Distributed Tracing Module
 *
 * Provides AWS X-Ray integration for distributed tracing across services.
 * See xray.config.ts for setup instructions.
 */
export {
  initXRay,
  addAnnotation,
  addMetadata,
  getTraceId,
  withSubsegment,
  DEFAULT_SAMPLING_RULES,
} from './xray.config.js';

export type { XRayConfig, SamplingRule } from './xray.config.js';
