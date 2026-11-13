# Phase 1 — CMS Core, Authentication and Global Pagination

## Source
Patch based on the uploaded `admin(1).zip` and target public API `https://learning-api.mochiflix.com/api`.

## Changed files
- `next.config.ts`: same-origin `/api/backend/*` rewrite to remote API.
- `src/app/api/admin/auth/[...path]/route.ts`: limited server-side auth proxy; forwards HttpOnly cookies, strict incoming Origin.
- `src/lib/api/client.ts`: shared API client, in-memory access tokens, automatic refresh, normalized errors.
- `src/lib/api/auth.ts`: admin login/session/logout endpoints.
- `src/lib/auth/auth-context.tsx`: session restoration and redirects.
- `src/types/auth.ts`: normalized AdminUser DTO.
- `src/app/admin/login/page.tsx`: branded login while preserving styling.
- `src/lib/api/apps.ts`: temporary adapter for the old German-only AdminShell to handle the new paginated `/apps` response; replaced by Phase 2.
- `src/types/pagination.ts`: global typed pagination contract and query helper.
- `src/components/ui/pagination.tsx`: reusable server-pagination control.
- `.env.example`: server-only API URL example.

## Local setup
Create `apps/admin/.env.local` containing:
```
LEARNING_API_URL=https://learning-api.mochiflix.com/api
```
From monorepo root run `npm install`; then `npm run dev:admin`.
Use `/admin/login` to test. Check refresh via reload and logout.

## Pagination usage
```
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(20);
// The API returns {data, pagination}; pass pagination to the control.
<Pagination pagination={response.pagination}
  onPageChange={setPage}
  onPageSizeChange={n => { setPage(1); setLimit(n); }} />
```
All data pages should be wired to the server's `page`/`limit` in their respective phases.

## Security & caveats
- No admin/learner secrets in Next.js env; access JWT is memory-only.
- Same-origin authentication proxy rejects cross-site POST requests and forwards API's refresh cookie.
- Actual security still depends on correct server-side roles and API permissions.
- Multiple browser tabs may race token rotation. Address during QA if observed.
- Production deployment of the CMS, MFA, end-to-end tests and full module migration remain pending.
