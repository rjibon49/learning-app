Learning Platform — API Master Handoff
Document version: 1.0 (12 November 2026)
Status: Implementation handoff to Admin CMS; source changes reported compiled, but end-to-end production verification remains pending.
Project root: D:\app\learning-app
API root: D:\app\learning-app\apps\api
Admin root: D:\app\learning-app\apps\admin
Website root: D:\app\learning-app\apps\website
Mobile root: D:\app\learning-app\apps\mobile
This is an implementation inventory from the development conversation, not an independently generated OpenAPI specification. Endpoint paths reflect the most recent supplied controller code. Some older CMS URLs must be migrated. Confirm actual routes against the running API before release.

1. Platform goals and boundaries
- One NestJS API, one Admin CMS and MySQL/Prisma database supporting German, French, English, Spanish, Japanese, Korean, Arabic, Bangla and additional languages.
- Dynamic proficiency frameworks: CEFR, JLPT, TOPIK and future custom levels.
- Separate learning language from explanation/translation language.
- German A1/A2/B1/B2/C1 seeded as independent app configurations, with shared data models for future apps.
- Completely separate from MochiFlix: no shared DB, credentials, authentication, R2 bucket or project application containers. A single VPS may host isolated stacks.
- Email verification: 6-digit code, nominal 10-minute expiry, resend cooldown and failed attempt limit. Website/mobile verification UI should explicitly say “Check Inbox and Spam/Junk”.
- R2 images optimized to WebP; PDF validated; Office conversion designed as asynchronous independent worker.
2. Stack, conventions and runtime
Component	Current design
API	NestJS 12 / TypeScript, Express adapter
ORM	Prisma 7.10.1 with MySQL / MariaDB adapter
Database	Local MySQL learning_app at 127.0.0.1:3306 during development
Validation	Zod 4 schemas
Authentication	Separate Admin JWT and Learner JWT, Argon2id passwords, rotating refresh tokens
Object storage	Private Cloudflare R2 with time-limited signed access URLs
Images	Sharp → WebP
Documents	LibreOffice headless, independent worker (testing deferred)
Tests	Vitest (npm test, not Jest --runInBand)
Base API	http://localhost:4000/api in development (API_PREFIX=api)
API versioning	/api/v1 not implemented; existing /api prefix preserved


3. Development status and achievements
Phase	Delivered	Verified status
1	Environment configuration, HTTP security, health endpoint	API successfully started earlier
2	Fresh multilingual schema and baseline migration	prisma validate, migration status, language seed confirmed
3.1	Language Manager	User reported no language-related TS errors
3.2	Dynamic Apps Manager and German A1–C1 seed	User reported complete
3.3	Course, modules, lessons, translations, resources	User reported course errors resolved
3.4	Vocabulary, categories, translations and examples	User reported errors resolved
3.5	Quiz authoring and safe public quiz projection	User proceeded to next phase; runtime QA pending
3.6	Flashcards and admin progress reporting	User proceeded to next phase; runtime QA pending
3.7A	Learner login, refresh, password reset	User reported complete
3.7B	Learner progress, reviews, streaks and quiz submission	User reported complete
3.8A	Media handling, WebP/PDF, R2 and CMS media client adjustment	User reported complete
3.8B	Asynchronous Office conversion worker	Code supplied; worker tests explicitly deferred
3.9A	Subscription checkout intent (fail-closed), entitlements	User reported complete; no live payment gateway
3.9B	Ads, promotions, referral linking	User reported complete; financial reward fulfillment pending
3.10	Vocabulary import API and background worker	User reported TypeScript errors cleared; worker tests deferred
3.11	Admins, Settings, Audit Logs and Activity hardening	Code supplied; runtime testing not confirmed
3.11E	Admin Auth security hardening	Code supplied; verify login/refresh/logout after changes


