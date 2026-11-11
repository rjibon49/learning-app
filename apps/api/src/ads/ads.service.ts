
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';
import { SubscriptionsService } from
  '../subscriptions/subscriptions.service.js';

import { Prisma } from
  '../generated/prisma/client.js';

import type {
  CreateAdConfigDto,
  UpdateAdConfigDto,
  PublicAdQueryDto,
  AdminAdQueryDto,
} from './dto/ad-config.dto.js';

@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  private async getApp(appId: string) {
    const app = await this.prisma.app.findUnique({
      where: { id: appId },
      include: {
        config: true,
        language: {
          select: { isActive: true },
        },
      },
    });

    if (
      !app ||
      !app.isActive ||
      !app.language.isActive
    ) {
      throw new NotFoundException(
        'Active application not found',
      );
    }

    return app;
  }

  private publicFields = {
    id: true,
    platform: true,
    provider: true,
    appAdId: true,
    bannerAdUnitId: true,
    interstitialAdUnitId: true,
    rewardedAdUnitId: true,
    nativeAdUnitId: true,
    settings: true,
  } as const;

  // ========================================
  // PUBLIC: Guest advertisement config
  // ========================================

  async publicConfig(query: PublicAdQueryDto) {
    const app = await this.getApp(query.appId);

    if (!app.config?.adsEnabled) {
      return {
        appId: app.id,
        adsEnabled: false,
        configurations: [],
      };
    }

    const configurations =
      await this.prisma.adConfig.findMany({
        where: {
          appId: app.id,
          platform: query.platform,
          isEnabled: true,
        },
        select: this.publicFields,
      });

    return {
      appId: app.id,
      adsEnabled: configurations.length > 0,
      configurations,
    };
  }

  // ========================================
  // LEARNER: Entitlement-aware config
  // ========================================

  async learnerConfig(
    userId: string,
    query: PublicAdQueryDto,
  ) {
    const entitlement =
      await this.subscriptions.getEntitlement(
        userId,
        query.appId,
      );

    if (!entitlement.adsEnabled) {
      return {
        appId: query.appId,
        adsEnabled: false,
        adFree: entitlement.adFree,
        configurations: [],
      };
    }

    const catalog = await this.publicConfig(query);

    return {
      ...catalog,
      adFree: false,
    };
  }

  // ========================================
  // ADMIN: List configurations
  // ========================================

  async findAllAdsConfigs(query: AdminAdQueryDto) {
    const where: Prisma.AdConfigWhereInput = {
      ...(query.appId
        ? { appId: query.appId }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.adConfig.findMany({
          where,
          include: {
            app: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.adConfig.count({ where }),
      ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOneAdmin(id: string) {
    const config = await this.prisma.adConfig.findUnique({
      where: { id },
      include: { app: true },
    });

    if (!config) {
      throw new NotFoundException(
        'Ad configuration not found',
      );
    }

    return config;
  }

  // ========================================
  // ADMIN: Create
  // ========================================

  async createAdConfig(dto: CreateAdConfigDto) {
    await this.getApp(dto.appId);

    const exists = await this.prisma.adConfig.findUnique({
      where: {
        appId_platform_provider: {
          appId: dto.appId,
          platform: dto.platform,
          provider: dto.provider,
        },
      },
    });

    if (exists) {
      throw new ConflictException(
        'Ad configuration already exists',
      );
    }

    try {
      return await this.prisma.adConfig.create({
        data: {
          appId: dto.appId,
          provider: dto.provider,
          platform: dto.platform,
          appAdId: dto.appAdId ?? null,
          bannerAdUnitId: dto.bannerAdUnitId ?? null,
          interstitialAdUnitId:
            dto.interstitialAdUnitId ?? null,
          rewardedAdUnitId:
            dto.rewardedAdUnitId ?? null,
          nativeAdUnitId:
            dto.nativeAdUnitId ?? null,
          isEnabled: dto.isEnabled,
          settings: dto.settings,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ad configuration already exists',
        );
      }
      throw error;
    }
  }

  // ========================================
  // ADMIN: Update
  // ========================================

  async updateAdConfig(
    id: string,
    dto: UpdateAdConfigDto,
  ) {
    await this.findOneAdmin(id);

    const data: Prisma.AdConfigUncheckedUpdateInput = {};

    if (dto.appAdId !== undefined) {
      data.appAdId = dto.appAdId;
    }
    if (dto.bannerAdUnitId !== undefined) {
      data.bannerAdUnitId = dto.bannerAdUnitId;
    }
    if (dto.interstitialAdUnitId !== undefined) {
      data.interstitialAdUnitId = dto.interstitialAdUnitId;
    }
    if (dto.rewardedAdUnitId !== undefined) {
      data.rewardedAdUnitId = dto.rewardedAdUnitId;
    }
    if (dto.nativeAdUnitId !== undefined) {
      data.nativeAdUnitId = dto.nativeAdUnitId;
    }
    if (dto.isEnabled !== undefined) {
      data.isEnabled = dto.isEnabled;
    }
    if (dto.settings !== undefined) {
      data.settings = dto.settings;
    }

    return this.prisma.adConfig.update({
      where: { id },
      data,
    });
  }

  // ========================================
  // ADMIN: Disable, not destructive delete
  // ========================================

  async deleteAdConfig(id: string) {
    await this.findOneAdmin(id);

    await this.prisma.adConfig.update({
      where: { id },
      data: { isEnabled: false },
    });

    return { success: true };
  }
}
