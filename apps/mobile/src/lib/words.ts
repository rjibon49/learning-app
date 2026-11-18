import type { PracticeWord } from "../api/practice";
import { MEANING_LANGUAGE } from "../config";
import type { Article } from "../styles/theme";

const ARTICLES: Article[] = ["der", "die", "das"];

function asArticle(value: unknown): Article | null {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (ARTICLES as string[]).includes(v) ? (v as Article) : null;
}

/**
 * The noun's article: from grammar.article (set in the CMS), otherwise
 * from a term typed as "der Bär".
 */
export function splitArticle(word: Pick<PracticeWord, "term" | "grammar">): {
  article: Article | null;
  noun: string;
} {
  const fromGrammar = asArticle(word.grammar?.article);
  const match = /^(der|die|das)\s+(.+)$/i.exec(word.term.trim());
  if (match) return { article: fromGrammar ?? asArticle(match[1]), noun: match[2] };
  return { article: fromGrammar, noun: word.term.trim() };
}

export function pluralOf(word: Pick<PracticeWord, "grammar">): string | null {
  const plural = word.grammar?.plural;
  return typeof plural === "string" && plural.trim() ? plural.trim() : null;
}

/** Meaning in the learner's language, else the first one. */
export function meaningOf(word: Pick<PracticeWord, "translations">): string | null {
  const preferred =
    word.translations.find((t) => t.language.code === MEANING_LANGUAGE) ?? word.translations[0];
  return preferred?.meaning ?? null;
}

/** First example sentence in German. */
export function exampleOf(word: Pick<PracticeWord, "examples">): string | null {
  return word.examples.find((e) => e.language.code === "de")?.text ?? word.examples[0]?.text ?? null;
}
