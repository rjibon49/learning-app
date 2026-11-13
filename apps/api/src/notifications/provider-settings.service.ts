
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  CreateProviderSettingsInput,
  UpdateProviderSettingsInput,
} from './provider-settings.schemas.js';

@Injectable()
export class ProviderSettingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // This phase registers provider configuration only.
  // No external delivery adapters are enabled yet.
  private readonly deliveryAdaptersReady = false;

  async list() {
    const providers =
      await this.prisma.notificationProviderConfig.findMany({
        orderBy: [
          { channel: 'asc' },
          { displayName: 'asc' },
        ],
      });

    return providers.map((provider) => ({
      ...provider,
      // This is implementation readiness,
      // not verification of provider credentials.
      deliveryReady: false,
    }));
  }

  async findOne(id: string) {
    const provider =
      await this.prisma.notificationProviderConfig.findUnique({
        where: { id },
      });

    if (!provider) {
      throw new NotFoundException(
        'Notification provider not found.',
      );
    }

    return {
      ...provider,
      deliveryReady: false,
    };
  }

  async create(input: CreateProviderSettingsInput) {
    const existing =
      await this.prisma.notificationProviderConfig.findUnique({
        where: {
          channel_providerKey: {
            channel: input.channel,
            providerKey: input.providerKey,
          },
        },
        select: { id: true },
      });

    if (existing) {
      throw new ConflictException(
        'Provider configuration already exists.',
      );
    }

    const result =
      await this.prisma.notificationProviderConfig.create({
        data: {
          channel: input.channel,
          providerKey: input.providerKey,
          displayName: input.displayName,

          // Never activate automatically.
          isEnabled: false,
          isTestMode: input.isTestMode,

          credentialRef: input.credentialRef ?? null,
          settingsJson: input.settings,
        },
        select: { id: true },
      });

    return this.findOne(result.id);
  }

  async update(
    id: string,
    input: UpdateProviderSettingsInput,
  ) {
    await this.findOne(id);

    await this.prisma.notificationProviderConfig.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined
          ? { displayName: input.displayName }
          : {}),

        ...(input.isTestMode !== undefined
          ? { isTestMode: input.isTestMode }
          : {}),

        ...(input.credentialRef !== undefined
          ? { credentialRef: input.credentialRef }
          : {}),

        ...(input.settings !== undefined
          ? { settingsJson: input.settings }
          : {}),

        // isEnabled is intentionally not editable here.
      },
    });

    return this.findOne(id);
  }

  async disable(id: string) {
    await this.findOne(id);

    await this.prisma.notificationProviderConfig.update({
      where: { id },
      data: {
        isEnabled: false,
      },
    });

    return this.findOne(id);
  }

  async readiness(id: string) {
    const provider = await this.findOne(id);

    // No credential testing, webhook verification,
    // or external API requests are performed yet.
    return {
      id: provider.id,
      channel: provider.channel,
      providerKey: provider.providerKey,
      configuredReference: Boolean(provider.credentialRef),
      isEnabled: provider.isEnabled,
      adapterReady: this.deliveryAdaptersReady,
      canActivate: false,
      reason:
        'The delivery adapter and consent enforcement are not implemented yet.',
    };
  }
}
