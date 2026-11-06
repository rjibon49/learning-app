import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { CreateAdConfigDto, UpdateAdConfigDto } from './dto/ad-config.dto.js';

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAdsConfigs(appId?: string) {
    return this.prisma.adConfig.findMany({
      where: appId ? { appId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        app: { select: { id: true, name: true } },
      },
    });
  }

  async createAdConfig(dto: CreateAdConfigDto) {
    return this.prisma.adConfig.create({ data: dto as any });
  }

  async updateAdConfig(id: string, dto: UpdateAdConfigDto) {
    const config = await this.prisma.adConfig.findUnique({ where: { id } });
    if (!config) throw new NotFoundException('Ad configuration not found');
    return this.prisma.adConfig.update({ where: { id }, data: dto as any });
  }

  async deleteAdConfig(id: string) {
    const config = await this.prisma.adConfig.findUnique({ where: { id } });
    if (!config) throw new NotFoundException('Ad configuration not found');
    await this.prisma.adConfig.delete({ where: { id } });
  }
}