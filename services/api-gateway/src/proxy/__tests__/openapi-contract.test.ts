/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { AuthProxyController } from '../auth-proxy.controller.js';
import { ProxyService } from '../proxy.service.js';

/**
 * Contract test guarding against regression to an "effectively empty" gateway
 * OpenAPI document (issue #1329). Proxy controllers must contribute real
 * operations — tags, summaries and documented response codes — to /api-docs.
 */
describe('Gateway OpenAPI document', () => {
  let app: NestFastifyApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthProxyController],
      providers: [{ provide: ProxyService, useValue: {} }],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();

    const config = new DocumentBuilder()
      .setTitle('ReasonBridge API')
      .setVersion('1.0.0')
      .addTag('auth')
      .build();
    document = SwaggerModule.createDocument(app, config);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('documents proxied routes with an operation summary', () => {
    const login = document.paths['/auth/login']?.post;
    expect(login).toBeDefined();
    expect(login?.summary).toMatch(/authenticate/i);
  });

  it('documents response status codes for proxied routes', () => {
    const login = document.paths['/auth/login']?.post;
    expect(login?.responses['200']).toBeDefined();
    expect(login?.responses['401']).toBeDefined();
  });

  it('groups proxied routes under an API tag', () => {
    const login = document.paths['/auth/login']?.post;
    expect(login?.tags).toContain('auth');
  });
});
