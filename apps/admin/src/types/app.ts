export type GermanLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface LearningApp {
  id: string;
  level: GermanLevel;
  name: string;
  slug: string;
  isActive: boolean;
}