Confirmed seed output: languages: 8, frameworks: 3, levels: 17, languageLevels: 47.
Important: Source-level compilation is not evidence of full authorization, session security, payment or background processing correctness.
4. Endpoint registry
Legend: Public = no login; Admin = Admin JWT (role checks vary); Learner = Learner JWT; Cookie = refresh HttpOnly cookie. IDs are Prisma CUID strings. All paths start at /api.
4.1 System health and public settings
Method	Path	Access	Notes
GET	/health	Public	Returns DB status (full path /api/health)
GET	/settings/public	Public	Allowlisted public platform settings
GET	/settings	Super Admin	All allowlisted settings
PUT	/settings/:key	Super Admin	Validated setting update
DELETE	/settings/:key	Super Admin	Delete and audit


4.2 Admin authentication and administration
Method	Path	Access	Notes
POST	/admin/auth/login	Public	Credentials; returns admin + accessToken; sets refresh cookie
POST	/admin/auth/refresh	Cookie + Origin	Rotates refresh token
POST	/admin/auth/logout	Cookie + Origin	Revokes refresh session
POST	/admin/auth/logout-all	Admin JWT	Revokes all sessions + increments authVersion
GET	/admin/auth/me	Admin JWT	Current admin
GET	/admins	Super Admin	Paginated list
POST	/admins	Super Admin	Create admin
PATCH	/admins/:id	Super Admin	Update role/status/password
DELETE	/admins/:id	Super Admin	Deactivate, not hard delete
GET	/audit-logs	Super Admin	Paginated filters: admin, action, entity, date


4.3 Learner registration and authentication
Method	Path	Access	Notes
POST	/auth/register	Public	Email, displayName, password; OTP sent by SMTP
POST	/auth/verify-email	Public	Email + six-digit code
POST	/auth/learner/login	Public	JWT access token + refresh cookie
POST	/auth/learner/refresh	Cookie	Refresh/rotate
POST	/auth/learner/logout	Cookie	Logout
GET	/auth/learner/me	Learner	Current learner profile
POST	/auth/learner/forgot-password	Public	Email recovery token
POST	/auth/learner/reset-password	Public	Token + new password


4.4 Languages and proficiency
Method	Path	Access	Notes
GET	/languages	Public	Active language catalog
GET	/languages/:code/levels	Public	Enabled levels by language
GET	/admin/languages	Admin	Full catalog
GET	/admin/languages/frameworks	Admin	CEFR/JLPT/TOPIK
GET	/admin/languages/:code/levels	Admin	Complete assignments
POST	/admin/languages	Admin (manager roles)	Create language
PATCH	/admin/languages/:code	Admin (manager roles)	Update language
POST	/admin/languages/:code/levels	Admin (manager roles)	Assign enabled levels


4.5 Apps
Method	Path	Access	Notes
GET	/apps	Public	Active apps, search/page/language/level filters
GET	/apps/:slug	Public	Public app details/config
GET	/admin/apps	Admin	Includes inactive apps
GET	/admin/apps/:id	Admin	Full details
POST	/admin/apps	Admin (manager roles)	Create
PATCH	/admin/apps/:id	Admin (manager roles)	Update
PATCH	/admin/apps/:id/config	Admin (manager roles)	Ads, guest mode, locales, subscription settings
PATCH	/admin/apps/:id/status	Admin (manager roles)	Activate/deactivate


