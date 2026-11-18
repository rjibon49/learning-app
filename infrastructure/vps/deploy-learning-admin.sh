#!/usr/bin/env bash
# Learning Admin CMS deploy script for the VPS.
#
# Installed as: /usr/local/sbin/deploy-learning-admin  (owner root, mode 0750)
# Called by:    GitHub Actions (.github/workflows/deploy-learning-admin.yml)
#               ssh learningdeploy@VPS "sudo -n /usr/local/sbin/deploy-learning-admin <commit-sha>"
#
# What it does
#   1. Checks out exactly <commit-sha> (must be on origin/main) in its own build folder.
#      It never touches the API source folder or the API containers.
#   2. Builds the admin image, tagged with the commit and as :release.
#   3. Recreates only the learning-admin container and waits for it to be healthy.
#   4. If the new container is not healthy, puts the previous image back.
#
# Manual use on the VPS:
#   sudo /usr/local/sbin/deploy-learning-admin <commit-sha>
#   sudo /usr/local/sbin/deploy-learning-admin rollback

set -Eeuo pipefail
umask 027

# ---- Settings (adjust to the VPS if needed) -------------------------------
REPO_URL="https://github.com/rjibon49/learning-app.git"
BUILD_DIR="/docker/learning-app/admin-build"
ENV_FILE="/docker/learning-app/secrets/admin.compose.env"
COMPOSE_FILE="apps/admin/deploy/admin.compose.yml"
DOCKERFILE="apps/admin/deploy/Dockerfile.admin"
IMAGE="learning-admin"
CONTAINER="learning-admin"
HEALTH_TIMEOUT_SECONDS=240
KEEP_IMAGES=3
LOCK_FILE="/run/lock/learning-admin-deploy.lock"
LOG_FILE="/var/log/learning-admin-deploy.log"
# ---------------------------------------------------------------------------

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

log() { printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG_FILE"; }
fail() { log "ERROR: $*"; exit 1; }

ARG="${1:-}"

if [[ "$ARG" != "rollback" && ! "$ARG" =~ ^[0-9a-f]{40}$ ]]; then
  fail "usage: deploy-learning-admin <40-char commit sha> | rollback"
fi

[[ -f "$ENV_FILE" ]] || fail "missing $ENV_FILE (must contain ADMIN_HOSTNAME=...)"

# One deploy at a time (a second push waits for the first to finish).
exec 9>"$LOCK_FILE"
flock -w 900 9 || fail "another admin deploy is still running"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$BUILD_DIR/$COMPOSE_FILE" "$@"
}

wait_healthy() {
  local waited=0 status
  while (( waited < HEALTH_TIMEOUT_SECONDS )); do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CONTAINER" 2>/dev/null || echo missing)"
    case "$status" in
      healthy) return 0 ;;
      unhealthy|exited|dead|missing) [[ $waited -gt 30 ]] && return 1 ;;
    esac
    sleep 5
    waited=$(( waited + 5 ))
  done
  return 1
}

restart_with_release() {
  compose up -d --no-deps --force-recreate admin
}

rollback() {
  if ! docker image inspect "$IMAGE:previous" >/dev/null 2>&1; then
    fail "no $IMAGE:previous image to roll back to"
  fi
  log "Rolling back to $IMAGE:previous"
  docker tag "$IMAGE:previous" "$IMAGE:release"
  restart_with_release
  wait_healthy || fail "previous image is not healthy either — check: docker logs --tail 100 $CONTAINER"
  log "Rollback done"
}

if [[ "$ARG" == "rollback" ]]; then
  [[ -d "$BUILD_DIR/.git" ]] || fail "build folder missing; nothing to roll back"
  rollback
  exit 0
fi

SHA="$ARG"
SHORT="${SHA:0:12}"
log "=== Deploy admin $SHA ==="

# 1. Exact source for this commit, in a folder used only by this script.
if [[ ! -d "$BUILD_DIR/.git" ]]; then
  log "Cloning $REPO_URL into $BUILD_DIR"
  git clone --filter=blob:none --no-checkout "$REPO_URL" "$BUILD_DIR"
fi

git -C "$BUILD_DIR" fetch --prune --quiet origin main
git -C "$BUILD_DIR" merge-base --is-ancestor "$SHA" origin/main \
  || fail "$SHA is not on origin/main — refusing to deploy"
git -C "$BUILD_DIR" checkout --quiet --force --detach "$SHA"
git -C "$BUILD_DIR" clean -fdxq

# 2. Keep the running image as :previous, then build the new one.
# Back up the image actually running in production.
RUNNING_IMAGE="$(docker inspect \
  --format '{{.Image}}' "$CONTAINER")" \
  || fail "Running admin container not found"

docker image inspect "$RUNNING_IMAGE" >/dev/null \
  || fail "Running admin image not found"

docker tag "$RUNNING_IMAGE" "$IMAGE:previous"
log "Previous running image backed up"

log "Building $IMAGE:$SHORT"
BUILD_LOG="$(mktemp)"
trap 'rm -f "$BUILD_LOG"' EXIT
if ! docker build \
  --pull \
  --label "org.opencontainers.image.revision=$SHA" \
  -f "$BUILD_DIR/$DOCKERFILE" \
  -t "$IMAGE:$SHORT" \
  -t "$IMAGE:release" \
  "$BUILD_DIR" >"$BUILD_LOG" 2>&1; then
  tail -n 60 "$BUILD_LOG" | tee -a "$LOG_FILE"
  # A failed build does not move tags, so the running CMS is untouched.
  fail "docker build failed; the running CMS was not touched"
fi
tail -n 5 "$BUILD_LOG" | tee -a "$LOG_FILE"

# 3. Replace only the admin container.
log "Starting new container"
restart_with_release

if wait_healthy; then
  EXPECTED_IMAGE="$(docker image inspect \
    "$IMAGE:$SHORT" --format '{{.Id}}')"

  ACTUAL_IMAGE="$(docker inspect \
    "$CONTAINER" --format '{{.Image}}')"

  if [[ "$EXPECTED_IMAGE" != "$ACTUAL_IMAGE" ]]; then
    log "ERROR: Running image differs from deployment image"
    rollback
    fail "Admin deployment image mismatch"
  fi

  log "Deploy OK: $SHA is live"
else
  log "New container is not healthy. Last logs:"
  docker logs --tail 60 "$CONTAINER" 2>&1 | tee -a "$LOG_FILE" || true
  rollback
  fail "deploy of $SHA failed; previous version restored"
fi

# 4. Keep only the newest commit-tagged images (plus :release and :previous).
docker images "$IMAGE" --format '{{.Tag}} {{.CreatedAt}}' \
  | grep -Ev '^(release|previous|<none>) ' \
  | sort -k2 -r \
  | awk -v keep="$KEEP_IMAGES" 'NR > keep { print $1 }' \
  | while read -r tag; do docker rmi "$IMAGE:$tag" >/dev/null 2>&1 || true; done
docker image prune -f >/dev/null 2>&1 || true

log "=== Done ==="
