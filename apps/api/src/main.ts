import { Logger, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { enableBigIntJson } from './common/bigint-json.js';
import { PrismaExceptionFilter } from './common/prisma-exception.filter.js';

async function bootstrap(): Promise<void> {
  enableBigIntJson();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);

  const host = config.get<string>('HOST') ?? '0.0.0.0';
  const port = Number(config.get<number | string>('PORT') ?? 4000);
  const apiPrefix = config.get<string>('API_PREFIX') ?? 'api';
  const allowedOrigins = config.get<string[]>('CORS_ORIGINS') ?? [];

  // The API runs behind Traefik/Nginx on the VPS. Without this, every request
  // looks like it comes from the proxy IP, so rate limits (login: 5/min) are
  // shared by ALL users and audit logs store the proxy IP.
  // Default trusts only private-network proxies (Docker / localhost).
  app.set(
    'trust proxy',
    config.get<string>('TRUST_PROXY') ?? 'loopback, linklocal, uniquelocal',
  );

  // HTTP_BODY_LIMIT was defined in .env but never applied before.
  const bodyLimit = config.get<string>('HTTP_BODY_LIMIT') ?? '1mb';
  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', { limit: bodyLimit, extended: true });

  app.use(cookieParser());
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.enableCors({
    // Requests without Origin (React Native apps, server-to-server) are allowed;
    // browsers must come from CORS_ORIGINS.
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Client-Type'],
    credentials: true,
    maxAge: 600,
  });

  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      transform: true,
      validateCustomDecorators: true,
    }),
  );

  // Database errors -> clean 404 / 409 instead of 500.
  app.useGlobalFilters(
    new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  app.setGlobalPrefix(apiPrefix);
  app.enableShutdownHooks();

  await app.listen(port, host);

  new Logger('Bootstrap').log(
    `Learning API (${process.env.NODE_ENV ?? 'development'}) listening on http://${host}:${port}/${apiPrefix} — health: /${apiPrefix}/health`,
  );
}

void bootstrap().catch((error: unknown) => {
  console.error('Learning API startup failed:', error);
  process.exitCode = 1;
});
