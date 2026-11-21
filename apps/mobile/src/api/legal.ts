import { apiClient } from "./client";

export type LegalDoc = "privacy" | "terms";

export type LegalContent = {
  title: string;
  company: string;
  updated: string;
  markdown: string;
};

/** Privacy policy / terms of use, as edited in the CMS (no login needed). */
export async function fetchLegal(doc: LegalDoc): Promise<LegalContent> {
  const { data } = await apiClient.get<LegalContent>(`/legal/content/${doc}`);
  return data;
}
