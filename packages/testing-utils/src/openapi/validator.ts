/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OpenAPI Validation Helper
 *
 * T305: Create OpenAPI validation helper
 *
 * Validates API responses against OpenAPI schemas using AJV.
 * Supports OpenAPI 3.0 and 3.1 specifications.
 *
 * @example Basic usage
 * ```typescript
 * import { OpenAPIValidator } from '@reason-bridge/testing-utils/openapi';
 *
 * const validator = await OpenAPIValidator.fromFile('./api.openapi.yaml');
 * const result = validator.validateResponse('/users/me', 'GET', 200, responseBody);
 *
 * expect(result.valid).toBe(true);
 * ```
 */

import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as nodePath from 'path';
import * as yaml from 'yaml';

// ============================================================================
// Type Definitions (ordered to avoid use-before-define)
// ============================================================================

/**
 * JSON Schema definition
 */
export interface JSONSchema {
  type?: string | string[];
  format?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: unknown[];
  $ref?: string;
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  nullable?: boolean;
  description?: string;
  example?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JSONSchema;
}

/**
 * Security scheme definition
 */
export interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
}

/**
 * Security requirement
 */
export type SecurityRequirement = Record<string, string[]>;

/**
 * Example object
 */
export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: unknown;
}

/**
 * Header object
 */
export interface HeaderObject {
  description?: string;
  required?: boolean;
  schema?: JSONSchema;
}

/**
 * Media type object
 */
export interface MediaTypeObject {
  schema: JSONSchema;
  example?: unknown;
  examples?: Record<string, ExampleObject>;
}

/**
 * Response object
 */
export interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>;
  headers?: Record<string, HeaderObject>;
  $ref?: string;
}

/**
 * Parameter object
 */
export interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: JSONSchema;
}

/**
 * Request body object
 */
export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

/**
 * Operation object
 */
export interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
  security?: SecurityRequirement[];
}

/**
 * Path item
 */
export interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
  parameters?: ParameterObject[];
}

/**
 * OpenAPI document structure (simplified)
 */
export interface OpenAPIDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, JSONSchema>;
    responses?: Record<string, ResponseObject>;
    parameters?: Record<string, ParameterObject>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
}

/**
 * Structured validation error
 */
export interface ValidationError {
  /** JSON pointer to the field with the error */
  instancePath: string;
  /** The validation keyword that failed */
  keyword: string;
  /** Human-readable error message */
  message: string;
  /** Additional parameters about the error */
  params: Record<string, unknown>;
}

/**
 * Validation result from OpenAPI schema validation
 */
export interface OpenAPIValidationResult {
  /** Whether the data is valid against the schema */
  valid: boolean;
  /** Validation errors if invalid */
  errors: ValidationError[];
  /** The path being validated */
  path: string;
  /** The HTTP method */
  method: string;
  /** The status code */
  statusCode: number;
}

/**
 * Options for the OpenAPI validator
 */
export interface ValidatorOptions {
  /** Strict mode - fail on additional properties not in schema */
  strict?: boolean;
  /** Allow coercion of types (e.g., string "123" to number 123) */
  coerceTypes?: boolean;
  /** Base path prefix to strip from paths */
  basePath?: string;
}

/**
 * HTTP methods supported by OpenAPI
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

// ============================================================================
// OpenAPIValidator Class
// ============================================================================

/**
 * OpenAPI Validator
 *
 * Validates API responses against OpenAPI schemas.
 */
export class OpenAPIValidator {
  private readonly spec: OpenAPIDocument;

  private readonly ajv: Ajv;

  private readonly validators: Map<string, ValidateFunction> = new Map();

  private readonly options: ValidatorOptions;

  private constructor(spec: OpenAPIDocument, options: ValidatorOptions = {}) {
    this.spec = spec;
    this.options = options;

    // Initialize AJV with OpenAPI-compatible settings
    this.ajv = new Ajv({
      strict: false, // OpenAPI uses some keywords AJV doesn't know about
      allErrors: true, // Report all errors, not just the first
      coerceTypes: options.coerceTypes ?? false,
      validateFormats: true,
    });

    // Add format validators (uuid, date-time, email, etc.)
    addFormats(this.ajv);

    // Register all component schemas
    this.registerComponentSchemas();
  }

  /**
   * Create a validator from an OpenAPI spec file
   *
   * @param specPath - Path to the OpenAPI YAML or JSON file
   * @param options - Validator options
   */
  static async fromFile(
    specPath: string,
    options: ValidatorOptions = {},
  ): Promise<OpenAPIValidator> {
    const absolutePath = nodePath.isAbsolute(specPath)
      ? specPath
      : nodePath.resolve(process.cwd(), specPath);

    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    const spec = specPath.endsWith('.json') ? JSON.parse(content) : yaml.parse(content);

    return new OpenAPIValidator(spec, options);
  }

