/**
 * Finds the German parts of a lesson written in English Markdown and turns
 * them into tappable "speak" links, so learners hear every German word
 * while reading — without the author adding special markup.
 *
 * What is detected (see the CMS lesson format):
 *  - tables: every cell in a column headed "German" / "Deutsch"
 *  - bold labels: **Hallo (Hello)**, **Tschüss**
 *  - dialogue lines: **Anna:** Hallo, Max!
 *  - list items and lines: "Guten Tag, Frau Müller!", "Herr Schmidt — Mr. Schmidt"
 *  - answer options: "A. Gute Nacht"
 *  - German in quotes inside English text: … "Gute Nacht" is not …
 *
 * Authors can also mark German explicitly: [Hallo](say)
 * Existing links are left as they are.
 */
import { makeSpeechLink } from "./speech-links";

const DE_WORDS = new Set(
  (
    "der die das den dem des ein eine einen einem einer eines " +
    "ich du er sie es wir ihr bin bist ist sind seid habe hast haben " +
    "und oder aber nicht kein keine ja nein danke bitte gerne " +
    "guten gute guter gutes gut morgen tag abend nacht hallo tschüss tschüs servus moin " +
    "auf wiedersehen wiederhören bis bald später willkommen herzlich " +
    "herr frau mein meine meinen dein deine ihre sein seine " +
    "wie heißt heiße heißen heiße woher kommst komme kommt kommen aus wo wer wohne wohnst wohnt " +
    "spreche sprichst spricht sprechen deutsch deutschland entschuldigung grüß gott " +
    "mit zu von für im am vom zum zur sehr schön freut mich dich auch noch hier dort heute " +
    "geht's geht ihnen dir mir uns euch jetzt immer viel vielen dank alles klar " +
    "eins zwei drei vier fünf sechs sieben acht neun zehn " +
    "montag dienstag mittwoch donnerstag freitag samstag sonntag " +
    "mama papa kind kinder mann frauen haus katze hund bär wasser brot"
  ).split(/\s+/),
);

const EN_WORDS = new Set(
  (
    "the a an and or but is are am be been to of for on at with from by as " +
    "you your yours i me my he she it we they them his her our their " +
    "this that these those what how when where who why which " +
    "do does did can could will would should may might must " +
    "hello hi bye goodbye good morning day evening night see later soon tomorrow today welcome " +
    "mr ms mrs mom dad thank thanks please yes not very " +
    "use used using usually example examples meaning means mean english german " +
    "question answer answers say says word words lesson learn learned know difference between " +
    "complete sentence write read repeat each time times other people friends family " +
    "if then there here into about after before only also just like than so"
  ).split(/\s+/),
);

const LETTERS = /[^a-zäöüß' ]+/g;

function tokens(text: string): string[] {
  return text.toLowerCase().replace(LETTERS, " ").split(/\s+/).filter(Boolean);
}

export function normalizePhrase(text: string): string {
  return tokens(text).join(" ");
}

/** True when the text reads as German rather than English. */
export function looksGerman(text: string, known: Set<string> = new Set()): boolean {
  const t = text.trim();
  if (!t || t.length > 160 || /_{2,}/.test(t)) return false;

  const words = tokens(t);
  if (words.length === 0) return false;

  let de = 0;
  let en = 0;
  for (const w of words) {
    if (DE_WORDS.has(w)) de += 1;
    if (EN_WORDS.has(w)) en += 1;
    if (/[äöüß]/.test(w) && !DE_WORDS.has(w)) de += 0.5; // umlauts, but names (Müller) count less
  }

  // Starts with a phrase this lesson already teaches ("Hallo", "Guten Tag"…).
  const norm = words.join(" ");
  for (const phrase of known) {
    if (phrase && (norm === phrase || norm.startsWith(`${phrase} `))) {
      de += 3;
      break;
    }
  }

  return de >= 1 && de > en;
}

/** Labels that introduce a wrong example, in English or German. */
const WRONG_LABEL =
  /^\s*(?:[-*+]\s+)?(?:\*\*)?(?:falsch|incorrect(?: situation)?|wrong|not correct|nicht richtig)\s*:/i;
/** The label alone on its line: the wrong example is on the next line. */
const WRONG_LABEL_ONLY =
  /^\s*(?:[-*+]\s+)?(?:\*\*)?(?:falsch|incorrect(?: situation)?|wrong|not correct|nicht richtig)\s*:(?:\*\*)?\s*$/i;

const SPEECH_MARK =/\]\(\s*(say|de|speak)\s*\)/i;

