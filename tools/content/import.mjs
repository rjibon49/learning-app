#!/usr/bin/env node
/**
 * Pushes the course content in content/<pack>/ into the CMS through the
 * admin API: courses → modules → lessons (+ one text per language) →
 * lesson words → lesson quiz. Safe to run again: everything is matched by
 * slug (words by lesson + term) and updated instead of duplicated.
 *
 *   node tools/content/import.mjs --pack content/de-a1 \
 *     --api https://learning-api.mochiflix.com/api \
 *     --origin https://<your-cms-domain> \
 *     --email admin@example.com            # password is asked for
 *
 * Options
 *   --app <slug>       CMS app to link the courses to (default: first de/A1 app)
 *   --only <slug>      only this course slug (repeatable)
 *   --publish          publish courses, modules, lessons, words and quizzes
 *   --archive-old      archive courses of the app that are not in this pack
 *   --dry-run          show what would happen, change nothing
 *
 * Needs Node 18+. No packages to install.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const opt = (name, fallback = undefined) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const many = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []));
const flag = (name) => args.includes(`--${name}`);

const PACK = path.resolve(opt("pack", "content/de-a1"));
const API = (opt("api", process.env.CONTENT_API_URL) ?? "").replace(/\/+$/, "");
const ORIGIN = opt("origin", process.env.CONTENT_CMS_ORIGIN);
const EMAIL = opt("email", process.env.CONTENT_ADMIN_EMAIL);
const ONLY = many("only");
const PUBLISH = flag("publish");
const ARCHIVE_OLD = flag("archive-old");
const DRY = flag("dry-run");
const STATUS = PUBLISH ? "PUBLISHED" : "DRAFT";

if (!API || !ORIGIN || !EMAIL) {
  console.error("Missing --api, --origin or --email (see the top of this file).");
  process.exit(1);
}

// ---------------------------------------------------------------- helpers
const log = (...m) => console.log(...m);
const stats = { created: 0, updated: 0, skipped: 0 };

async function askPassword() {
  if (process.env.CONTENT_ADMIN_PASSWORD) return process.env.CONTENT_ADMIN_PASSWORD;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const write = rl._writeToOutput?.bind(rl);
  rl._writeToOutput = (s) => (s.includes("Password") ? write?.(s) : write?.("*"));
  const answer = await new Promise((resolve) => rl.question("Password: ", resolve));
  rl.close();
  process.stdout.write("\n");
  return answer;
}

let token = "";
async function api(method, url, body) {
  // Signing in changes nothing, so a dry run still does it (it needs the token to read).
  if (DRY && method !== "GET" && url !== "/admin/auth/login") {
    log(`  [dry-run] ${method} ${url}`);
    return { id: `dry-${Math.random().toString(36).slice(2, 10)}` };
  }
  const res = await fetch(`${API}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = typeof data?.message === "string" ? data.message : JSON.stringify(data?.message ?? data);
    throw new Error(`${method} ${url} → ${res.status} ${msg}`);
  }
  return data;
}
const list = (d) => (Array.isArray(d) ? d : d?.data ?? []);

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

// ---------------------------------------------------------------- main
async function main() {
  const pack = await readJson(path.join(PACK, "courses.json"));
  const password = await askPassword();

  const login = await api("POST", "/admin/auth/login", { email: EMAIL, password });
  token = login?.accessToken ?? login?.data?.accessToken;
  if (!token) throw new Error("Login did not return an access token.");
  log(`Signed in as ${EMAIL}${DRY ? " (dry run: nothing will be changed)" : ""}`);

  // Languages: code → id
  const langs = list(await api("GET", "/admin/languages"));
  const langId = Object.fromEntries(langs.map((l) => [l.code, l.id]));
  const target = langId[pack.language];
  if (!target) throw new Error(`Language "${pack.language}" does not exist in the CMS.`);

  const levels = await api("GET", `/admin/languages/${pack.language}/levels`);
  const levelRow = (levels.availableLevels ?? levels.levels ?? list(levels)).find(
    (l) => (l.level?.code ?? l.code) === pack.level,
  );
  const levelId = levelRow?.level?.id ?? levelRow?.levelId ?? levelRow?.id ?? null;

  // App
  const appSlug = opt("app");
  const apps = list(await api("GET", `/admin/apps?limit=100`));
  const app = appSlug
    ? apps.find((a) => a.slug === appSlug)
    : apps.find((a) => a.language?.code === pack.language && a.level?.code === pack.level);
  if (!app) throw new Error(`No CMS app found${appSlug ? ` with slug "${appSlug}"` : ` for ${pack.language}/${pack.level}`}.`);
  log(`App: ${app.name} (${app.slug})`);

  const contentLangs = new Set();
  const existingCourses = list(await api("GET", `/admin/courses?appId=${app.id}&limit=100`));

  let courseOrder = 0;
  for (const course of pack.courses) {
    courseOrder += 10;
    if (ONLY.length && !ONLY.includes(course.slug)) continue;
    log(`\nCourse: ${course.title}`);

    const courseBody = {
      title: course.title,
      slug: course.slug,
      description: course.description ?? null,
      sortOrder: courseOrder,
      status: STATUS,
      levelId,
    };
    let courseRow = list(await api("GET", `/admin/courses?search=${encodeURIComponent(course.slug)}&limit=100`)).find(
      (c) => c.slug === course.slug,
    );
    if (courseRow) {
      await api("PATCH", `/admin/courses/${courseRow.id}`, courseBody);
      stats.updated++;
    } else {
      courseRow = await api("POST", "/admin/courses", { ...courseBody, languageId: target });
      stats.created++;
    }
    const linked = (courseRow.apps ?? []).map((a) => a.appId ?? a.app?.id ?? a.id).filter(Boolean);
    await api("POST", `/admin/courses/${courseRow.id}/apps`, { appIds: [...new Set([...linked, app.id])] });

    const modules = DRY && String(courseRow.id).startsWith("dry-")
      ? []
      : list(await api("GET", `/admin/courses/modules?courseId=${courseRow.id}`));

    let moduleOrder = 0;
    for (const mod of course.modules) {
      moduleOrder += 10;
      const modBody = { title: mod.title, slug: mod.slug, description: mod.description ?? null, sortOrder: moduleOrder, status: STATUS };
      let modRow = modules.find((m) => m.slug === mod.slug);
      if (modRow) {
        await api("PATCH", `/admin/courses/modules/${modRow.id}`, modBody);
        stats.updated++;
      } else {
        modRow = await api("POST", "/admin/courses/modules", { ...modBody, courseId: courseRow.id });
        stats.created++;
      }
      log(`  Module: ${mod.title}`);

      const lessons = String(modRow.id).startsWith("dry-")
        ? []
        : list(await api("GET", `/admin/courses/lessons?moduleId=${modRow.id}`));

      let lessonOrder = 0;
      for (const slug of mod.lessons) {
        lessonOrder += 10;
        const dir = path.join(PACK, "lessons", slug);
        const meta = await readJson(path.join(dir, "lesson.json"));
        const lessonBody = { title: meta.title, slug, estimatedMinutes: meta.minutes ?? null, sortOrder: lessonOrder, status: STATUS };
        let lessonRow = lessons.find((l) => l.slug === slug);
        if (lessonRow) {
          await api("PATCH", `/admin/courses/lessons/${lessonRow.id}`, lessonBody);
          stats.updated++;
        } else {
          lessonRow = await api("POST", "/admin/courses/lessons", { ...lessonBody, moduleId: modRow.id });
          stats.created++;
        }
        log(`    Lesson: ${meta.title}`);

        // One text per language: en.md, bn.md, tr.md ...
        const files = (await readdir(dir)).filter((f) => /^[a-z]{2,3}\.md$/.test(f));
        for (const file of files) {
          const code = file.replace(/\.md$/, "");
          if (!langId[code]) {
            log(`      ! language "${code}" is not in the CMS yet — skipped ${file}`);
            stats.skipped++;
            continue;
          }
          contentLangs.add(code);
          await api("POST", `/admin/courses/lessons/${lessonRow.id}/translations`, {
            languageId: langId[code],
            title: meta.titles?.[code] ?? meta.title,
            content: await readFile(path.join(dir, file), "utf8"),
            format: "MARKDOWN",
          });
        }

        await importWords(meta, lessonRow, langId, target);
        await importQuiz(meta, lessonRow, app);
      }
    }
  }

  if (ARCHIVE_OLD && !ONLY.length) {
    const keep = new Set(pack.courses.map((c) => c.slug));
    for (const c of existingCourses) {
      if (!keep.has(c.slug) && c.status !== "ARCHIVED") {
        log(`Archiving old course: ${c.title}`);
        await api("DELETE", `/admin/courses/${c.id}`);
      }
    }
  }

  log(`\nDone. created ${stats.created}, updated ${stats.updated}, skipped ${stats.skipped}. Languages: ${[...contentLangs].join(", ")}`);
  if (!PUBLISH) log("Everything is DRAFT. Check it in the CMS, then run again with --publish.");
}

/** Lesson words: created once (matched by term), meanings + example per language. */
async function importWords(meta, lessonRow, langId, target) {
  if (!meta.words?.length) return;
  const existing = String(lessonRow.id).startsWith("dry-")
    ? []
    : list(await api("GET", `/admin/vocabulary?lessonId=${lessonRow.id}&limit=100`));

  for (const [i, w] of meta.words.entries()) {
    const grammar = {
      ...(w.article ? { article: w.article, gender: { der: "masculine", die: "feminine", das: "neuter" }[w.article] } : {}),
      ...(w.plural ? { plural: w.plural } : {}),
      ...(w.grammar ?? {}),
    };
    const body = {
      lessonId: lessonRow.id,
      term: w.term,
      pronunciation: w.ipa ? `/${w.ipa}/` : null,
      partOfSpeech: w.pos ?? null,
      grammar: Object.keys(grammar).length ? grammar : null,
      difficulty: w.difficulty ?? "EASY",
      status: STATUS,
      notes: w.notes ?? null,
    };
    let row = existing.find((v) => v.term === w.term);
    if (row) {
      await api("PATCH", `/admin/vocabulary/${row.id}`, body);
      stats.updated++;
      continue; // meanings/examples were added the first time
    }
    row = await api("POST", "/admin/vocabulary", { ...body, languageId: target });
    stats.created++;
    for (const [code, meaning] of Object.entries(w.meanings ?? {})) {
      if (langId[code]) await api("POST", `/admin/vocabulary/${row.id}/translations`, { languageId: langId[code], meaning });
    }
    if (w.example) {
      const group = `${lessonRow.id}-${i}`;
      for (const [code, text] of Object.entries(w.example)) {
        if (langId[code]) await api("POST", `/admin/vocabulary/${row.id}/examples`, { languageId: langId[code], text, translationGroupId: group });
      }
    }
  }
}

