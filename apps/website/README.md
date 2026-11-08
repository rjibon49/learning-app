# Wortly — Next.js German Learner Website (App Router)

**This is a Next.js + React + TypeScript version** of the learner website in the uploaded `website.zip`. It preserves the Wortly visual styling and learner journeys, but replaces the old static HTML, `server.mjs`, and imperative `main.js` with **React components, Next.js file-based routes, and a Next.js read-only API route handler**.

Your existing **NestJS API and Admin CMS are not modified**.

## Requirements

- **Node.js 20.9+** (recommend Node 22 LTS)
- npm and an internet connection **for first-time `npm install`**
- Your NestJS API running independently, default `http://127.0.0.1:4000/api`

## Run locally

1. Extract the ZIP to a clean directory.
2. In its root terminal, run `npm install`.
3. Create `.env.local` from `.env.example` and set `API_BASE_URL` to your existing API's **server-reachable** address with `/api` at the end.
4. Run `npm run dev`.
5. Open **http://localhost:3002**.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

On macOS/Linux:

```bash
cp .env.example .env.local
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm start
```

If Next.js is on the same machine as NestJS, the default `API_BASE_URL` is correct. If Next.js is hosted elsewhere, replace it with an API URL accessible to the Next.js server. The environment variable is server-side only; don't configure admin tokens in the learner website.

## Pages / Next.js routes

| URL | React component |
| --- | --- |
| `/` | `src/components/home-landing.tsx` (public homepage) |
| `/dashboard` | `src/components/overview.tsx` |
| `/courses` | `src/components/courses.tsx` |
| `/courses/[id]` | `src/components/courses.tsx` |
| `/lessons/[id]` | `src/components/lessons.tsx` |
| `/vocabulary` | `src/components/vocabulary.tsx` |
| `/flashcards` | `src/components/flashcards.tsx` |
| `/practice` | `src/components/practice.tsx` |
| `/progress` | `src/components/progress.tsx` |
| `/about` | `src/components/about.tsx` |

All routes are actual **Next.js App Router pages**, not a catch-all HTML fallback.

## Backend API integration

The frontend fetches from Next's own read-only route handler at `src/app/api/[...path]/route.ts`. The handler calls your existing NestJS API and permits only these **GET** paths:

- `/api/apps`
- `/api/courses`
- `/api/courses/modules`
- `/api/courses/lessons`
- `/api/vocabulary/categories`
- `/api/vocabulary?appId=<app-id>`

It refuses `/api/admin/*`, `/api/quizzes`, `/api/flashcards`, and all writes. It filters courses/modules/lessons against the `PUBLISHED` status of their ancestors, published vocabulary, active vocabulary categories, and active apps, so draft content is not sent through the learner proxy.

**Important:** The NestJS API's original public course endpoints may themselves return drafts. This frontend proxy filters what *this website* serves, but you should separately secure the backend before a production launch; direct API users can still access those endpoints.

## Progress and quiz data

- Progress (completed lessons, mastered words, best quiz score, selected level) remains in browser `localStorage` under the **existing key `wortly-learner-v1`**. It is not synchronized across devices.
- There is no learner login/account flow provided by the supplied API. The `L` profile icon indicates local browser progress, not an authenticated learner.
- Flashcards and practice quiz questions are generated in the browser from public, published vocabulary. They are **not** the CMS's admin-protected authored flashcard or quiz records.
- Vocabulary is limited by the existing API to **100 published words per app** until the API implements pagination.
- If the API is unreachable, the app switches to **clearly marked Preview mode**, using sample data in `src/lib/demo-data.js`. It never pretends sample content has been published in the CMS.
- `public/design-preview.html` is the previous standalone offline HTML demo for comparing the original UI; it does *not* run the Next.js application.

## Code organization

- `src/app/layout.tsx`: site layout and metadata.
- `src/app/**/page.tsx`: route entry points.
- `src/app/api/[...path]/route.ts`: secure public API gateway.
- `src/components/*`: reusable React components, controls, and learner pages.
- `src/components/learner-provider.tsx`: shared catalog data, local progress state, API loading.
- `src/lib/types.ts`: TypeScript models and speech helpers.
- `src/app/globals.css`: existing Wortly responsive styling.
- `public/favicon.svg`: existing proposed brand icon.

## Testing

With dependencies installed:

```bash
npm run test:api
npm run typecheck
npm run build
```

**Validation at handoff:** Source TypeScript/JSX syntax compilation and a mocked-backend API-gateway integration test have passed. Because npm registry access was unavailable in the build environment, `npm install` and a real Next.js production build/browser acceptance test could **not** be executed there. Run the commands above on your machine and report any specific errors.

## Deploy safely

Set `API_BASE_URL` on the Next.js server, keep the NestJS backend running, and deploy the frontend as a **Node.js Next.js application** (`next start`). This is not a static HTML export, since its server-side API route handler needs a Next.js runtime. Keep your Admin CMS deployment separate; do not overwrite its project files.

## Homepage update (v3)

See `README-HOMEPAGE.md` for the new public homepage design, how to replace only the modified files, and the standalone review preview.
