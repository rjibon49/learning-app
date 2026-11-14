
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  CreateNotificationTemplateInput,
  UpdateNotificationTemplateInput,
  NotificationTemplateListInput,
  TemplatePreviewInput,
} from './notification-templates.schemas.js';

@Injectable()
export class NotificationTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private readonly include = {
    translations: true,
    providerConfig: {
      select: {
        id: true,
        channel: true,
        providerKey: true,
        displayName: true,
        isEnabled: true,
      },
    },
    _count: {
      select: {
        deliveries: true,
      },
    },
  } as const;

  async list(query: NotificationTemplateListInput) {
    const where = {
      ...(query.channel
        ? { channel: query.channel }
        : {}),

      ...(query.purpose
        ? { purpose: query.purpose }
        : {}),

      ...(query.isActive !== undefined
        ? { isActive: query.isActive === 'true' }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),

      this.prisma.notificationTemplate.count({
        where,
      }),
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

  async findOne(id: string) {
    const template =
      await this.prisma.notificationTemplate.findUnique({
        where: { id },
        include: this.include,
      });

    if (!template) {
      throw new NotFoundException(
        'Notification template not found.',
      );
    }

    return template;
  }

  private async validateProvider(
    input: CreateNotificationTemplateInput,
  ) {
    if (!input.providerConfigId) return;

    const provider =
      await this.prisma.notificationProviderConfig.findUnique({
        where: { id: input.providerConfigId },
        select: {
          id: true,
          channel: true,
        },
      });

    if (!provider) {
      throw new BadRequestException(
        'Notification provider not found.',
      );
    }

    if (provider.channel !== input.channel) {
      throw new BadRequestException(
        'Template channel and provider channel must match.',
      );
    }
  }

  async create(input: CreateNotificationTemplateInput) {
    await this.validateProvider(input);

    const existing =
      await this.prisma.notificationTemplate.findUnique({
        where: { templateKey: input.templateKey },
        select: { id: true },
      });

    if (existing) {
      throw new ConflictException(
        'Template key already exists.',
      );
    }

    const created =
      await this.prisma.notificationTemplate.create({
        data: {
          templateKey: input.templateKey,
          channel: input.channel,
          purpose: input.purpose,
          providerConfigId:
            input.providerConfigId ?? null,
          providerTemplateId:
            input.providerTemplateId ?? null,

          isActive: false,

          parametersJson: input.parameters,

          translations: {
            create: input.translations.map(
              (translation) => ({
                locale: translation.locale,
                title: translation.title ?? null,
                body: translation.body,
              }),
            ),
          },
        },
        select: { id: true },
      });

    return this.findOne(created.id);
  }

  async update(
    id: string,
    input: UpdateNotificationTemplateInput,
  ) {
    const current = await this.findOne(id);

    if (current.isActive) {
      throw new ConflictException(
        'Deactivate the template before editing.',
      );
    }

    if (current._count.deliveries > 0) {
      throw new ConflictException(
        'A template used for deliveries cannot be edited. Create a new version.',
      );
    }

    if (current.templateKey !== input.templateKey) {
      throw new BadRequestException(
        'Template key cannot be changed.',
      );
    }

    await this.validateProvider(input);

    await this.prisma.$transaction(async (tx) => {
      const changed =
        await tx.notificationTemplate.updateMany({
          where: {
            id,
            isActive: false,
            deliveries: { none: {} },
          },
          data: {
            channel: input.channel,
            purpose: input.purpose,
            providerConfigId:
              input.providerConfigId ?? null,
            providerTemplateId:
              input.providerTemplateId ?? null,
            parametersJson: input.parameters,
          },
        });

      if (changed.count !== 1) {
        throw new ConflictException(
          'Template is no longer editable.',
        );
      }

      await tx.notificationTemplateTranslation.deleteMany({
        where: { templateId: id },
      });

      await tx.notificationTemplateTranslation.createMany({
        data: input.translations.map(
          (translation) => ({
            templateId: id,
            locale: translation.locale,
            title: translation.title ?? null,
            body: translation.body,
          }),
        ),
      });
    });

    return this.findOne(id);
  }

  async setActive(id: string, active: boolean) {
    const template = await this.findOne(id);

    if (active) {
      if (template.translations.length === 0) {
        throw new BadRequestException(
          'Template requires at least one translation.',
        );
      }

      // Activating a template does not activate
      // the external sending provider.
      if (
        template.providerConfig &&
        template.providerConfig.channel !==
          template.channel
      ) {
        throw new BadRequestException(
          'Provider channel mismatch.',
        );
      }
    }

    await this.prisma.notificationTemplate.update({
      where: { id },
      data: { isActive: active },
    });

    return this.findOne(id);
  }

  async preview(
    id: string,
    input: TemplatePreviewInput,
  ) {
    const template = await this.findOne(id);

    const requested = input.locale.toLowerCase();
    const base = requested.split('-')[0];

    const translation =
      template.translations.find(
        (item) =>
          item.locale.toLowerCase() === requested,
      ) ??
      template.translations.find(
        (item) =>
          item.locale.toLowerCase() === base,
      ) ??
      template.translations.find(
        (item) =>
          item.locale.toLowerCase() === 'en',
      ) ??
      template.translations[0];

    if (!translation) {
      throw new BadRequestException(
        'No template translation available.',
      );
    }

    const parameters =
      Array.isArray(template.parametersJson)
        ? template.parametersJson
        : [];

    const allowed = new Set(
      parameters.filter(
        (item): item is string =>
          typeof item === 'string',
      ),
    );

    // Preview must never execute expressions
    // or interpret template content as code.
    const render = (source: string | null) => {
      if (source === null) return null;

      return source.replace(
        /{{\s*([a-z][a-zA-Z0-9_]*)\s*}}/g,
        (_match, name: string) => {
          if (!allowed.has(name)) {
            throw new BadRequestException(
              `Undeclared template parameter: ${name}`,
            );
          }

          const value = input.variables[name];

          if (value === undefined) {
            throw new BadRequestException(
              `Missing template parameter: ${name}`,
            );
          }

          return value;
        },
      );
    };

    return {
      templateId: template.id,
      channel: template.channel,
      purpose: template.purpose,
      locale: translation.locale,
      title: render(translation.title),
      body: render(translation.body),
      previewOnly: true,
      sent: false,
    };
  }
}
