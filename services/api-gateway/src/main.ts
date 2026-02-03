import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import { SERVICE_PORTS } from '@reason-bridge/common';
import { AppModule } from './app.module.js';
import { getCorsConfig, getHelmetConfig } from './config/security.config.js';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();

  // @ts-ignore - Fastify adapter type compatibility with updated @nestjs/platform-fastify
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    // Only log errors in test mode to prevent memory leaks from verbose logging
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

  // Register Fastify security headers plugin (OWASP compliant)
  // @ts-ignore - Type compatibility with fastify-helmet
  await app.register(helmet, getHelmetConfig());

  // Enable CORS with environment-aware configuration
  const corsConfig = getCorsConfig();
  app.enableCors(corsConfig);

  // Configure OpenAPI/Swagger documentation
  // Temporarily disabled due to circular dependency in schema generation
  // TODO: Fix DTO circular reference (property key: "status") and re-enable
  if (process.env['ENABLE_SWAGGER'] === 'true') {
    const config = new DocumentBuilder()
      .setTitle('ReasonBridge API')
      .setDescription(
        'RESTful API for the ReasonBridge rational discussion platform. ' +
          'Provides endpoints for user management, discussions, topics, AI analysis, and moderation.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'JWT authentication token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('health', 'Health check endpoints')
      .addTag('auth', 'Authentication and authorization')
      .addTag('users', 'User management')
      .addTag('topics', 'Discussion topics')
      .addTag('discussions', 'Discussion threads')
      .addTag('responses', 'Discussion responses')
      .addTag('ai', 'AI-powered analysis')
      .addTag('moderation', 'Content moderation')
      .build();

    // @ts-ignore - Type compatibility between Fastify and Express adapters for Swagger
    const document = SwaggerModule.createDocument(app, config);
    // @ts-ignore - Type compatibility between Fastify and Express adapters for Swagger
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });
  }

  const port = process.env['PORT'] || SERVICE_PORTS.API_GATEWAY;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api-docs`);
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
