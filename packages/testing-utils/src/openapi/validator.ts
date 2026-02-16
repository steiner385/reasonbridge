/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OpenAPI Validator
 *
 * Validates API responses against OpenAPI 3.x specifications.
 * Uses AJV for JSON Schema validation with OpenAPI-specific formats.
 *
 * @remarks
 * - Supports both YAML and JSON OpenAPI spec files
 * - Validates response bodies against component schemas
 * - Provides detailed error messages for debugging
 * - Caches parsed specs for performance
 *
 * @example
 * ```typescript
 * const validator = new OpenAPIValidator('./docs/api/spec.yaml');
 * await validator.load();
 *
 * const result = validator.validateResponse('TopicResponse', responseData);
 * expect(result.valid).toBe(true);
 * ```
 */

import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { resolve, extname } from 'path';

/**
 * OpenAPI 3.x specification structure (partial)
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths?: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    securitySchemes?: Record<string, unknown>;
  };
}

interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
}

interface OperationObject {
  summary?: string;
  description?: string;
  tags?: string[];
  responses?: Record<string, ResponseObject>;
  requestBody?: RequestBodyObject;
}

interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>;
}

interface RequestBodyObject {
  required?: boolean;
  content?: Record<string, MediaTypeObject>;
}

interface MediaTypeObject {
  schema?: SchemaObject | RefObject;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject | RefObject>;
  items?: SchemaObject | RefObject;
  required?: string[];
  enum?: unknown[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  nullable?: boolean;
  description?: string;
  $ref?: string;
}

interface RefObject {
  $ref: string;
}

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  schemaName: string;
}

/**
 * Detailed validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

/**
 * OpenAPI response validator using AJV
 */
export class OpenAPIValidator {
  private specPath: string;
  private spec: OpenAPISpec | null = null;
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();
  private loaded = false;

