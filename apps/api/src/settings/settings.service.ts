import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSettings() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async updateSetting(key: string, value: string, description?: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }

  async deleteSetting(key: string) {
    await this.prisma.systemSetting.delete({ where: { key } });
  }
}