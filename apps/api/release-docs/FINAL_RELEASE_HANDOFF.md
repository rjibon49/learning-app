# Global Learning Platform API — Conservative Consolidated Release (2026-11-14)

Source: the user's latest `api(3).zip`. This is a FULL API directory, not a patch-only ZIP.

## Preservation guarantee / diff scope
- All originally supplied project files are included.
- Only 3 existing source files were edited:
  1. `src/notifications/notification-queue.service.ts`: manual retry only for errorCode=PROVIDER_TEMPORARY, with CAS guard to prevent retry of uncertain SMTP sends, expired leases and worker exceptions.
  2. `src/notifications/unsubscribe.controller.ts`: safe GET confirmation page, POST remains the ONLY preference-changing action; explicit no-store, no-referrer and restrictive CSP.
  3. `src/notifications/reliable-notification-worker.service.ts`: unsubscribe URL now points at actual registered `/API_PREFIX/notifications/unsubscribe` route, not a nonexistent `/unsubscribe` path.
- No source files removed, renamed or moved. No changes to Prisma schema, migrations, SQL, billing, authentication, ads, media, or other functional modules.
- Added `release-docs/FINAL_RELEASE_HANDOFF.md` and `release-docs/ENV_PRODUCTION_PHASE8.example` only.

## Verification (environment limitations)
- Parsed all 228 TS files in `src`: **0 syntax diagnostics** using globally available TypeScript 5.8 parser.
- Inspected 680 relative import references: 1 artifact-generated reference (`src/generated/prisma/internal/prismaNamespace.ts -> ./generated/prisma/client`); generated code is regenerated via Prisma. All ordinary source imports resolve.
- Compared all original ZIP file bytes against final: exactly the 3 code files above changed; nothing deleted.
- NOT RUN here: full `npx tsc --noEmit`, `npm run build`, Prisma validate/migrate against the user's DB, endpoint/integration tests; node_modules, credentials and database connection unavailable in this environment. User must run below before deployment.

## Local verification — Windows CMD
```
cd /d D:\app\learning-app\apps\api
npx prisma validate
npx prisma migrate status
npx prisma generate
npx tsc --noEmit
npm run build
npm run start:dev
```
Check startup logs for billing, notifications and private inbox routes. GET `/api/notifications/unsubscribe?token=...` renders a confirmation page; only POST to same endpoint changes preferences.

## Release safety
1. Stage and back up existing source and production MySQL before migration; NEVER use `migrate reset` or execute `prisma-pending-changes.sql` blindly.
2. Confirm current migration history exactly matches production. Use `npx prisma migrate deploy` only after backup and review.
3. Worker flags on normal API processes: `NOTIFICATION_QUEUE_WORKER_ENABLED=false`, `NOTIFICATION_DELIVERY_WORKER_ENABLED=false`, `NOTIFICATION_WORKER_PROCESS=false`, `NOTIFY_EMAIL_SEND_ENABLED=false`. Keep sending disabled until SMTP settings, suppression/bounces, and web-facing unsubscribe flow are verified with a real message.
4. `NOTIFY_PUBLIC_BASE_URL` must be the PUBLIC API origin (e.g. `https://api.example.com`), not a frontend domain. `/api` is appended from `API_PREFIX`. Use `NOTIFY_UNSUBSCRIBE_READY=false` until the URL is HTTPS reachable and POST works.
5. Existing `NotificationCompletionModule` and old Inbox modules are present for source preservation but not registered in the active AppModule; do not activate them alongside the new modules.
6. User-visible billing cancellation/refund APIs create/manage requests only; this release does NOT implement external Stripe/Apple/Google confirmation webhooks or perform real payouts/refunds. Do not claim refunded/terminated on a local admin approval.
7. WhatsApp/SMS, push, provider bounce suppression, and payment provider fulfillment are NOT operational in this source. Keep unavailable channels disabled; these do not block CMS development.
8. Inspect `git diff` and commit on `development/phase8-notifications`; do not automatically push main. Deployment should use reviewed environment configuration and a database backup.

## Static output checks
See this document for scoped changes; no whole-repo runtime certification is claimed.
