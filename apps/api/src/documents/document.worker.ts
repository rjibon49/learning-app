
import 'dotenv/config';

import {
  Logger,
  Module,
} from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { PrismaModule } from '../prisma.module.js';
import { DocumentsService } from './documents.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        'apps/api/.env',
      ],
    }),
    PrismaModule,
  ],
  providers: [DocumentsService],
})
class DocumentWorkerModule {}

const logger = new Logger('DocumentWorker');

let stopping = false;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    DocumentWorkerModule,
    {
      bufferLogs: true,
    },
  );

  const documents = app.get(DocumentsService);

  process.once('SIGTERM', () => {
    stopping = true;
  });

  process.once('SIGINT', () => {
    stopping = true;
  });

  logger.log('Document worker started');

  try {
    while (!stopping) {
      try {
        const processed =
          await documents.processNextJob();

        if (!processed) {
          await sleep(3000);
        }
      } catch (error: unknown) {
        logger.error(
          error instanceof Error
            ? error.message
            : 'Document worker error',
        );

        await sleep(5000);
      }
    }
  } finally {
    await app.close();
    logger.log('Document worker stopped');
  }
}

void bootstrap().catch((error: unknown) => {
  logger.error(
    error instanceof Error
      ? error.message
      : 'Worker startup failed',
  );
  process.exitCode = 1;
});
