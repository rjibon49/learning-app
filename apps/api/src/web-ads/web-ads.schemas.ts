
import { z } from "zod";

const key = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);

const id = z.string().trim().min(1).max(128);

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);

      return (
        url.protocol === "https:" &&
        Boolean(url.hostname) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  });

const dateValue = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional();

export const IdSchema = id;

export const CreatePlacementSchema = z.object({
  siteKey: key,
  key,
  name: z.string().trim().min(2).max(150),
  width: z.number().int().min(1).max(4000)
    .nullable().optional(),
  height: z.number().int().min(1).max(4000)
    .nullable().optional(),
  isActive: z.boolean().default(true),
}).strict();

export const UpdatePlacementSchema =
  CreatePlacementSchema
    .omit({ siteKey: true, key: true })
    .partial();

export const CreateCampaignSchema = z.object({
  placementId: id,
  name: z.string().trim().min(2).max(180),

  kind: z.enum([
    "LOCAL_IMAGE",
    "ADSENSE",
    "GAM",
  ]),

  status: z.enum([
    "DRAFT",
    "ACTIVE",
    "PAUSED",
  ]).default("DRAFT"),

  mediaAssetId: id.nullable().optional(),
  destinationUrl: httpsUrl.nullable().optional(),
  altText: optionalText(300),

  providerClient: optionalText(150),
  providerSlot: optionalText(200),

  startsAt: dateValue,
  endsAt: dateValue,

  priority: z.number().int().min(0).max(1000)
    .default(0),

  weight: z.number().int().min(1).max(100)
    .default(1),

  languageCode: z.string().trim()
    .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/)
    .max(16).nullable().optional(),

  pagePrefix: z.string().trim()
    .max(300)
    .regex(/^\/(?!\/)[^\s?#]*$/)
    .nullable().optional(),
}).strict();

export const UpdateCampaignSchema =
  CreateCampaignSchema
    .omit({ placementId: true })
    .partial();

export const ListSchema = z.object({
  siteKey: key.optional(),
  placementId: id.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100)
    .default(20),
}).strict();

export const DeliverySchema = z.object({
  siteKey: key,
  placementKey: key,
  languageCode: z.string()
    .trim().max(16).optional(),
  pagePath: z.string()
    .trim().max(500)
    .startsWith("/")
    .default("/"),
}).strict();

export const ImpressionSchema = z.object({
  token: z.string().min(20).max(2000),
}).strict();

export const ReportSchema = z.object({
  siteKey: key,
  days: z.coerce.number().int().min(1).max(90)
    .default(30),
}).strict();

export type CreatePlacementInput =
  z.infer<typeof CreatePlacementSchema>;

export type UpdatePlacementInput =
  z.infer<typeof UpdatePlacementSchema>;

export type CreateCampaignInput =
  z.infer<typeof CreateCampaignSchema>;

export type UpdateCampaignInput =
  z.infer<typeof UpdateCampaignSchema>;

export type ListInput = z.infer<typeof ListSchema>;
export type DeliveryInput = z.infer<typeof DeliverySchema>;
export type ReportInput = z.infer<typeof ReportSchema>;
