# Admin CMS auto-deploy (Hostinger VPS)

Push to `main` that touches `apps/admin/**` → GitHub Actions
`Deploy Learning Admin CMS`:

1. **verify**: `npm ci`, typecheck, lint, `next build` on GitHub. A broken
   commit never reaches the VPS.
2. **deploy**: SSH as `learningdeploy` (same key and secrets as the API deploy)
   and run `sudo -n /usr/local/sbin/deploy-learning-admin <commit>`.
3. **check**: `https://learning-admin.mochiflix.com/admin/login` returns 200
   with the new security headers.

The VPS script builds in its own folder (`/docker/learning-app/admin-build`),
recreates only the `learning-admin` container, waits for the health check and
**rolls back automatically** to the previous image if the new one is not
healthy. It never touches the API, MySQL, Redis or Traefik.

No new GitHub secrets are needed: it reuses `LEARNING_VPS_SSH_KEY`,
`LEARNING_VPS_KNOWN_HOSTS` and `LEARNING_VPS_HOST`.

---

## One-time setup on the VPS

Run as a user with sudo, in an SSH session on the VPS.

### 1. Install the deploy script

```bash
sudo curl -fsSL \
  https://raw.githubusercontent.com/rjibon49/learning-app/development/infrastructure/vps/deploy-learning-admin.sh \
  -o /usr/local/sbin/deploy-learning-admin
sudo chown root:root /usr/local/sbin/deploy-learning-admin
sudo chmod 750 /usr/local/sbin/deploy-learning-admin
sudo bash -n /usr/local/sbin/deploy-learning-admin && echo "script OK"
```

### 2. Admin hostname file (not a secret, kept outside Git)

```bash
sudo install -d -m 700 /docker/learning-app/secrets
printf 'ADMIN_HOSTNAME=learning-admin.mochiflix.com\n' | sudo tee /docker/learning-app/secrets/admin.compose.env >/dev/null
sudo chmod 600 /docker/learning-app/secrets/admin.compose.env
```

### 3. Allow the deploy user to run only this script

```bash
echo 'learningdeploy ALL=(root) NOPASSWD: /usr/local/sbin/deploy-learning-admin' \
  | sudo tee /etc/sudoers.d/learning-admin-deploy >/dev/null
sudo chmod 440 /etc/sudoers.d/learning-admin-deploy
sudo visudo -cf /etc/sudoers.d/learning-admin-deploy
```

### 4. If the current CMS container was started another way

The script manages the container named `learning-admin` with Compose project
`learning-admin-stack`. If the running CMS has another name or project, stop
and remove **only that CMS container** first (the next step starts the new one
straight away):

```bash
docker ps --format '{{.Names}}  {{.Image}}'
docker stop <old-cms-container> && docker rm <old-cms-container>
```

### 5. First deploy by hand

```bash
SHA=$(git ls-remote https://github.com/rjibon49/learning-app.git refs/heads/main | cut -f1)
sudo /usr/local/sbin/deploy-learning-admin "$SHA"
docker ps --filter name=learning-admin
curl -sI https://learning-admin.mochiflix.com/admin/login | grep -i x-frame-options
```

`X-Frame-Options: DENY` in the last line means the new CMS is live.

### 6. Turn on auto-deploy

Merge the branch that contains `.github/workflows/deploy-learning-admin.yml`
into `main`. From then on every push to `main` that changes the CMS deploys it.
A manual run is also possible: GitHub → Actions → *Deploy Learning Admin CMS*
→ *Run workflow*.

---

## Day-to-day

| Need | Command (on the VPS) |
|---|---|
| See deploy history | `sudo tail -n 100 /var/log/learning-admin-deploy.log` |
| CMS logs | `docker logs --tail 100 learning-admin` |
| Health | `docker inspect learning-admin --format '{{.State.Health.Status}}'` |
| Undo last deploy | `sudo /usr/local/sbin/deploy-learning-admin rollback` |
| Deploy a specific commit on main | `sudo /usr/local/sbin/deploy-learning-admin <40-char sha>` |

When the script itself changes in Git, repeat step 1 with `main` instead of
`development` in the URL.
