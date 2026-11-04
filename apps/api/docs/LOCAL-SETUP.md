# API local setup (Windows / XAMPP)

## Important
This package intentionally does not include your real `.env` file or credentials.
The uploaded project did not contain usable migration SQL history, so for the current local-development database use a clean database and create a new baseline migration.

## 1. Replace the old API folder
Back up anything local you need, then replace `apps/api` with this updated folder.

## 2. Create `.env`
Copy `.env.example` to `.env` and set `DATABASE_URL` for XAMPP.
Example for a blank local root password:

```env
DATABASE_URL=mysql://root@127.0.0.1:3306/learning_app
```

Generate a JWT secret:

```cmd
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Put it in `ADMIN_JWT_SECRET`.

## 3. Clean the local dev database
Because the previous local migration was partially applied, use phpMyAdmin to DROP the `learning_app` database and recreate it with `utf8mb4_unicode_ci`.
Do this only for the current development database, not a production database.

## 4. Generate and apply a clean baseline migration
From `apps/api`:

```cmd
npx prisma format
npx prisma validate
npx prisma migrate dev --name init_platform
npx prisma generate
npx prisma migrate status
```

## 5. Seed A1-C1
From repository root:

```cmd
npm run seed --workspace=@learning/api
```

## 6. Create first super admin
Temporarily add these only to local `.env`:

```env
ADMIN_SEED_EMAIL=your-email@example.com
ADMIN_SEED_PASSWORD=use-a-strong-password-at-least-12-characters
ADMIN_SEED_NAME=Super Admin
```

Then run:

```cmd
npm run seed:admin --workspace=@learning/api
```

After success, remove `ADMIN_SEED_PASSWORD` from `.env`. The password hash stays in the database.

## 7. Build and run
From repository root:

```cmd
npm run build:api
npm run dev:api
```

Health endpoint:

`http://127.0.0.1:4000/api/health`

## Authentication endpoints
- `POST /api/admin/auth/login`
- `POST /api/admin/auth/refresh`
- `POST /api/admin/auth/logout`
- `POST /api/admin/auth/logout-all`
- `GET /api/admin/auth/me`

The refresh token is stored in an HttpOnly SameSite=Strict cookie. The access token is a short-lived JWT sent as `Authorization: Bearer <token>`.

## Vocabulary permissions
Public:
- `GET /api/vocabulary`
- `GET /api/vocabulary/:id`
- `GET /api/vocabulary/categories`

Authenticated content staff:
- `POST /api/vocabulary`
- `PATCH /api/vocabulary/:id`
- `POST /api/vocabulary/categories`

Admin or Super Admin only:
- `DELETE /api/vocabulary/:id`
