# Learning Platform API

One NestJS API (+ MySQL/Prisma) that serves the Admin CMS, the website and every
language app (German A1, A2, B1, B2, C1 … later other languages).

- Base URL: `/api` (e.g. `https://api.your-domain.com/api/health`)
- Admin routes need `Authorization: Bearer <admin access token>`
- Learner routes need `Authorization: Bearer <learner access token>`
- Full route list: `../../docs/API_FInal.md`

## Run locally

```bash
cp .env.example .env          # fill in values (openssl rand -hex 32 for secrets)
npm install
npx prisma migrate deploy     # or: npm run db:migrate (dev)
npm run seed && npm run seed:admin
npm run start:dev
```

Checks before every deploy:

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

## Folder layout

```
src/
  common/           shared helpers used by every module
    validation.ts            validate(schema, input), idSchema, ?permanent=true parser
    prisma-exception.filter  DB errors -> 404 / 409 instead of 500
    permanent-delete.service Super-Admin hard delete + audit log
    bigint-json.ts           BigInt columns serialise to JSON
  <feature>/        one folder per feature: controller (routes) + service (logic) + schemas (Zod)
```

New controllers: import `validate` from `common/validation.js`; do not copy a local helper.

## Delete rules (same for every resource)

| Request | Who | What happens |
|---|---|---|
| `DELETE /api/<resource>/:id` | role of that resource | **Safe delete** – archive / deactivate. Reversible, learners keep progress. |
| `DELETE /api/<resource>/:id?permanent=true` | **SUPER_ADMIN only** | **Permanent delete** – row and its children are removed, an `PERMANENT_DELETE` audit-log row is written. Returns **409** if something still uses it (e.g. a language that still has courses). |

| Resource | Safe delete does | Permanent delete also removes |
|---|---|---|
| `/admin/courses/:id` | status → ARCHIVED | modules, lessons, translations, resources, learner lesson progress |
| `/admin/courses/modules/:id` | status → ARCHIVED | lessons (+ above) |
| `/admin/courses/lessons/:id` | status → ARCHIVED | translations, resources, learner progress |
| `/admin/vocabulary/:id` | status → ARCHIVED | translations, examples, deck items, learner progress |
| `/admin/vocabulary/categories/:id` | isActive → false | translations (words keep, category emptied) |
| `/admin/quizzes/:id` | status → ARCHIVED | questions, options, attempts |
| `/admin/quizzes/questions/:id` | delete (draft quiz, no answers) | also when learners answered |
| `/admin/flashcards/decks/:id` | unpublish | deck items |
| `/admin/apps/:id` **(new)** | isActive → false | config, ad config, decks, course links (409 if subscriptions exist) |
| `/admin/languages/:code` **(new)** | isActive → false | level assignments (409 if any content uses it) |
| `/admin/languages/:code/levels/:levelId` **(new)** | level disabled | assignment row |
| `/admin/ads/:id` | disabled | ad config |
| `/admin/promotions/codes/:id` | disabled | promo code (409 if redeemed) |
| `/admin/web-ads/placements/:id` | archived | placement (409 while campaigns use it) |
| `/admin/web-ads/campaigns/:id` | archived | campaign + its click/impression events |
| `/admin/announcements/:id` **(new)** | archived | translations, targets, inbox copies |
| `/admin/audiences/:id` **(new)** | deactivated | audience (409 if targeted) |
| `/admin/consent/policies/:id` **(new)** | deactivated | policy (409 if learners accepted) |
| `/admin/notification-templates/:id` **(new)** | deactivated | template |
| `/admin/notification-providers/:id` **(new)** | disabled | provider config |
| `/admins/:id` | deactivated | admin (must be deactivated first, not yourself) |
| `/users/:id` **(new)** | blocked + logged out everywhere | learner account; anonymised instead if payments exist |
| `/media/:id` | — | file in R2 + row (409 while used by vocabulary, lessons, announcements) |
| `/imports/jobs/:id` **(new)** | — | finished import job history (words stay) |
| `/admin/documents/jobs/:id` **(new)** | — | finished conversion job (PDF stays in media) |

### Learner: delete my account (new)

Apple App Store and Google Play require in-app account deletion.

```http
DELETE /api/auth/learner/me
Authorization: Bearer <learner access token>
Content-Type: application/json

{ "password": "current password" }
```

Response: `{ "success": true, "mode": "deleted" }` (or `"anonymized"` when the
learner has payment records that must be kept for accounting).

## Mobile apps (React Native) – staying logged in

Browsers keep the refresh token in an HttpOnly cookie. React Native apps should
send `X-Client-Type: mobile` instead:

1. `POST /api/auth/learner/login` with header `X-Client-Type: mobile`
   → response also contains `refreshToken`. Save it in SecureStore/Keychain.
2. When the access token expires (15 min):
   `POST /api/auth/learner/refresh` with header `X-Client-Type: mobile` and body
   `{ "refreshToken": "<saved token>" }` → new `accessToken` **and a new
   `refreshToken`** (rotate: always save the new one).
3. Logout: `POST /api/auth/learner/logout` with body `{ "refreshToken": "..." }`.

The website does not need any change.

## Production notes (Hostinger VPS)

- Never commit `.env`. Rotate any secret that was ever pushed to GitHub.
- The API trusts Docker/private-network proxies (Traefik) for the client IP, so
  rate limits work per user. Override with `TRUST_PROXY` if your proxy differs.
- Payments are **not live** (`paymentReady: false`) until store/Stripe receipt
  verification is implemented.