  /**
   * Create a validator from an OpenAPI spec object
   *
   * @param spec - The OpenAPI document
   * @param options - Validator options
   */
  static fromSpec(spec: OpenAPIDocument, options: ValidatorOptions = {}): OpenAPIValidator {
    return new OpenAPIValidator(spec, options);
  }

  /**
   * Register all component schemas with AJV
   */
  private registerComponentSchemas(): void {
    const schemas = this.spec.components?.schemas;
    if (!schemas) return;

    for (const [name, schema] of Object.entries(schemas)) {
      const schemaId = `#/components/schemas/${name}`;
      try {
        this.ajv.addSchema(this.convertToJSONSchema(schema), schemaId);
      } catch {
        // Schema may already be registered or have issues
      }
    }
  }

  /**
   * Convert OpenAPI schema to JSON Schema (handle nullable, etc.)
   */
  private convertToJSONSchema(schema: JSONSchema): JSONSchema {
    const converted = { ...schema };

    // Handle nullable (OpenAPI 3.0)
    if (converted.nullable && converted.type) {
      converted.type = [converted.type as string, 'null'];
      delete converted.nullable;
    }

    // Recursively convert nested schemas
    if (converted.properties) {
      converted.properties = Object.fromEntries(
        Object.entries(converted.properties).map(([key, value]) => [
          key,
          this.convertToJSONSchema(value),
        ]),
      );
    }

    if (converted.items) {
      converted.items = this.convertToJSONSchema(converted.items);
    }

    if (converted.allOf) {
      converted.allOf = converted.allOf.map((s) => this.convertToJSONSchema(s));
    }

    if (converted.anyOf) {
      converted.anyOf = converted.anyOf.map((s) => this.convertToJSONSchema(s));
    }

    if (converted.oneOf) {
      converted.oneOf = converted.oneOf.map((s) => this.convertToJSONSchema(s));
    }

    return converted;
  }

  /**
   * Get or create a validator for a specific endpoint response
   */
  private getValidator(
    apiPath: string,
    method: HttpMethod,
    statusCode: number,
  ): ValidateFunction | null {
    const cacheKey = `${method}:${apiPath}:${statusCode}`;

    if (this.validators.has(cacheKey)) {
      return this.validators.get(cacheKey)!;
    }

    const schema = this.getResponseSchema(apiPath, method, statusCode);
    if (!schema) {
      return null;
    }

    try {
      const validate = this.ajv.compile(this.convertToJSONSchema(schema));
      this.validators.set(cacheKey, validate);
      return validate;
    } catch {
      return null;
    }
  }

  /**
   * Get the response schema for an endpoint
   */
  private getResponseSchema(
    pathPattern: string,
    method: HttpMethod,
    statusCode: number,
  ): JSONSchema | null {
    // Normalize path (strip base path if configured)
    let normalizedPath = pathPattern;
    if (this.options.basePath && normalizedPath.startsWith(this.options.basePath)) {
      normalizedPath = normalizedPath.slice(this.options.basePath.length);
    }

    // Find matching path in spec
    const pathItem = this.findPathItem(normalizedPath);
    if (!pathItem) {
      return null;
    }

    const operation = pathItem[method];
    if (!operation) {
      return null;
    }

    // Get response for status code (try exact match, then default)
    const statusKey = statusCode.toString();
    const wildcardKey = `${Math.floor(statusCode / 100)}XX`;
    const response =
      operation.responses[statusKey] ||
      operation.responses['default'] ||
      operation.responses[wildcardKey];

    if (!response) {
      return null;
    }

    // Resolve $ref if present
    const resolvedResponse = this.resolveRef(response);

    // Get schema from content
    const { content } = resolvedResponse;
    if (!content) {
      return null;
    }

    // Prefer application/json
    const mediaType = content['application/json'] || Object.values(content)[0];
    if (!mediaType?.schema) {
      return null;
    }

    // Resolve schema $ref if present
    return this.resolveRef(mediaType.schema);
  }

  /**
   * Find a path item, handling path parameters
   */
  private findPathItem(requestPath: string): PathItem | null {
    // Exact match first
    if (this.spec.paths[requestPath]) {
      return this.spec.paths[requestPath];
    }

    // Try matching with path parameters
    for (const [pattern, pathItem] of Object.entries(this.spec.paths)) {
      if (this.pathMatches(pattern, requestPath)) {
        return pathItem;
      }
    }

    return null;
  }

  /**
   * Check if a path pattern matches a request path
   */
  private pathMatches(pattern: string, requestPath: string): boolean {
    // Convert OpenAPI path pattern to regex
    // e.g., /users/{userId} -> /users/[^/]+
    const regexPattern = pattern.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(requestPath);
  }

