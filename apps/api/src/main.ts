
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  // ==========================================
  // 1. Create NestJS Application
  // ==========================================
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // ==========================================
  // 2. Read Environment Configuration
  // ==========================================
  const config = app.get(ConfigService);

  const host =
    config.get<string>('HOST') ?? '0.0.0.0';

  const port =
    Number(config.get<number | string>('PORT') ?? 4000);

  const apiPrefix =
    config.get<string>('API_PREFIX') ?? 'api';

  // ==========================================
  // 3. Configure CORS Origins
  // ==========================================
  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
  ];

  const configuredOrigins = config.get<
    string | string[]
  >('CORS_ORIGINS');

  let allowedOrigins: string[];

  if (Array.isArray(configuredOrigins)) {
    allowedOrigins = configuredOrigins;
  } else if (typeof configuredOrigins === 'string') {
    allowedOrigins = configuredOrigins
      .split(',')
      .map((origin: string) => origin.trim())
      .filter((origin: string) => origin.length > 0);
  } else {
    allowedOrigins = defaultOrigins;
  }

  // ==========================================
  // 4. Cookie Parser
  // ==========================================
  app.use(cookieParser());

  // ==========================================
  // 5. HTTP Security Headers
  // ==========================================
  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  // Helmet automatically removes X-Powered-By.
  // No Express-specific app.disable() is needed.

  // ==========================================
  // 6. CORS Configuration
  // ==========================================
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (
        error: Error | null,
        allow?: boolean,
      ) => void,
    ): void => {
      // Allow requests without an Origin header,
      // such as native apps and server-to-server calls.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
    ],

    credentials: true,

    maxAge: 600,
  });

  // ==========================================
  // 7. Global Request Validation
  // ==========================================
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      transform: true,
      validateCustomDecorators: true,
    }),
  );

  // ==========================================
  // 8. API Prefix
  // ==========================================
  // Keep existing Admin CMS compatibility.
  app.setGlobalPrefix(apiPrefix);

  // ==========================================
  // 9. Graceful Shutdown
  // ==========================================
  app.enableShutdownHooks();

  // ==========================================
  // 10. Start API Server
  // ==========================================
  await app.listen(port, host);

  console.log('');
  console.log('===================================');
  console.log(' Learning API Started');
  console.log('===================================');
  console.log(` Environment : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(` Host        : ${host}`);
  console.log(` Port        : ${port}`);
  console.log(` API Prefix  : /${apiPrefix}`);
  console.log(
    ` Health URL  : http://127.0.0.1:${port}/${apiPrefix}/health`,
  );
  console.log('===================================');
  console.log('');
}

void bootstrap().catch((error: unknown) => {
  console.error('Learning API startup failed:', error);
  process.exitCode = 1;
});
