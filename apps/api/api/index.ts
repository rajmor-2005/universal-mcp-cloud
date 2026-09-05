import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { CorrelationIdInterceptor } from '../src/common/interceptors/correlation-id.interceptor';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';

const server: Express = express();
let isReady = false;

async function bootstrap(): Promise<Express> {
  if (isReady) return server;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bufferLogs: true,
  });

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

  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/ready', 'health/live'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new ResponseTransformInterceptor(),
  );

  await app.init();
  isReady = true;
  return server;
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  server(req, res);
}