const QUIZ_MARK = "[content-pack]";

/** One quiz per lesson. Questions are replaced on every run. */
async function importQuiz(meta, lessonRow, app) {
  if (!meta.quiz?.questions?.length) return;
  const existing = String(lessonRow.id).startsWith("dry-")
    ? []
    : list(await api("GET", `/admin/quizzes?lessonId=${lessonRow.id}&limit=100`));
  const body = {
    appId: app.id,
    lessonId: lessonRow.id,
    title: meta.quiz.title ?? `Quiz: ${meta.title}`,
    description: `${meta.quiz.description ?? "Check what you learned."} ${QUIZ_MARK}`,
    difficulty: meta.quiz.difficulty ?? "EASY",
    status: "DRAFT",
    passingScore: meta.quiz.passingScore ?? 60,
  };
  let quiz = existing.find((q) => (q.description ?? "").includes(QUIZ_MARK));
  if (quiz) {
    await api("PATCH", `/admin/quizzes/${quiz.id}`, body);
    const questions = list(await api("GET", `/admin/quizzes/${quiz.id}/questions`));
    for (const q of questions) {
      // Normal delete works while nobody answered; answered questions need a Super Admin.
      await api("DELETE", `/admin/quizzes/questions/${q.id}`).catch(() =>
        api("DELETE", `/admin/quizzes/questions/${q.id}?permanent=true`),
      );
    }
  } else {
    quiz = await api("POST", "/admin/quizzes", body);
    stats.created++;
  }
  for (const [i, q] of meta.quiz.questions.entries()) {
    await api("POST", "/admin/quizzes/questions", {
      quizId: quiz.id,
      questionType: q.type ?? "MULTIPLE_CHOICE",
      questionText: q.text,
      correctAnswer: q.options ? q.options[q.answer] : q.answer,
      explanation: q.explanation ?? null,
      options: q.options?.map((text, j) => ({ text, isCorrect: j === q.answer, sortOrder: j })),
      points: 1,
      sortOrder: i,
    });
  }
  if (PUBLISH) await api("PATCH", `/admin/quizzes/${quiz.id}`, { status: "PUBLISHED" });
}

main().catch((error) => {
  console.error(`\nStopped: ${error.message}`);
  process.exit(1);
});

