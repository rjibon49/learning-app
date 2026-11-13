
import { z } from 'zod';

const CHANNELS = [
  'EMAIL',
  'WHATSAPP',
  'SMS',
  'MOBILE_PUSH',
  'WEB_PUSH',
  'IN_APP',
  'NOTIFICATION_BELL',
  'WEBSITE_BANNER',
] as const;

const PURPOSES = [
  'MARKETING',
  'TRANSACTIONAL',
  'SYSTEM',
] as const;

const localeSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/)
  .transform((value) => value.toLowerCase());

const parameterSchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9_]{0,49}$/);

const translationSchema = z.strictObject({
  locale: localeSchema,

  title: z
    .string()
    .trim()
    .max(220)
    .nullable()
    .optional(),

  body: z
    .string()
    .trim()
    .min(1)
    .max(10000),
});

export const createNotificationTemplateSchema =
  z.strictObject({
    templateKey: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_-]{2,99}$/),

    channel: z.enum(CHANNELS),

    purpose: z.enum(PURPOSES),

    providerConfigId: z
      .string()
      .trim()
      .min(1)
      .max(191)
      .nullable()
      .optional(),

    providerTemplateId: z
      .string()
      .trim()
      .max(191)
      .nullable()
      .optional(),

    parameters: z
      .array(parameterSchema)
      .max(30)
      .default([]),

    translations: z
      .array(translationSchema)
      .min(1)
      .max(30),
  }).superRefine((data, ctx) => {
    const locales = data.translations.map(
      (item) => item.locale,
    );

    if (new Set(locales).size !== locales.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['translations'],
        message: 'Duplicate locale.',
      });
    }

    if (
      new Set(data.parameters).size !==
      data.parameters.length
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['parameters'],
        message: 'Duplicate parameter.',
      });
    }

    const allowed = new Set(data.parameters);
    const placeholderRegex =
      /{{\s*([a-z][a-zA-Z0-9_]*)\s*}}/g;

    data.translations.forEach((translation, index) => {
      const content =
        `${translation.title ?? ''}\n${translation.body}`;

      for (const match of content.matchAll(placeholderRegex)) {
        if (!allowed.has(match[1])) {
          ctx.addIssue({
            code: 'custom',
            path: ['translations', index],
            message: `Undeclared placeholder: ${match[1]}`,
          });
        }
      }

      // Reject malformed or unsupported template syntax.
      const stripped = content.replace(placeholderRegex, '');

      if (stripped.includes('{{') || stripped.includes('}}')) {
        ctx.addIssue({
          code: 'custom',
          path: ['translations', index],
          message: 'Invalid placeholder syntax.',
        });
      }
    });
  });

export const updateNotificationTemplateSchema =
  createNotificationTemplateSchema;

export const notificationTemplateListSchema =
  z.strictObject({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    channel: z.enum(CHANNELS).optional(),

    purpose: z.enum(PURPOSES).optional(),

    isActive: z.enum(['true', 'false']).optional(),
  });

export const templatePreviewSchema =
  z.strictObject({
    locale: localeSchema.default('en'),

    variables: z
      .record(
        parameterSchema,
        z.string().max(1000),
      )
      .default({}),
  });

export type CreateNotificationTemplateInput =
  z.infer<typeof createNotificationTemplateSchema>;

export type UpdateNotificationTemplateInput =
  z.infer<typeof updateNotificationTemplateSchema>;

export type NotificationTemplateListInput =
  z.infer<typeof notificationTemplateListSchema>;

export type TemplatePreviewInput =
  z.infer<typeof templatePreviewSchema>;
