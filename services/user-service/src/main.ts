import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const port = process.env['PORT'] || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 User Service is running on: http://localhost:${port}`);
}

bootstrap();
