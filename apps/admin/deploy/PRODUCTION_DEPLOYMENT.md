# Learning Admin CMS — separate deployment from Learning API

## Important facts
This archive is an `apps/admin` source snapshot. It does NOT include the monorepo root `package-lock.json`, other workspaces, or production DNS/secrets. It is NOT a full, independently tested VPS installation. Do not overwrite `/docker/learning-app/source` with this ZIP. The API is already production-deployed and must remain unchanged.

## Required verification before go-live
1. Copy patched `apps/admin` into the same development branch as your existing monorepo source. Review `git diff -- apps/admin` and commit the changes.
2. In the **complete monorepo** on your office/home PC: `npm ci`, `npx tsc --noEmit -p apps/admin/tsconfig.json`, `npm --workspace @learning/admin run lint`, `npm --workspace @learning/admin run build`. Fix any failure; source syntax validation alone is not enough.
3. Verify admin login/logout, token refresh, permissions, and each create/update action against a **staging API/DB**. Do not test destructive actions on production data.
4. Review required Next.js environment configuration. The existing `next.config.ts` rewrites `/api/backend/:path*` to `https://learning-api.mochiflix.com/api/:path*` and the auth proxy handles `/api/admin/auth/*`. Check cookie Path/Domain/SameSite in the browser through the intended HTTPS admin hostname.
5. Confirm DNS and TLS for the chosen admin hostname. Use a different hostname from the API and any existing apps.

## Optional isolated Docker deployment (AFTER checks)
- Merge only `apps/admin/**` changes into an approved release that the VPS can fetch. Avoid merging unfinished development-wide changes into main.
- Build in the full monorepo directory on VPS, for example `/docker/learning-app/source` **after** it contains the approved admin commit:

```
cd /docker/learning-app/source
docker build -f apps/admin/deploy/Dockerfile.admin -t learning-admin:release .
```

- Store a non-secret hostname setting outside Git:

```
install -d -m 700 /docker/learning-app/secrets
printf 'ADMIN_HOSTNAME=your-real-admin-hostname\n' > /docker/learning-app/secrets/admin.compose.env
chmod 600 /docker/learning-app/secrets/admin.compose.env
```

- After DNS, image build, and config are verified:

```
docker compose --env-file /docker/learning-app/secrets/admin.compose.env -f apps/admin/deploy/admin.compose.yml config
docker compose --env-file /docker/learning-app/secrets/admin.compose.env -f apps/admin/deploy/admin.compose.yml up -d --no-deps admin
docker inspect learning-admin --format '{{.State.Health.Status}}'
docker logs --tail 80 learning-admin
```

- The Compose stack only manages `learning-admin`. It uses existing external `learning-edge`; it will not create new MySQL, Redis or API containers.
- The image tag `learning-admin:release` is mutable; for fully reproducible deployment use commit-SHA-tagged images and retain the previous tag for rollback.
- The healthcheck only tests that the login HTML is served; it does NOT validate authentication or content workflows.

## Rollback
Keep a previous tagged image, update the admin image only, then recreate only `learning-admin`. Do not reset the production database or revert the API as part of an Admin CMS UI rollback.