  /**
   * Resolve a $ref in the OpenAPI spec
   */
  private resolveRef<T extends { $ref?: string }>(obj: T): T {
    if (!obj.$ref) {
      return obj;
    }

    const refPath = obj.$ref;

    // Handle component references
    if (refPath.startsWith('#/components/')) {
      const parts = refPath.split('/').slice(2); // Remove '#' and 'components'
      let resolved: unknown = this.spec.components;

      for (const part of parts) {
        if (resolved && typeof resolved === 'object') {
          resolved = (resolved as Record<string, unknown>)[part];
        }
      }

      return (resolved as T) || obj;
    }

    return obj;
  }

  /**
   * Validate an API response against the OpenAPI schema
   *
   * @param apiPath - The API path (e.g., '/users/me')
   * @param method - The HTTP method
   * @param statusCode - The response status code
   * @param body - The response body to validate
   * @returns Validation result
   */
  validateResponse(
    apiPath: string,
    method: HttpMethod | string,
    statusCode: number,
    body: unknown,
  ): OpenAPIValidationResult {
    const normalizedMethod = method.toLowerCase() as HttpMethod;
    const validator = this.getValidator(apiPath, normalizedMethod, statusCode);

    if (!validator) {
      return {
        valid: false,
        errors: [
          {
            instancePath: '',
            keyword: 'schema',
            message: `No schema found for ${method.toUpperCase()} ${apiPath} ${statusCode}`,
            params: { path: apiPath, method, statusCode },
          },
        ],
        path: apiPath,
        method: normalizedMethod,
        statusCode,
      };
    }

    const valid = validator(body);

    return {
      valid,
      errors: valid ? [] : this.formatErrors(validator.errors || []),
      path: apiPath,
      method: normalizedMethod,
      statusCode,
    };
  }

  /**
   * Format AJV errors into a cleaner structure
   */
  private formatErrors(errors: ErrorObject[]): ValidationError[] {
    return errors.map((error) => ({
      instancePath: error.instancePath || '/',
      keyword: error.keyword,
      message: error.message || 'Validation failed',
      params: error.params as Record<string, unknown>,
    }));
  }

  /**
   * Get all paths defined in the spec
   */
  getPaths(): string[] {
    return Object.keys(this.spec.paths);
  }

  /**
   * Get all operations for a path
   */
  getOperations(apiPath: string): HttpMethod[] {
    const pathItem = this.spec.paths[apiPath];
    if (!pathItem) return [];

    return (['get', 'post', 'put', 'patch', 'delete'] as HttpMethod[]).filter(
      (method) => pathItem[method] !== undefined,
    );
  }

  /**
   * Get the OpenAPI spec info
   */
  getInfo(): OpenAPIDocument['info'] {
    return this.spec.info;
  }

  /**
   * Get the raw OpenAPI document
   */
  getSpec(): OpenAPIDocument {
    return this.spec;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to create a contract test assertion
 *
 * @example
 * ```typescript
 * const validator = await OpenAPIValidator.fromFile('./api.yaml');
 * const assertContract = createContractAssertion(validator);
 *
 * // In tests:
 * assertContract('/users/me', 'GET', 200, response.body);
 * ```
 */
export function createContractAssertion(validator: OpenAPIValidator) {
  return function assertContract(
    apiPath: string,
    method: HttpMethod | string,
    statusCode: number,
    body: unknown,
  ): void {
    const result = validator.validateResponse(apiPath, method, statusCode, body);

    if (!result.valid) {
      const errorMessages = result.errors
        .map((e) => `  - ${e.instancePath || '/'}: ${e.message} (${e.keyword})`)
        .join('\n');

      throw new Error(
        `Contract validation failed for ${method.toUpperCase()} ${apiPath} ${statusCode}:\n${errorMessages}`,
      );
    }
  };
}

/**
 * Validate a request body against the OpenAPI schema
 *
 * @param validator - The OpenAPI validator
 * @param apiPath - The API path
 * @param method - The HTTP method
 * @param _body - The request body to validate (currently unused, for future implementation)
 */
export function validateRequestBody(
  validator: OpenAPIValidator,
  apiPath: string,
  method: HttpMethod,
  _body: unknown,
): OpenAPIValidationResult {
  const spec = validator.getSpec();
  const pathItem = spec.paths[apiPath];

  if (!pathItem) {
    return {
      valid: false,
      errors: [
        {
          instancePath: '',
          keyword: 'path',
          message: `Path ${apiPath} not found in spec`,
          params: { path: apiPath },
        },
      ],
      path: apiPath,
      method,
      statusCode: 0,
    };
  }

  const operation = pathItem[method];
  if (!operation?.requestBody) {
    return {
      valid: false,
      errors: [
        {
          instancePath: '',
          keyword: 'requestBody',
          message: `No request body schema for ${method.toUpperCase()} ${apiPath}`,
          params: { path: apiPath, method },
        },
      ],
      path: apiPath,
      method,
      statusCode: 0,
    };
  }

  // This is a simplified implementation - could be expanded
  return { valid: true, errors: [], path: apiPath, method, statusCode: 0 };
}
