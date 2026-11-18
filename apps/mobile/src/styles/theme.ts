/**
 * German A1 design system (see the "German A1 App Design" canvas).
 * One blue for actions, gold only for rewards, article colours always
 * paired with the written article.
 */
export const COLORS = {
  primary: "#2747E0",
  primaryPressed: "#1A33B0",
  primarySoft: "#E8ECFF",
  primaryTint: "#F4F6FF",
  onPrimarySoft: "#C9D3FF",

  gold: "#FFC83D",
  goldSoft: "#FFF4D1",
  goldIcon: "#E0A100",
  goldText: "#7A5300",

  correct: "#15803D",
  correctSoft: "#E9FBF0",
  correctText: "#14532D",
  wrong: "#C62828",
  wrongSoft: "#FDE4E4",
  wrongText: "#8E1B1B",
  warnSoft: "#FFEBD6",
  warnText: "#7C3A06",
  tipSoft: "#FFF8E1",
  tipText: "#4A3700",

  ink: "#14161F",
  muted: "#5B6072",
  faint: "#8A8FA3",
  ground: "#F5F6FA",
  surface: "#FFFFFF",
  border: "#E4E6EE",
  borderStrong: "#D5DAEA",
  track: "#E4E8F7",
} as const;

export const ARTICLE_COLORS = {
  der: { bg: "#DCE6FF", fg: "#1E3A8A", label: "Masculine" },
  die: { bg: "#FFE1E1", fg: "#8E1B1B", label: "Feminine" },
  das: { bg: "#DDF5E4", fg: "#14532D", label: "Neuter" },
} as const;

export type Article = keyof typeof ARTICLE_COLORS;

export const FONTS = {
  display: "Nunito_900Black",
  title: "Nunito_800ExtraBold",
  titleMedium: "Nunito_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const SHADOW = {
  card: {
    shadowColor: "#14161F",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  raised: {
    shadowColor: "#14161F",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
} as const;

/** Minimum touch target (Android guideline: 48 dp). */
export const TOUCH = 48;
