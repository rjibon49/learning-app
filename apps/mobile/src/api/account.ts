import { apiClient } from "./client";

export type MarketingPreferences = {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  contact: { hasEmail: boolean; emailVerified: boolean; hasPhone: boolean };
};

export async function fetchMarketingPreferences(): Promise<MarketingPreferences> {
  const res = await apiClient.get<MarketingPreferences>("/auth/learner/marketing-preferences");
  return res.data;
}

export async function saveMarketingPreferences(
  prefs: Pick<MarketingPreferences, "email" | "whatsapp" | "sms">,
): Promise<void> {
  await apiClient.patch("/auth/learner/marketing-preferences", prefs);
}