4.6 Courses, modules, lessons and lesson media
Method	Path	Access	Notes
GET	/courses	Public	Published courses
GET	/courses/:id	Public	Published course/module tree
GET	/courses/modules?courseId=:id	Public	Published modules
GET	/courses/lessons?moduleId=:id	Public	Published lesson list
GET	/courses/lessons/:id	Public	Published lesson content/resources
GET	/admin/courses	Admin	Course list/filter
POST	/admin/courses	Admin	Create course
GET	/admin/courses/:id	Admin	Course/editor details
PATCH	/admin/courses/:id	Admin	Update
DELETE	/admin/courses/:id	Admin manager	Archive
POST	/admin/courses/:id/apps	Admin manager	Set linked apps
GET	/admin/courses/modules?courseId=:id	Admin	Modules
POST	/admin/courses/modules	Admin	Create module
PATCH	/admin/courses/modules/:id	Admin	Update module
DELETE	/admin/courses/modules/:id	Admin manager	Archive module
GET	/admin/courses/lessons?moduleId=:id	Admin	Lessons
POST	/admin/courses/lessons	Admin	Create lesson
GET	/admin/courses/lessons/:id	Admin	Editor details
PATCH	/admin/courses/lessons/:id	Admin	Update
DELETE	/admin/courses/lessons/:id	Admin manager	Archive
POST	/admin/courses/lessons/:id/translations	Admin	Upsert localized lesson text
DELETE	/admin/courses/lessons/:id/translations/:languageId	Admin	Delete translation
POST	/admin/courses/lessons/:id/resources	Admin	Attach MediaAsset
PATCH	/admin/courses/lessons/:id/resources/:resourceId	Admin	Update association
DELETE	/admin/courses/lessons/:id/resources/:resourceId	Admin	Detach resource


4.7 Vocabulary, categories, translations and examples
Method	Path	Access	Notes
GET	/vocabulary	Public	Published vocabulary
GET	/vocabulary/:id	Public	Published item details
GET	/vocabulary/categories	Public	Active categories
GET	/admin/vocabulary	Admin	All items
POST	/admin/vocabulary	Admin	New word
GET	/admin/vocabulary/:id	Admin	Full word
PATCH	/admin/vocabulary/:id	Admin	Update
DELETE	/admin/vocabulary/:id	Admin manager	Archive
GET	/admin/vocabulary/categories	Admin	Categories
POST	/admin/vocabulary/categories	Admin	Create category
PATCH	/admin/vocabulary/categories/:id	Admin	Update
DELETE	/admin/vocabulary/categories/:id	Admin manager	Deactivate
POST	/admin/vocabulary/categories/:id/translations	Admin	Upsert localized category
DELETE	/admin/vocabulary/categories/:id/translations/:languageId	Admin	Remove localized category
POST	/admin/vocabulary/:id/translations	Admin	Add meaning
PATCH	/admin/vocabulary/:id/translations/:translationId	Admin	Update meaning
DELETE	/admin/vocabulary/:id/translations/:translationId	Admin	Delete meaning
POST	/admin/vocabulary/:id/examples	Admin	Add example
PATCH	/admin/vocabulary/:id/examples/:exampleId	Admin	Edit example
DELETE	/admin/vocabulary/:id/examples/:exampleId	Admin	Delete example


4.8 Quiz engine
Method	Path	Access	Notes
GET	/quizzes	Public	Published metadata
GET	/quizzes/:id	Public	Questions without correctAnswer or isCorrect
GET	/admin/quizzes	Admin	All quizzes
POST	/admin/quizzes	Admin	Create
GET	/admin/quizzes/:id	Admin	Full answer-inclusive editor data
PATCH	/admin/quizzes/:id	Admin	Publish/update
DELETE	/admin/quizzes/:id	Admin manager	Archive
GET	/admin/quizzes/:quizId/questions	Admin	Editor questions
POST	/admin/quizzes/questions	Admin	New question
PATCH	/admin/quizzes/questions/:id	Admin	Update question
DELETE	/admin/quizzes/questions/:id	Admin manager	Delete question


4.9 Flashcards
Method	Path	Access	Notes
GET	/flashcards/decks	Public	Published decks
GET	/flashcards/decks/:id	Public	Published deck
GET	/flashcards/decks/:id/items	Public	Published cards
GET	/admin/flashcards/decks	Admin	All decks
POST	/admin/flashcards/decks	Admin	Create deck
GET	/admin/flashcards/decks/:id	Admin	Details
PATCH	/admin/flashcards/decks/:id	Admin	Edit/publish
DELETE	/admin/flashcards/decks/:id	Admin manager	Unpublish
GET	/admin/flashcards/decks/:id/items	Admin	Full items
POST	/admin/flashcards/decks/:id/items	Admin	Add vocabulary IDs
DELETE	/admin/flashcards/decks/:id/items/:itemId	Admin	Remove item
GET	/admin/flashcards/users/:userId/progress	Admin manager	Read-only learner progress


