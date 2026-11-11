
import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from './prisma.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        service: 'learning-api',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'learning-api',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
