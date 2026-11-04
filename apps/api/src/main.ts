import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);

  const port = config.get<number>('PORT', 4000);
  const apiPrefix = config.get<string>('API_PREFIX', 'api');

  const corsOrigins = config
    .get<string>(
      'CORS_ORIGINS',
      'http://localhost:3000,http://localhost:3001',
    )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      transform: true,
      validateCustomDecorators: true,
    }),
  );

  app.setGlobalPrefix(apiPrefix);

  app.enableShutdownHooks();

  await app.listen(port, '127.0.0.1');

  console.log(
    `API running at http://127.0.0.1:${port}/${apiPrefix}`,
  );
}

void bootstrap();