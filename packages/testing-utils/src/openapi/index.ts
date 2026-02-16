/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OpenAPI Contract Testing Utilities
 *
 * Provides tools for validating API responses against OpenAPI schemas.
 *
 * @example
 * ```typescript
 * import { OpenAPIValidator, createContractAssertion } from '@reason-bridge/testing-utils/openapi';
 *
 * const validator = await OpenAPIValidator.fromFile('./specs/user-service.openapi.yaml');
 * const assertContract = createContractAssertion(validator);
 *
 * describe('User Service Contract Tests', () => {
 *   it('should return valid user profile', async () => {
 *     const response = await api.get('/users/me');
 *     assertContract('/me', 'GET', 200, response.body);
 *   });
 * });
 * ```
 */

export {
  OpenAPIValidator,
  createContractAssertion,
  validateRequestBody,
  type OpenAPIDocument,
  type OpenAPIValidationResult,
  type ValidationError,
  type ValidatorOptions,
  type HttpMethod,
  type PathItem,
  type OperationObject,
  type ResponseObject,
  type JSONSchema,
} from './validator';
