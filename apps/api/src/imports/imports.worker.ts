
import 'dotenv/config';

import {
  Logger,
  Module,
} from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { PrismaModule } from '../prisma.module.js';
import { ImportsService } from './imports.service.js';

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

  providers: [
    ImportsService,
  ],
})
class ImportsWorkerModule {}

const logger = new Logger('ImportsWorker');

let stopping = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    ImportsWorkerModule,
    {
      bufferLogs: true,
    },
  );

  const imports = app.get(ImportsService);

  process.once('SIGINT', () => {
    stopping = true;
  });

  process.once('SIGTERM', () => {
    stopping = true;
  });

  logger.log('Global Vocabulary Import Worker started');

  try {
    while (!stopping) {
      try {
        const processed =
          await imports.processNextJob();

        if (!processed) {
          await sleep(3000);
        }
      } catch (error: unknown) {
        logger.error(
          error instanceof Error
            ? error.message
            : 'Unknown worker error',
        );

        await sleep(5000);
      }
    }
  } finally {
    await app.close();

    logger.log('Import worker stopped');
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
