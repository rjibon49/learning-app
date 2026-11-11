
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';
import {
  settingKeySchema,
  validateSettingValue,
  type SettingKey,
  type UpdateSettingInput,
} from './settings.schemas.js';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  getAllSettings() {
    return this.prisma.systemSetting.findMany({
      where: {
        key: { in: settingKeySchema.options },
      },
      orderBy: { key: 'asc' },
    });
  }

  async getPublicSettings() {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        isPublic: true,
        key: {
          in: [
            'MAINTENANCE_MODE',
            'DEFAULT_LOCALE',
            'REGISTRATION_ENABLED',
          ],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    return Object.fromEntries(
      rows.map((row) => [row.key, row.value]),
    );
  }

  async updateSetting(
    actorId: string,
    key: SettingKey,
    input: UpdateSettingInput,
  ) {
    let value: string;

    try {
      value = validateSettingValue(key, input.value);
    } catch (error: unknown) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Invalid setting value',
      );
    }

    const publicKeys = new Set([
      'MAINTENANCE_MODE',
      'DEFAULT_LOCALE',
      'REGISTRATION_ENABLED',
    ]);

    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.systemSetting.findUnique({
        where: { key },
      });

      const updated = await tx.systemSetting.upsert({
        where: { key },
        create: {
          key,
          value,
          description: input.description ?? null,
          isPublic: publicKeys.has(key),
          updatedBy: actorId,
        },
        update: {
          value,
          isPublic: publicKeys.has(key),
          updatedBy: actorId,
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: actorId,
          action: 'SETTING_UPDATED',
          entityType: 'SystemSetting',
          entityId: updated.id,
          metadata: {
            key,
            oldValue: previous?.value ?? null,
            newValue: value,
          },
        },
      });

      return updated;
    });
  }

  async deleteSetting(
    actorId: string,
    key: SettingKey,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.systemSetting.findUnique({
        where: { key },
      });

      if (!existing) {
        throw new NotFoundException('Setting not found');
      }

      await tx.systemSetting.delete({
        where: { key },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: actorId,
          action: 'SETTING_DELETED',
          entityType: 'SystemSetting',
          entityId: existing.id,
          metadata: {
            key,
            previousValue: existing.value,
          },
        },
      });

      return { success: true };
    });
  }
}
