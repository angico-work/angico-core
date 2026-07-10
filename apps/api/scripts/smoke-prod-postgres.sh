#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="angico-prod-smoke-$$"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:17-alpine}"
UPGRADE_FROM_REF="${ANGICO_SMOKE_UPGRADE_FROM_REF:-}"
LOG_FILE="$(mktemp -t angico-prod-smoke.XXXXXX.log)"
PREVIOUS_SOURCE_DIR=""
APP_PID=""

cleanup() {
  if [[ -n "$APP_PID" ]] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  rm -f "$LOG_FILE"
  if [[ -n "$PREVIOUS_SOURCE_DIR" ]]; then
    rm -rf "$PREVIOUS_SOURCE_DIR"
  fi
}
trap cleanup EXIT INT TERM

command -v docker >/dev/null
command -v mvn >/dev/null
if [[ -n "$UPGRADE_FROM_REF" ]]; then
  command -v git >/dev/null
  command -v tar >/dev/null
fi
docker info >/dev/null

docker run -d --rm \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=angico \
  -p 127.0.0.1::5432 \
  "$POSTGRES_IMAGE" >/dev/null

ready=false
for _ in {1..30}; do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres -d angico >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo "PostgreSQL did not become ready" >&2
  exit 1
fi

POSTGRES_PORT="$(docker port "$CONTAINER_NAME" 5432/tcp | awk -F: 'NR == 1 {print $NF}')"

run_app() {
  local jar_path="$1"
  local phase="$2"
  : >"$LOG_FILE"

  SPRING_PROFILES_ACTIVE=prod \
  ANGICO_DB_URL="jdbc:postgresql://127.0.0.1:${POSTGRES_PORT}/angico" \
  ANGICO_DB_USER=postgres \
  ANGICO_DB_PASSWORD=test \
  ANGICO_ALLOWED_ORIGINS=https://app.example.test \
  ANGICO_FLYWAY_ENABLED=true \
  ANGICO_SEED_DEMO_LEADER=false \
  SERVER_PORT=0 \
  java -jar "$jar_path" >"$LOG_FILE" 2>&1 &
  APP_PID=$!

  local started=false
  for _ in {1..45}; do
    if grep -q "Started AngicoApplication" "$LOG_FILE"; then
      started=true
      break
    fi
    if ! kill -0 "$APP_PID" 2>/dev/null; then
      cat "$LOG_FILE" >&2
      echo "$phase exited before readiness" >&2
      exit 1
    fi
    sleep 1
  done
  if [[ "$started" != true ]]; then
    cat "$LOG_FILE" >&2
    echo "$phase did not reach readiness" >&2
    exit 1
  fi

  kill "$APP_PID" 2>/dev/null || true
  wait "$APP_PID" 2>/dev/null || true
  APP_PID=""
}

flyway_versions() {
  docker exec "$CONTAINER_NAME" psql -U postgres -d angico -Atc \
    "SELECT string_agg(version, ',' ORDER BY installed_rank) FROM flyway_schema_history WHERE success AND version IS NOT NULL"
}

if [[ -n "$UPGRADE_FROM_REF" ]]; then
  REPO_DIR="$(git -C "$ROOT_DIR" rev-parse --show-toplevel)"
  PREVIOUS_SOURCE_DIR="$(mktemp -d -t angico-prod-smoke-prev.XXXXXX)"
  git -C "$REPO_DIR" archive "$UPGRADE_FROM_REF" apps/api \
    | tar -x -C "$PREVIOUS_SOURCE_DIR"
  (cd "$PREVIOUS_SOURCE_DIR/apps/api" && mvn -q clean -DskipTests package)
  run_app \
    "$PREVIOUS_SOURCE_DIR/apps/api/target/angico-api-0.0.1-SNAPSHOT.jar" \
    "Upgrade source $UPGRADE_FROM_REF"
  PREVIOUS_VERSIONS="$(flyway_versions)"
  if [[ "$PREVIOUS_VERSIONS" != "0,1,2" ]]; then
    echo "Unexpected pre-upgrade Flyway history: $PREVIOUS_VERSIONS" >&2
    exit 1
  fi
fi

(cd "$ROOT_DIR" && mvn -q clean -DskipTests package)
run_app "$ROOT_DIR/target/angico-api-0.0.1-SNAPSHOT.jar" "Current production profile"

VERSIONS="$(flyway_versions)"
if [[ "$VERSIONS" != "0,1,2" ]]; then
  echo "Unexpected Flyway history: $VERSIONS" >&2
  exit 1
fi

if [[ -n "$UPGRADE_FROM_REF" ]]; then
  echo "PostgreSQL upgrade smoke passed from $UPGRADE_FROM_REF with Flyway versions $VERSIONS"
fi
echo "PostgreSQL production smoke passed with Flyway versions $VERSIONS"
