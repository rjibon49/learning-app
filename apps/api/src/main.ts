import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.use(cookieParser());

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  
  // localhost এবং 127.0.0.1 দুটিকেই ঠিকমতো পার্স করার জন্য আপডেট
  const corsOrigins = config
    .get<string>(
      'CORS_ORIGINS',
      'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001',
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
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // This allows HttpOnly cookies to be sent and received
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

  // await app.listen(port, '127.0.0.1');
  await app.listen(4000, '0.0.0.0');
  console.log(`API running at http://127.0.0.1:${port}/${apiPrefix}`);
}

void bootstrap();