4.10 Learner progress and activity
Method	Path	Access	Notes
GET	/learner/progress/dashboard	Learner	Dashboard/streak
POST	/learner/progress/vocabulary/review	Learner	Quality 0–5, spaced repetition
GET	/learner/progress/vocabulary/due	Learner	Due reviews
POST	/learner/progress/lessons	Learner	Lesson completion
POST	/learner/progress/quizzes/submit	Learner	Server-side grading
GET	/learner/progress/quizzes/history	Learner	Own attempts
GET	/activity/me	Learner	Own activity history
GET	/activity/admin	Admin manager	Activity reports


4.11 Media and Office conversion
Method	Path	Access	Notes
GET	/media	Admin	Paginated assets
POST	/media/upload	Admin	JPG/PNG/etc → WebP, PDF/audio
GET	/media/:id/access	Admin	Short-lived signed R2 URL
DELETE	/media/:id	Admin manager	Reject if referenced
GET	/media/public/:id	Public	Redirect only for PUBLIC + READY assets
POST	/admin/documents/upload	Admin	DOCX/PPTX/XLSX → queued job
GET	/admin/documents/jobs	Admin	Job status listing
GET	/admin/documents/jobs/:id	Admin	Result pdfAssetId when ready


4.12 Subscriptions and payment intents
Method	Path	Access	Notes
GET	/subscriptions/plans	Public	Server-configured prices
POST	/subscriptions/checkout	Learner	PENDING payment only (paymentReady:false)
GET	/subscriptions/me	Learner	Own subscription history
GET	/subscriptions/entitlements/:appId	Learner	Effective ads/ad-free entitlement
GET	/admin/subscriptions	Admin manager	Financial reporting


CRITICAL: No provider-backed Stripe/Google Play/Apple verification is implemented. Do not enable live billing or manually mark checkout payments verified based solely on a client request.
4.13 Ads, promotions and referral
Method	Path	Access	Notes
GET	/ads/config	Public	Guest ad configuration; query appId, platform
GET	/ads/learner/config	Learner	Entitlement-aware config
GET	/admin/ads	Admin manager	List
GET	/admin/ads/:id	Admin manager	Details
POST	/admin/ads	Admin manager	Create
PATCH	/admin/ads/:id	Admin manager	Update
DELETE	/admin/ads/:id	Admin manager	Disable
GET	/promotions/code/:code	Public	Preview promo availability; does not redeem
GET	/promotions/referral/me	Learner	Own referral code
POST	/promotions/referral/apply	Learner	Link referral; no automatic reward
GET	/admin/promotions/codes	Admin manager	List
POST	/admin/promotions/codes	Admin manager	Create
PATCH	/admin/promotions/codes/:id	Admin manager	Update
PATCH	/admin/promotions/codes/:id/status	Admin manager	Enable/disable
DELETE	/admin/promotions/codes/:id	Admin manager	Disable


4.14 Imports and jobs
Method	Path	Access	Notes
POST	/imports/vocabulary	Admin	Returns 202 Accepted + import/job IDs
GET	/imports/jobs	Admin	Import status/history
GET	/imports/jobs/:id	Admin	Statistics and errors


