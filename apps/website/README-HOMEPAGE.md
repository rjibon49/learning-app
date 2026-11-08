# Wortly Homepage v3 — Next.js App Router

This update replaces only the public homepage and makes the previous learning dashboard accessible at `/dashboard`.

## New homepage

The design includes a responsive header and navigation, hero with CSS-designed learning card, benefits and feature cards, a four-step learning guide, A1–C1 roadmap, sample interactive preview, CMS-backed published course selection, FAQs, CTA and footer.

- `/` → New marketing/intro homepage (`src/components/home-landing.tsx` and `src/app/home.css`).
- `/dashboard` → Previous Overview dashboard (same `src/components/overview.tsx`).
- The dashboard navigation item now points to `/dashboard` in `src/components/ui.tsx`.
- All other page routes and the Next.js API gateway remain unchanged.
- No Admin CMS or NestJS API files are changed.

## Installation

**Recommended:** Use `wortly-nextjs-homepage-v3.zip` as the updated project in a separate directory (keep your existing project as a backup). You do not need to copy the old static HTML or `server.mjs`.

**Patch option:** Extract the `wortly-homepage-replacement-files.zip` patch into your existing Next.js project root, preserving directory paths. It changes the homepage, adds `/dashboard`, and changes only one navigation entry. All CSS is namespaced `lp-` to avoid changing other pages.

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local # only if you don't already have .env.local
npm install
npm run dev
```

Visit `http://localhost:3002`. Note that if you already have `.env.local`, **keep your existing API_BASE_URL** configuration. Do not overwrite it with the example file.

## Preview

Open `public/homepage-preview.html` in a browser to see the standalone sample design without starting Next.js. The preview is a **self-contained HTML file** (CSS and preview interactions are embedded). Try the tabs, flip card, quiz and mobile menu. Links to other website pages only work in the running Next.js application.

The preview's course names are illustrative examples. The live Next.js page instead reads published courses through your existing read-only API gateway, with a clearly labelled demo mode if the API is unavailable. Levels unavailable in the CMS are identified as a planned path, rather than as published lessons.

## Current limitations

- Progress is still saved in the browser's local storage, not in a cloud account.
- Sample preview content is explicitly sample content, not a live CMS lesson.
- Audio in the sample preview uses browser text-to-speech and requires a compatible browser.
- `npm install` and a real `next build` could not be run in this environment because the npm registry was unreachable. TSX parsing, the API gateway tests, and viewport screenshot/layout checks were executed.
