# Course content packs

Lessons live here as plain files, so they can be reviewed in GitHub, translated by
script and pushed into the CMS in one go. The CMS stays the place where you can
still fix small things by hand.

```
content/de-a1/
  courses.json                      courses → modules → lesson slugs (order = order in the app)
  lessons/<lesson-slug>/
    lesson.json                     title, minutes, words (meanings + example per language), quiz
    en.md                           lesson text in English (base language, required)
    bn.md                           lesson text in Bangla
    tr.md, ar.md …                  more languages (made by translate.mjs or written by hand)
```

## Writing a lesson

- Markdown. Use `##` headings, tables, lists and `> **Tip:**` boxes.
- Put German in a table column headed **Deutsch** — the app reads every cell aloud.
- Dialogues: `**Anna:** Hallo! Wie geht's?`
- In other text: `German — meaning`, or German "in quotes", or `[Hallo](say)`.
- Never mix German and explanation in one line without quotes or ` — `.
- Course, module and lesson titles: `German · English` (they are not translated).

## Commands (Node 18+, nothing to install)

```bash
# 1. check the pack
node tools/content/validate.mjs --pack content/de-a1

# 2. add a language (machine translation from English, needs an Anthropic API key)
ANTHROPIC_API_KEY=... node tools/content/translate.mjs --pack content/de-a1 --to tr --to ar

# 3. push to the CMS (asks for the password). First as DRAFT, look at it, then --publish
node tools/content/import.mjs --pack content/de-a1 \
  --api https://learning-api.mochiflix.com/api --email <admin-email>
node tools/content/import.mjs ... --publish
node tools/content/import.mjs ... --publish --archive-old   # also archive the app's old courses
```

The import matches everything by slug, so running it again updates instead of
duplicating. A new language must exist in the CMS (Languages page) before its
texts can be imported; then learners can pick it in the app under
Settings → Explanation language.

Quiz questions are stored in English (the CMS has no per-language quiz text yet).