5. Important request/response contracts
Registration
POST /api/auth/register
{"displayName":"Test Student","email":"student@example.com","password":"A-strong-password-here"}
POST /api/auth/verify-email
{"email":"student@example.com","code":"123456"}
123456 is illustrative; use the actual emailed code.
Create app
POST /api/admin/apps
{"languageId":"LANGUAGE_CUID","levelId":"LEVEL_CUID","name":"German A1","slug":"german-a1","isActive":true}
Create course
POST /api/admin/courses
{"languageId":"LANGUAGE_CUID","levelId":"LEVEL_CUID","title":"German A1 Basics","slug":"german-a1-basics","status":"DRAFT","sortOrder":0}
Create vocabulary and translation
POST /api/admin/vocabulary
{"languageId":"GERMAN_LANGUAGE_CUID","term":"Bär","partOfSpeech":"NOUN","grammar":{"article":"der","plural":"Bären"},"difficulty":"EASY","status":"DRAFT"}
POST /api/admin/vocabulary/:id/translations
{"languageId":"ENGLISH_LANGUAGE_CUID","meaning":"Bear","sortOrder":0}
Media upload
POST /api/media/upload with multipart/form-data: file, optional appId, optional visibility (PRIVATE default). Do not hard-code Content-Type with a manual multipart boundary.
Learner quiz submission
POST /api/learner/progress/quizzes/submit
{"quizId":"QUIZ_CUID","answers":[{"questionId":"QUESTION_CUID","answer":"SELECTED_OPTION_CUID"}]}
The backend, not the client, must determine correctness and score.
Checkout (not a payment processor)
POST /api/subscriptions/checkout
{"appId":"APP_CUID","planType":"MONTHLY","checkoutRequestId":"550e8400-e29b-41d4-a716-446655440000"}
Expected response is a PENDING payment intent and paymentReady:false.
Queue-based imports
POST /api/imports/vocabulary accepts validated JSON items and returns importId, backgroundJobId, status:PENDING rather than immediate row counts.
6. Critical breaking changes for Admin CMS
1. App levels: Old App.level enum replaced by languageId and levelId; languages and levels come from registry APIs.
2. Courses: Old Course.appId replaced by languageId, optional levelId, and CourseApp join links; course listings and editors must use new routes.
3. Vocabulary: Old german/english/bangla fields replaced by term, languageId, translations, examples and optional grammar JSON.
4. Quiz: Old German-specific QuizType replaced by language-neutral QuestionType; public question response does not contain answer keys.
5. Media: Private media has no permanent public URL. Preview via GET /media/:id/access; images store WebP. Office documents use queued conversion jobs.
6. Imports: JSON batch upload returns background job identifiers, not synchronous results; polling UI needed.
7. Subscriptions: Old insecure checkout behavior removed; only authenticated PENDING checkout intent.
8. Admins: Sensitive mutations are Super Admin only; role/password changes revoke refresh sessions; login JWT uses typ:admin.
9. Settings: Arbitrary keys blocked; only documented allowlisted keys supported.
10. Activity: Old unauthenticated POST /activity/log and user-ID based write endpoints removed; use protected learner progress routes.
11. Flashcards: Published-only public deck data; Admin routes moved to /admin/flashcards/decks....
12. Auth cookie: Ensure credentials:'include' for browser refresh/logout; coordinate permitted CORS origins and cookie path /api/admin/auth.
7. Security controls already designed, and limitations
- Argon2id for new administrator and learner passwords; account changes increment authVersion.
- Short-lived access JWTs; separate admin and learner issuer/audience/type/secret scopes.
- Rotating hashed refresh tokens and session revocation.
- Admin RBAC, Zod validation, throttled endpoints, explicit public projections.
- R2 bucket should be PRIVATE; signed URLs for access; upload validation/scanning required in production.
- User ID comes from authenticated JWT for progress/referral/checkout.
- Audit events attached to Admins and Settings changes; comprehensive API-wide audit coverage not yet independently verified.
- Simple in-memory rate limiting may not suffice for multi-instance production.
- Payment-provider verification, mobile client hardening, robust document worker isolation, CSRF/cookie cross-domain behavior and concurrency/security E2E tests remain open.
8. Environment variable inventory — names only
NODE_ENV, HOST, PORT, API_PREFIX, DATABASE_URL, CORS_ORIGINS, HTTP_BODY_LIMIT, ADMIN_JWT_SECRET, ADMIN_JWT_ISSUER, ADMIN_JWT_AUDIENCE, ADMIN_ACCESS_TOKEN_TTL_SECONDS, ADMIN_REFRESH_TOKEN_DAYS, LEARNER_JWT_SECRET, REGISTRATION_OTP_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL (legacy schema compatibility), MEDIA_API_BASE_URL, MEDIA_SCANNER_BINARY, LIBREOFFICE_BINARY.

