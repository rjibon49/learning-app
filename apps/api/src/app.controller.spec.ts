
import { ServiceUnavailableException } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { PrismaService } from './prisma.service.js';

describe('AppController', () => {
  let appController: AppController;

  it('should return healthy status when database is connected', async () => {
    const prismaMock = {
      $queryRaw: async () => [{ '1': 1 }],
    } as unknown as PrismaService;

    appController = new AppController(prismaMock);

    const result = await appController.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('learning-api');
    expect(result.database).toBe('connected');
    expect(typeof result.timestamp).toBe('string');
  });

  it('should throw ServiceUnavailableException when database fails', async () => {
    const prismaMock = {
      $queryRaw: async () => {
        throw new Error('Database connection failed');
      },
    } as unknown as PrismaService;

    appController = new AppController(prismaMock);

    await expect(
      appController.getHealth(),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
