#!/usr/bin/env node
/**
 * Checks a content pack before it is imported:
 *   node tools/content/validate.mjs --pack content/de-a1
 * Exits with code 1 and a list of problems if anything is wrong.
 */
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const i = process.argv.indexOf("--pack");
const PACK = path.resolve(i > 0 ? process.argv[i + 1] : "content/de-a1");
const problems = [];
const bad = (where, msg) => problems.push(`${where}: ${msg}`);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const POS = new Set(["NOUN", "VERB", "ADJECTIVE", "ADVERB", "PRONOUN", "PREPOSITION", "CONJUNCTION", "INTERJECTION", "NUMERAL", "PHRASE", "ARTICLE"]);

const pack = JSON.parse(await readFile(path.join(PACK, "courses.json"), "utf8"));
const seen = new Set();
let lessons = 0, words = 0, questions = 0;
const languages = new Set();

for (const c of pack.courses) {
  if (!SLUG.test(c.slug)) bad(c.slug, "course slug must be lowercase-with-dashes");
  if (!c.title || c.title.length < 2 || c.title.length > 200) bad(c.slug, "course title 2–200 characters");
  for (const m of c.modules) {
    if (!SLUG.test(m.slug)) bad(m.slug, "module slug");
    if (!m.title || m.title.length > 200) bad(m.slug, "module title");
    for (const slug of m.lessons) {
      lessons++;
      const where = `lessons/${slug}`;
      if (seen.has(slug)) bad(where, "used twice in courses.json");
      seen.add(slug);
      if (!SLUG.test(slug) || slug.length > 120) bad(where, "lesson slug");
      const dir = path.join(PACK, "lessons", slug);
      if (!existsSync(path.join(dir, "lesson.json"))) { bad(where, "lesson.json missing"); continue; }
      if (!existsSync(path.join(dir, "en.md"))) bad(where, "en.md missing (English is the base language)");

      const meta = JSON.parse(await readFile(path.join(dir, "lesson.json"), "utf8"));
      if (!meta.title || meta.title.length < 2 || meta.title.length > 200) bad(where, "title 2–200 characters");
      if (meta.minutes != null && !(Number.isInteger(meta.minutes) && meta.minutes > 0)) bad(where, "minutes");

      for (const f of (await readdir(dir)).filter((f) => /^[a-z]{2,3}\.md$/.test(f))) {
        languages.add(f.slice(0, -3));
        const md = await readFile(path.join(dir, f), "utf8");
        if (!md.trim()) bad(`${where}/${f}`, "empty");
        if (md.length > 500000) bad(`${where}/${f}`, "too long");
        // Every table row must have as many cells as its header.
        let cols = null;
        md.split("\n").forEach((line, n) => {
          if (!/^\s*\|/.test(line)) { cols = null; return; }
          const count = line.trim().replace(/^\||\|$/g, "").split("|").length;
          if (cols === null) cols = count;
          else if (count !== cols) bad(`${where}/${f}:${n + 1}`, `table row has ${count} cells, header has ${cols}`);
        });
      }

      for (const [k, w] of (meta.words ?? []).entries()) {
        words++;
        const ww = `${where} word ${k + 1} (${w.term})`;
        if (!w.term) bad(ww, "term missing");
        if (w.article && !["der", "die", "das"].includes(w.article)) bad(ww, "article must be der/die/das");
        if (w.pos === "NOUN" && !w.article && !w.allowNoArticle && !/^[A-ZÄÖÜ]/.test(w.term)) bad(ww, "nouns start with a capital letter");
        if (w.pos && !POS.has(w.pos)) bad(ww, `unknown part of speech ${w.pos}`);
        if (!w.meanings?.en) bad(ww, "English meaning missing");
        if (w.example && !w.example.de) bad(ww, "example without German sentence");
      }

      const qs = meta.quiz?.questions ?? [];
      for (const [k, q] of qs.entries()) {
        questions++;
        const qw = `${where} question ${k + 1}`;
        if (!q.text) bad(qw, "text missing");
        if (q.options) {
          if (q.options.length < 2 || q.options.length > 30) bad(qw, "2–30 options");
          if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) bad(qw, "answer index out of range");
          if (new Set(q.options).size !== q.options.length) bad(qw, "duplicate options");
        }
      }
    }
  }
}

for (const dir of await readdir(path.join(PACK, "lessons"))) {
  if (!seen.has(dir)) bad(`lessons/${dir}`, "folder is not listed in courses.json");
}

console.log(`${pack.courses.length} courses, ${lessons} lessons, ${words} words, ${questions} quiz questions. Languages: ${[...languages].sort().join(", ")}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("OK");
