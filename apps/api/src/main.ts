/**
 * Universal MCP Cloud — API Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createLogger } from '@umcp/logger';
import { getConfig } from '@umcp/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const logger = createLogger('Bootstrap');
  const config = getConfig();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // ─── Security ───────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
  });

  // ─── API Versioning ─────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─── Global Pipes ──────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global Filters & Interceptors ─────────────────
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new ResponseTransformInterceptor(),
  );

  // ─── Swagger ────────────────────────────────────────
  if (config.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Universal MCP Cloud API')
      .setDescription('Enterprise AI Integration Platform API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .addTag('auth', 'Authentication & Authorization')
      .addTag('organizations', 'Organization Management')
      .addTag('workspaces', 'Workspace Management')
      .addTag('connectors', 'Connector Management')
      .addTag('mcp', 'MCP Protocol Engine')
      .addTag('billing', 'Subscription & Billing')
      .addTag('webhooks', 'Webhook Management')
      .addTag('admin', 'Admin Operations')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
      },
    });
    logger.info('Swagger docs available at /docs');
  }

  // ─── Start Server ──────────────────────────────────
  await app.listen(config.API_PORT, '0.0.0.0');
  logger.info(`🚀 API server running on http://0.0.0.0:${config.API_PORT}`);
  logger.info(`📚 API docs: http://localhost:${config.API_PORT}/docs`);
  logger.info(`🔧 Environment: ${config.NODE_ENV}`);
}

bootstrap();