Never commit real .env, JWT secrets, SMTP passwords, R2 credentials, private keys or database dumps. Use placeholder-only .env.example.
9. Verification commands
From D:\app\learning-app\apps\api:
npx prisma validate
npx prisma migrate status
npx prisma generate
npx tsc --noEmit
npm run build
npm test
npm run start:dev
GET http://127.0.0.1:4000/api/health should return status:ok and database:connected for a connected local DB.

For Admin CMS (D:\app\learning-app\apps\admin):
npx tsc --noEmit
npm run build
No fresh database reset is needed to start CMS integration. Store new baseline migrations in version control; use prisma migrate deploy in production.
10. Outstanding tasks — before public launch
Highest priority
- Full Admin CMS integration with every new route, form, RBAC, auth refresh flow, media preview, job polling, settings and audit views.
- Independent API route integration tests for admin login/refresh/logout, learner OTP/login/reset, JWT scopes, data authorization, draft/public content leakage, media access, checkout protection, referrals and concurrency.
- Payment provider verification: server-verified Stripe and/or Google Play/Apple purchases; webhook signatures, refunds, renewals, idempotency, entitlement activation, financial reporting. Currently paymentReady:false.
- Security review: session replay/race handling, account enumeration and lockout, CSRF/origin policies, rate limiter with shared storage if scaled, logging redaction, document scanning, third-party SDK policy compliance.
- Validate complete app/CMS API response contracts, especially BigInt JSON serialization, nullable fields, pagination and status handling.
Development and deployment
- Website and separate A1–C1 mobile app user flows; onboarding, OTP UI, Inbox/Spam notice, quizzes, audio, progress, Ads and purchase experience.
- Isolated Hostinger VPS deployment: own API/DB credentials/R2 bucket/network/resource quotas; independent of MochiFlix.
- Docker/reverse proxy/TLS, MySQL least-privilege accounts, backups + restore test, health checks, metrics, alerts, log rotation and deployment rollback.
- Import CSV/Excel mapping UI and any additional supported formats, if needed.
- Pricing and supported payment markets/products decision; no live purchase activation until implemented.
Deferred worker QA — remind at final project completion
- Document Worker: DOCX/PPTX/XLSX → PDF, malware scanning, LibreOffice isolation, PDF fidelity/page count, R2 access, retries/lease expiration, crash recovery.
- Vocabulary Import Worker: pending/processing/completed/error records, resume behavior, row-by-row transactions, concurrency and idempotency after process crash.
- Later audio/TTS worker: queue security, concurrency, output validation.
11. CMS implementation order
1. Admin login and session refresh compatibility.
2. Language/Framework/Level and Apps managers.
3. Courses → Modules → Lessons → translations/resources.
4. Vocabulary categories, words, meanings, examples, media attachments.
5. Quiz builder, Flashcard decks, imports and job status.
6. Learner records, subscriptions, ads, promo/referral reporting.
7. Settings, Audit logs, Activity reporting, full permission/access tests.
12. Change log
Date	Item
2026-11-11	Fresh multilingual Prisma database migrated and seeded (8 languages, 3 frameworks, 17 levels, 47 assignments)
2026-11-11–12	Language, Apps, Courses, Vocabulary, Quiz, Flashcards and Learner Auth/Progress modules supplied
2026-11-12	Media, document conversion, subscriptions, ads, promotions, imports, Admins, Settings, Audit, Activity and Admin Auth hardening supplied
2026-11-12	CMS handoff summary and consolidated route registry prepared


Maintenance rule: After each CMS integration phase, update this file's endpoint registry and statuses; keep Implemented, Compiled, HTTP tested, Security tested, and Production approved as separate states. When an API contract changes, record the request/response change and the affected CMS/mobile screens before deploying.