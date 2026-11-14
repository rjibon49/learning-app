
import { z } from 'zod';

// Version 1 deliberately supports only
// contextual rules. No arbitrary SQL/JS.

const contextualField = z.enum([
  'appId',
  'languageId',
  'levelId',
  'platform',
]);

const conditionSchema = z.strictObject({
  field: contextualField,
  operator: z.literal('EQ'),
  value: z.string().trim().min(1).max(191),
}).superRefine((condition, ctx) => {
  if (
    condition.field === 'platform' &&
    !['ANDROID', 'IOS', 'WEB'].includes(condition.value)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'Platform must be ANDROID, IOS or WEB.',
    });
  }
});

export const audienceRulesSchema = z.strictObject({
  version: z.literal(1),
  operator: z.enum(['ALL', 'ANY']),
  conditions: z.array(conditionSchema).min(1).max(20),
});

export const createAudienceSchema = z.strictObject({
  segmentKey: z.string().trim()
    .regex(/^[a-z0-9][a-z0-9_-]{2,99}$/),

  name: z.string().trim().min(2).max(160),

  description: z.string().trim().max(2000)
    .nullable().optional(),

  rules: audienceRulesSchema,
});

export const updateAudienceSchema =
  createAudienceSchema.omit({
    segmentKey: true,
  });

export const audienceListSchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int()
    .min(1).max(100).default(20),
});

export const announcementTargetsSchema = z.strictObject({
  targets: z.array(
    z.strictObject({
      segmentId: z.string().trim().min(1).max(191),
      exclude: z.boolean(),
    }),
  ).max(30).superRefine((targets, ctx) => {
    const ids = targets.map(x => x.segmentId);

    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate audience segment.',
      });
    }
  }),
});

export type CreateAudienceInput =
  z.infer<typeof createAudienceSchema>;

export type UpdateAudienceInput =
  z.infer<typeof updateAudienceSchema>;

export type AudienceListInput =
  z.infer<typeof audienceListSchema>;

export type AnnouncementTargetsInput =
  z.infer<typeof announcementTargetsSchema>;
