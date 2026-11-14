
import { z } from 'zod';

export const announcementKinds = [
  'PROMOTION',
  'COURSE_UPDATE',
  'SUBSCRIPTION',
  'MAINTENANCE',
  'SECURITY',
  'GENERAL',
] as const;

export const announcementChannels = [
  'WEBSITE_BANNER',
  'IN_APP',
  'NOTIFICATION_BELL',
] as const;

const nullableDate = z.iso.datetime().nullable().optional();

const translationSchema = z.strictObject({
  locale: z.string().trim().regex(
    /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/,
  ),
  title: z.string().trim().min(2).max(220),
  message: z.string().trim().min(2).max(10000),
  actionLabel: z.string().trim().max(120).nullable().optional(),
});

const placementSchema = z.strictObject({
  channel: z.enum(announcementChannels),
  placementKey: z.string().trim()
    .regex(/^[a-z0-9][a-z0-9_-]{1,99}$/),
  isEnabled: z.boolean().default(true),
});

export const announcementInputSchema = z.strictObject({
  slug: z.string().trim()
    .regex(/^[a-z0-9][a-z0-9-]{2,159}$/),

  kind: z.enum(announcementKinds).default('GENERAL'),

  purpose: z.enum([
    'MARKETING',
    'TRANSACTIONAL',
    'SYSTEM',
  ]).default('MARKETING'),

  priority: z.number().int().min(0).max(1000).default(0),
  isDismissible: z.boolean().default(true),

  startsAt: nullableDate,
  endsAt: nullableDate,

  actionType: z.enum([
    'INTERNAL_PATH',
    'EXTERNAL_URL',
  ]).nullable().optional(),

  actionValue: z.string().trim().max(2000).nullable().optional(),

  imageAssetId: z.string().trim().min(1).nullable().optional(),

  translations: z.array(translationSchema).min(1).max(30),

  placements: z.array(placementSchema).min(1).max(20),

  promoCodeIds: z.array(
    z.string().trim().min(1),
  ).max(20).default([]),
}).superRefine((value, ctx) => {
  if (
    value.startsAt &&
    value.endsAt &&
    Date.parse(value.endsAt) <= Date.parse(value.startsAt)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'End date must be after start date.',
    });
  }

  if (value.actionType && !value.actionValue) {
    ctx.addIssue({
      code: 'custom',
      path: ['actionValue'],
      message: 'Action destination is required.',
    });
  }

  if (value.actionType === 'INTERNAL_PATH') {
    if (
      !value.actionValue?.startsWith('/') ||
      value.actionValue.startsWith('//') ||
      value.actionValue.includes('\\')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['actionValue'],
        message: 'Internal action must be a safe relative path.',
      });
    }
  }

  if (value.actionType === 'EXTERNAL_URL') {
    try {
      const url = new URL(value.actionValue ?? '');

      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password
      ) {
        throw new Error('Invalid URL');
      }
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['actionValue'],
        message: 'External action must use HTTPS.',
      });
    }
  }

  const locales = value.translations.map(x => x.locale.toLowerCase());
  if (new Set(locales).size !== locales.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['translations'],
      message: 'Duplicate translation locale.',
    });
  }

  const slots = value.placements.map(
    x => `${x.channel}:${x.placementKey}`,
  );
  if (new Set(slots).size !== slots.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['placements'],
      message: 'Duplicate announcement placement.',
    });
  }

  if (new Set(value.promoCodeIds).size !== value.promoCodeIds.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['promoCodeIds'],
      message: 'Duplicate promotion ID.',
    });
  }
});

export const announcementUpdateSchema =
  announcementInputSchema.safeExtend({});

export const announcementListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([
    'DRAFT',
    'SCHEDULED',
    'PUBLISHED',
    'PAUSED',
    'ARCHIVED',
  ]).optional(),
}).strict();

export type AnnouncementInput =
  z.infer<typeof announcementInputSchema>;

export type AnnouncementListQuery =
  z.infer<typeof announcementListQuerySchema>;
