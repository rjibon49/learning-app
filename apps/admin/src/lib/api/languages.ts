
import { apiRequest } from "./client";

import type {
  LearningLanguage,
  ProficiencyFramework,
  ProficiencyLevel,
  LanguageLevelAssignment,
} from "@/types/app";

export interface LanguageInput {
  code: string;
  name: string;
  nativeName: string;
  direction: "LTR" | "RTL";
  isActive?: boolean;
  sortOrder?: number;
}

export interface LanguageLevelsResponse {
  language?: LearningLanguage;
  assignments: LanguageLevelAssignment[];
  levels: ProficiencyLevel[];
}

function unwrapList<T>(
  response: T[] | { data: T[] },
): T[] {
  return Array.isArray(response)
    ? response
    : response.data;
}

export async function getLanguages():
  Promise<LearningLanguage[]> {
  const result = await apiRequest<
    LearningLanguage[] | { data: LearningLanguage[] }
  >("/admin/languages");

  return unwrapList(result);
}

export async function getPublicLanguages():
  Promise<LearningLanguage[]> {
  const result = await apiRequest<
    LearningLanguage[] | { data: LearningLanguage[] }
  >("/languages");

  return unwrapList(result);
}

export async function getFrameworks():
  Promise<ProficiencyFramework[]> {
  const result = await apiRequest<
    ProficiencyFramework[] |
    { data: ProficiencyFramework[] }
  >("/admin/languages/frameworks");

  return unwrapList(result);
}


export async function getLanguageLevels(
  languageCode: string,
): Promise<LanguageLevelsResponse> {
  const result = await apiRequest<
    LanguageLevelsResponse |
    LanguageLevelAssignment[] |
    ProficiencyLevel[] |
    { data: LanguageLevelAssignment[] }
  >(
    `/admin/languages/${encodeURIComponent(languageCode)}/levels`,
    { method: "GET" },
  );

  // Response: direct array
  if (Array.isArray(result)) {
    const assignments =
      result as LanguageLevelAssignment[];

    return {
      assignments,
      levels: assignments
        .map((item) => item.level)
        .filter(
          (level): level is ProficiencyLevel =>
            Boolean(level?.id),
        ),
    };
  }

  // Response: { data: [...] }
  if ("data" in result) {
    const assignments = result.data;

    return {
      assignments,
      levels: assignments
        .map((item) => item.level)
        .filter(
          (level): level is ProficiencyLevel =>
            Boolean(level?.id),
        ),
    };
  }

  // Response: LanguageLevelsResponse
  return {
    assignments: result.assignments ?? [],
    levels: result.levels ?? [],
    language: result.language,
  };
}


export async function createLanguage(
  input: LanguageInput,
): Promise<LearningLanguage> {
  return apiRequest<LearningLanguage>(
    "/admin/languages",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateLanguage(
  code: string,
  input: Partial<Omit<LanguageInput, "code">>,
): Promise<LearningLanguage> {
  return apiRequest<LearningLanguage>(
    `/admin/languages/${encodeURIComponent(code)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}