  /**
   * Create a new OpenAPI validator
   *
   * @param specPath - Path to the OpenAPI specification file (YAML or JSON)
   */
  constructor(specPath: string) {
    this.specPath = resolve(specPath);
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });
    addFormats(this.ajv);
  }

  /**
   * Load and parse the OpenAPI specification
   *
   * @throws Error if spec file cannot be read or parsed
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    const content = readFileSync(this.specPath, 'utf-8');
    const ext = extname(this.specPath).toLowerCase();

    if (ext === '.yaml' || ext === '.yml') {
      this.spec = parseYaml(content) as OpenAPISpec;
    } else if (ext === '.json') {
      this.spec = JSON.parse(content) as OpenAPISpec;
    } else {
      throw new Error(`Unsupported file extension: ${ext}. Use .yaml, .yml, or .json`);
    }

    // Validate OpenAPI version
    if (!this.spec.openapi?.startsWith('3.')) {
      throw new Error(`Unsupported OpenAPI version: ${this.spec.openapi}. Only 3.x is supported.`);
    }

    // Pre-compile all component schemas
    this.compileSchemas();
    this.loaded = true;
  }

  /**
   * Compile all component schemas into AJV validators
   */
  private compileSchemas(): void {
    const schemas = this.spec?.components?.schemas;
    if (!schemas) return;

    for (const [name, schema] of Object.entries(schemas)) {
      const resolvedSchema = this.resolveRefs(schema);
      try {
        const validate = this.ajv.compile(resolvedSchema);
        this.validators.set(name, validate);
      } catch (error) {
        console.warn(`Failed to compile schema '${name}':`, error);
      }
    }
  }

  /**
   * Recursively resolve $ref references in a schema
   */
  private resolveRefs(schema: SchemaObject | RefObject): SchemaObject {
    if ('$ref' in schema && schema.$ref) {
      const refPath = schema.$ref;
      // Handle #/components/schemas/SchemaName format
      const match = refPath.match(/^#\/components\/schemas\/(.+)$/);
      if (match && match[1]) {
        const schemaName = match[1];
        const refSchema = this.spec?.components?.schemas?.[schemaName];
        if (refSchema) {
          return this.resolveRefs(refSchema);
        }
      }
      throw new Error(`Cannot resolve reference: ${refPath}`);
    }

    // At this point, schema is SchemaObject (not RefObject)
    const schemaObj = schema as SchemaObject;
    const resolved: SchemaObject = { ...schemaObj };

    // Resolve refs in properties
    if (schemaObj.properties) {
      resolved.properties = {};
      for (const [key, propSchema] of Object.entries(schemaObj.properties)) {
        resolved.properties[key] = this.resolveRefs(propSchema as SchemaObject | RefObject);
      }
    }

    // Resolve refs in items (arrays)
    if (schemaObj.items) {
      resolved.items = this.resolveRefs(schemaObj.items as SchemaObject | RefObject);
    }

    return resolved;
  }

  /**
   * Validate data against a named component schema
   *
   * @param schemaName - Name of the schema in components/schemas
   * @param data - Data to validate
   * @returns Validation result with errors if invalid
   */
  validateResponse(schemaName: string, data: unknown): ValidationResult {
    if (!this.loaded) {
      throw new Error('Validator not loaded. Call load() first.');
    }

    const validate = this.validators.get(schemaName);
    if (!validate) {
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Schema '${schemaName}' not found in OpenAPI spec`,
            keyword: 'schema',
            params: { schemaName },
          },
        ],
        schemaName,
      };
    }

    const valid = validate(data);

    return {
      valid: valid as boolean,
      errors: this.formatErrors(validate.errors || []),
      schemaName,
    };
  }

  /**
   * Format AJV errors into a more readable structure
   */
  private formatErrors(errors: ErrorObject[]): ValidationError[] {
    return errors.map((error) => ({
      path: error.instancePath || '/',
      message: error.message || 'Validation failed',
      keyword: error.keyword,
      params: error.params as Record<string, unknown>,
    }));
  }

  /**
   * Get list of available schema names
   */
  getSchemaNames(): string[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Check if a schema exists
   */
  hasSchema(schemaName: string): boolean {
    return this.validators.has(schemaName);
  }

  /**
   * Get the raw OpenAPI spec (for inspection)
   */
  getSpec(): OpenAPISpec | null {
    return this.spec;
  }

  /**
   * Validate response against a specific endpoint's response schema
   *
   * @param method - HTTP method (get, post, etc.)
   * @param path - API path (e.g., /topics/{id})
   * @param statusCode - HTTP status code (e.g., 200, 201)
   * @param data - Response data to validate
   */
  validateEndpointResponse(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    statusCode: number,
    data: unknown,
  ): ValidationResult {
    if (!this.loaded || !this.spec) {
      throw new Error('Validator not loaded. Call load() first.');
    }

    const pathItem = this.spec.paths?.[path];
    if (!pathItem) {
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Path '${path}' not found in OpenAPI spec`,
            keyword: 'path',
            params: { path },
          },
        ],
        schemaName: `${method.toUpperCase()} ${path}`,
      };
    }

    const operation = pathItem[method];
    if (!operation) {
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Method '${method}' not found for path '${path}'`,
            keyword: 'method',
            params: { method, path },
          },
        ],
        schemaName: `${method.toUpperCase()} ${path}`,
      };
    }

    const response = operation.responses?.[statusCode.toString()];
    if (!response) {
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Response ${statusCode} not found for ${method.toUpperCase()} ${path}`,
            keyword: 'response',
            params: { statusCode, method, path },
          },
        ],
        schemaName: `${method.toUpperCase()} ${path}`,
      };
    }

    const schema = response.content?.['application/json']?.schema;
    if (!schema) {
      // No schema defined - assume any response is valid
      return {
        valid: true,
        errors: [],
        schemaName: `${method.toUpperCase()} ${path} ${statusCode}`,
      };
    }

    // If it's a $ref, extract the schema name and use the pre-compiled validator
    if ('$ref' in schema && schema.$ref) {
      const match = schema.$ref.match(/^#\/components\/schemas\/(.+)$/);
      if (match && match[1]) {
        return this.validateResponse(match[1], data);
      }
    }

    // Inline schema - compile and validate
    const resolvedSchema = this.resolveRefs(schema);
    const validate = this.ajv.compile(resolvedSchema);
    const valid = validate(data);

    return {
      valid: valid as boolean,
      errors: this.formatErrors(validate.errors || []),
      schemaName: `${method.toUpperCase()} ${path} ${statusCode}`,
    };
  }
}

/**
 * Create an OpenAPI validator and load the spec
 *
 * @param specPath - Path to the OpenAPI specification file
 * @returns Loaded validator ready for use
 *
 * @example
 * ```typescript
 * const validator = await createValidator('./docs/api/spec.yaml');
 * const result = validator.validateResponse('TopicResponse', data);
 * ```
 */
export async function createValidator(specPath: string): Promise<OpenAPIValidator> {
  const validator = new OpenAPIValidator(specPath);
  await validator.load();
  return validator;
}

/**
 * Vitest/Jest matcher extension for OpenAPI validation
 *
 * @example
 * ```typescript
 * expect(responseData).toMatchOpenAPISchema(validator, 'TopicResponse');
 * ```
 */
export function createOpenAPIMatcher(validator: OpenAPIValidator) {
  return {
    toMatchOpenAPISchema(received: unknown, schemaName: string) {
      const result = validator.validateResponse(schemaName, received);

      if (result.valid) {
        return {
          pass: true,
          message: () => `Expected response not to match schema '${schemaName}'`,
        };
      }

      const errorMessages = result.errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');

      return {
        pass: false,
        message: () =>
          `Expected response to match schema '${schemaName}'\n\nValidation errors:\n${errorMessages}`,
      };
    },
  };
}
