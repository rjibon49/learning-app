#!/usr/bin/env node
/**
 * Adds a new explanation language to a content pack by machine-translating
 * the English text. German stays German.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... node tools/content/translate.mjs --pack content/de-a1 --to tr
 *
 * For every lesson it writes <to>.md (from en.md), and fills titles.<to>,
 * words[].meanings.<to> and words[].example.<to> in lesson.json.
 * Existing translations are kept (use --force to redo them). Machine
 * translations are listed in lesson.json "machineTranslated" so a native
 * speaker can review them.
 *
 * Then add the language in the CMS (Languages page, e.g. code "tr") and run
 * tools/content/import.mjs again: learners can pick it in the app.
 *
 * Options: --to <code> (required, repeatable) · --only <lesson-slug> · --force
 *          --model <name> (default claude-sonnet-5-5) · --dry-run
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d;
};
const many = (n) => args.flatMap((a, i) => (a === `--${n}` && args[i + 1] ? [args[i + 1]] : []));
const PACK = path.resolve(opt("pack", "content/de-a1"));
const TARGETS = many("to");
const ONLY = many("only");
const FORCE = args.includes("--force");
const DRY = args.includes("--dry-run");
const MODEL = opt("model", "claude-sonnet-5-5");
const KEY = process.env.ANTHROPIC_API_KEY;

if (!TARGETS.length) {
  console.error("Use --to <language code>, e.g. --to tr");
  process.exit(1);
}
if (!KEY && !DRY) {
  console.error("Set ANTHROPIC_API_KEY (console.anthropic.com).");
  process.exit(1);
}

let languageNames = {};
try {
  languageNames = new Intl.DisplayNames(["en"], { type: "language" });
} catch {
  languageNames = { of: (c) => c };
}
const nameOf = (code) => languageNames.of(code) ?? code;

async function ask(system, user) {
  if (DRY) return `[${user.length} chars would be translated]`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 16000, system, messages: [{ role: "user", content: user }] }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.content.map((c) => c.text ?? "").join("").trim();
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, attempt * 5000));
      continue;
    }
    throw new Error(`Translation API ${res.status}: ${await res.text()}`);
  }
}

const RULES = (lang) => `You translate lessons of a German course for learners whose language is ${nameOf(lang)}.
Rules:
- Translate ONLY the explanations from English into ${nameOf(lang)}.
- Never translate, change or remove German words, German sentences or German examples.
- Keep the Markdown exactly: headings, tables, lists, bold, links like [Hallo](say) — same number of lines and table columns.
- In tables keep the column headed "Deutsch" unchanged (header and cells).
- Write simply and clearly for beginners. Output only the translated text, nothing else.`;

async function translateLesson(dir, lang) {
  const metaFile = path.join(dir, "lesson.json");
  const meta = JSON.parse(await readFile(metaFile, "utf8"));
  const out = path.join(dir, `${lang}.md`);
  let changed = false;

  if (FORCE || !existsSync(out)) {
    const en = await readFile(path.join(dir, "en.md"), "utf8");
    const text = await ask(RULES(lang), en);
    if (!DRY) await writeFile(out, `${text}\n`);
    changed = true;
  }

  // Titles, meanings and example sentences in one small JSON round trip.
  const need = {
    title: FORCE || !meta.titles?.[lang] ? meta.titles?.en ?? meta.title : undefined,
    words: (meta.words ?? []).map((w) => ({
      meaning: FORCE || !w.meanings?.[lang] ? w.meanings?.en : undefined,
      example: w.example && (FORCE || !w.example[lang]) ? w.example.en : undefined,
    })),
  };
  const pending = need.title || need.words.some((w) => w.meaning || w.example);
  if (pending && !DRY) {
    const reply = await ask(
      `${RULES(lang)}\nYou receive JSON. Return the same JSON with every string value translated. Return JSON only.`,
      JSON.stringify(need),
    );
    const done = JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    meta.titles = { ...(meta.titles ?? {}), ...(done.title ? { [lang]: done.title } : {}) };
    (meta.words ?? []).forEach((w, i) => {
      const t = done.words?.[i] ?? {};
      if (t.meaning) w.meanings = { ...(w.meanings ?? {}), [lang]: t.meaning };
      if (t.example && w.example) w.example[lang] = t.example;
    });
    changed = true;
  }

  if (changed && !DRY) {
    meta.machineTranslated = [...new Set([...(meta.machineTranslated ?? []), lang])];
    await writeFile(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  }
  return changed;
}

const lessonsDir = path.join(PACK, "lessons");
const slugs = (await readdir(lessonsDir)).filter((s) => !ONLY.length || ONLY.includes(s)).sort();
for (const lang of TARGETS) {
  let n = 0;
  for (const slug of slugs) {
    process.stdout.write(`${lang} · ${slug} … `);
    const changed = await translateLesson(path.join(lessonsDir, slug), lang);
    console.log(changed ? "translated" : "already there");
    if (changed) n++;
  }
  console.log(`\n${nameOf(lang)}: ${n} lessons translated. Add "${lang}" in the CMS, then run import.mjs again.\n`);
}
