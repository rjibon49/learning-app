
export type GermanLevel =
  | "A1"
  | "A2"
  | "B1"
  | "B2"
  | "C1";

export interface LearningLanguage {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  direction: "LTR" | "RTL";
  isActive?: boolean;
  sortOrder?: number;
}

export interface ProficiencyFramework {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  levels?: ProficiencyLevel[];
}

export interface ProficiencyLevel {
  id: string;
  code: string;
  name: string;
  sortOrder?: number;
  frameworkId?: string;
  framework?: {
    id?: string;
    code: string;
    name: string;
  };
  isActive?: boolean;
}

export interface LanguageLevelAssignment {
  id?: string;
  languageId?: string;
  levelId?: string;
  isActive?: boolean;
  sortOrder?: number;
  level?: ProficiencyLevel;
}

export interface LearningApp {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  isActive: boolean;

  languageId: string;
  levelId: string | null;

  language: LearningLanguage;
  levelInfo: ProficiencyLevel | null;

  // Compatibility with existing CMS dashboard/topbar.
  level: string;
}

export interface AppFormInput {
  name: string;
  slug: string;
  description?: string | null;
  languageId: string;
  levelId?: string | null;
}

export interface AppStatusInput {
  isActive: boolean;
}

export interface AppQuery {
  page?: number;
  limit?: number;
  search?: string;
  languageId?: string;
}
