
import { z } from 'zod';

export const marketingPreferencesSchema = z.strictObject({
  email: z.boolean(),
  whatsapp: z.boolean(),
  sms: z.boolean(),
});

export type MarketingPreferencesInput =
  z.infer<typeof marketingPreferencesSchema>;