/** Keeps one copy per phrase, ignoring case and punctuation ("Bis morgen!" = "Bis morgen"). */
function addPhrase(found: string[], phrase: string) {
  const key = normalizePhrase(phrase);
  if (key && !found.some((p) => normalizePhrase(p) === key)) found.push(phrase);
}

function wrap(text: string, found: string[]): string {
  const core = text.trim();
  if (!core || /[[\]*`]/.test(core)) return text;
  addPhrase(found, core);
  const lead = text.slice(0, text.indexOf(core));
  const tail = text.slice(text.indexOf(core) + core.length);
  return `${lead}[${core}](${makeSpeechLink(core)})${tail}`;
}

/** German inside quotes in an English sentence. */
function wrapQuoted(text: string, known: Set<string>, found: string[]): string {
  return text
    // {1,60} so short quotes like "ü" still pair up and later quotes stay aligned.
    .replace(/"([^"\n]{1,60})"/g, (m, inner: string) => (looksGerman(inner, known) ? `"${wrap(inner, found)}"` : m))
    .replace(/„([^“\n]{1,60})“/g, (m, inner: string) => (looksGerman(inner, known) ? `„${wrap(inner, found)}“` : m));
}

const QUOTED = /"[^"\n]*"|„[^“\n]*“/g;

/**
 * Letters of other scripts (Bengali, Arabic, Cyrillic, Chinese …): a line in
 * the learner's own language with some German in it is not read aloud as a
 * whole — only its quoted or "German — meaning" parts are.
 */
const OTHER_SCRIPT = /[\u0370-\u1DFF\u2C00-\uFFEF]/;

/** German as a whole line — judged without any quoted words inside it. */
function wholeLineGerman(text: string, known: Set<string>): boolean {
  if (OTHER_SCRIPT.test(text)) return false;
  if (!looksGerman(text, known)) return false;
  const outside = text.replace(QUOTED, " ").trim();
  return outside === text.trim() || looksGerman(outside, known);
}

/** One piece of running text: whole German line, "German — English", or quoted German. */
function annotateText(text: string, known: Set<string>, found: string[]): string {
  const trailing = /\s*$/.exec(text)?.[0] ?? ""; // keep Markdown hard breaks ("  ")
  const body = text.slice(0, text.length - trailing.length);

  // Word-order exercises ("heißt / du / Wie / ?") are not sentences to repeat.
  if (/\s\/\s.*\s\/\s/.test(body)) return text;

  // "German — English" and "heißt = are called": only the German side plays.
  if (/\s[—–=]\s/.test(body)) {
    return (
      body
        .split(/(\s[—–=]\s)/)
        .map((part, i) => (i % 2 === 1 ? part : wholeLineGerman(part, known) ? wrap(part, found) : wrapQuoted(part, known, found)))
        .join("") + trailing
    );
  }

  if (wholeLineGerman(body, known)) return wrap(body, found) + trailing;
  return wrapQuoted(body, known, found) + trailing;
}

function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|");
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

export type AnnotatedLesson = {
  markdown: string;
  /** Every German phrase found, in reading order, without duplicates. */
  phrases: string[];
};

export function annotateGerman(markdown: string, extraKnown: string[] = []): AnnotatedLesson {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const known = new Set(extraKnown.map(normalizePhrase).filter(Boolean));
  const found: string[] = [];

  // Pass 1: learn this lesson's German phrases from tables and bold labels.
  let headerCol = -1;
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) inCode = !inCode;
    if (inCode) continue;
    if (/^\s*\|/.test(line)) {
      const next = lines[i + 1] ?? "";
      if (headerCol === -1 && isSeparatorRow(next)) {
        headerCol = splitRow(line).findIndex((c) => /german|deutsch/i.test(c));
      } else if (headerCol >= 0 && !isSeparatorRow(line)) {
        const cell = splitRow(line)[headerCol];
        if (cell) known.add(normalizePhrase(cell));
      }
    } else {
      headerCol = -1;
      const bold = /^\s*\*\*([^*()]+?)\s*\([^)]*\)\*\*\s*$/.exec(line);
      if (bold && looksGerman(bold[1])) known.add(normalizePhrase(bold[1]));
    }
  }

  // Pass 2: rewrite.
  headerCol = -1;
  inCode = false;
  let afterWrongLabel = false;
  const out = lines.map((line, i) => {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      return line;
    }
    if (inCode) return line;
    if (!line.trim()) {
      headerCol = -1; // a blank line ends a table; the next table has its own header
      return line;
    }

    // Wrong examples ("Falsch: Ich heißt Anna.") must not be read aloud as models.
    if (WRONG_LABEL.test(line)) {
      afterWrongLabel = WRONG_LABEL_ONLY.test(line);
      return line;
    }
    if (afterWrongLabel) {
      afterWrongLabel = false;
      // A list of wrong examples may follow; skip only the first line after the label.
      return line;
    }

    // Explicit marks first: [Hallo](say)
    if (SPEECH_MARK.test(line)) {
      return line.replace(/\[([^\]]+)\]\(\s*(?:say|de|speak)\s*\)/gi, (_m, text: string) => {
        addPhrase(found, text.trim());
        return `[${text}](${makeSpeechLink(text)})`;
      });
    }
    if (/\]\(/.test(line)) return line; // author's own links: leave alone
    if (/^\s*#/.test(line) || /^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      headerCol = -1;
      return line;
    }

    // Tables: wrap the German column.
    if (/^\s*\|/.test(line)) {
      const next = lines[i + 1] ?? "";
      if (headerCol === -1 && isSeparatorRow(next)) {
        headerCol = splitRow(line).findIndex((c) => /german|deutsch/i.test(c));
        return line;
      }
      if (headerCol < 0 || isSeparatorRow(line)) return line;
      const cells = splitRow(line);
      if (cells[headerCol] !== undefined && cells[headerCol].trim()) {
        cells[headerCol] = ` ${wrap(cells[headerCol].trim(), found)} `;
      }
      return `|${cells.join("|")}|`;
    }
    headerCol = -1;

    // **Hallo (Hello)**
    const boldPair = /^(\s*\*\*)([^*()]+?)(\s*\([^)]*\)\*\*\s*)$/.exec(line);
    if (boldPair) {
      return looksGerman(boldPair[2], known) ? boldPair[1] + wrap(boldPair[2], found) + boldPair[3] : line;
    }

    // **Tschüss**
    const boldOnly = /^(\s*\*\*)([^*]+)(\*\*\s*)$/.exec(line);
    if (boldOnly) {
      return wholeLineGerman(boldOnly[2], known)
        ? boldOnly[1] + wrap(boldOnly[2], found) + boldOnly[3]
        : boldOnly[1] + wrapQuoted(boldOnly[2], known, found) + boldOnly[3];
    }

    // **Anna:** Hallo, Max!   /  Anna: Hallo, Max!
    const speaker =
      /^(\s*(?:[-*+]\s+)?\*\*[^*]{1,40}:\*\*\s*)(.+)$/.exec(line) ??
      /^(\s*(?:[-*+]\s+)?[A-ZÄÖÜ][\wäöüß.]*(?: [A-ZÄÖÜ][\wäöüß.]*)?:\s+)(.+)$/.exec(line);
    if (speaker) return speaker[1] + annotateText(speaker[2], known, found);

    // Lists: "- Hallo, Anna!", "1. Hallo", "- [ ] …"
    const item = /^(\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)(.*)$/.exec(line);
    if (item) {
      const option = /^([A-Z][.)]\s+)(.*)$/.exec(item[2]);
      if (option) return item[1] + option[1] + annotateText(option[2], known, found);
      return item[1] + annotateText(item[2], known, found);
    }

    // Answer options on their own line: "A. Gute Nacht"
    const option = /^(\s*[A-Z][.)]\s+)(.+)$/.exec(line);
    if (option) return option[1] + annotateText(option[2], known, found);

    // Any other line of text.
    return annotateText(line, known, found);
  });

  return { markdown: out.join("\n"), phrases: found };
}
