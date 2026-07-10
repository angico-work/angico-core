#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="angico-prod-smoke-$$"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:17-alpine}"
LOG_FILE="$(mktemp -t angico-prod-smoke.XXXXXX.log)"
APP_PID=""

cleanup() {
  if [[ -n "$APP_PID" ]] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  rm -f "$LOG_FILE"
}
trap cleanup EXIT INT TERM

command -v docker >/dev/null
command -v mvn >/dev/null
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
(cd "$ROOT_DIR" && mvn -q -DskipTests package)

SPRING_PROFILES_ACTIVE=prod \
ANGICO_DB_URL="jdbc:postgresql://127.0.0.1:${POSTGRES_PORT}/angico" \
ANGICO_DB_USER=postgres \
ANGICO_DB_PASSWORD=test \
ANGICO_ALLOWED_ORIGINS=https://app.example.test \
ANGICO_FLYWAY_ENABLED=true \
ANGICO_SEED_DEMO_LEADER=false \
SERVER_PORT=0 \
java -jar "$ROOT_DIR/target/angico-api-0.0.1-SNAPSHOT.jar" >"$LOG_FILE" 2>&1 &
APP_PID=$!

started=false
for _ in {1..45}; do
  if grep -q "Started AngicoApplication" "$LOG_FILE"; then
    started=true
    break
  fi
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    cat "$LOG_FILE" >&2
    exit 1
  fi
  sleep 1
done
if [[ "$started" != true ]]; then
  cat "$LOG_FILE" >&2
  echo "Production profile did not reach readiness" >&2
  exit 1
fi

VERSIONS="$(docker exec "$CONTAINER_NAME" psql -U postgres -d angico -Atc \
  "SELECT string_agg(version, ',' ORDER BY installed_rank) FROM flyway_schema_history WHERE success AND version IS NOT NULL")"
if [[ "$VERSIONS" != "0,1,2" ]]; then
  echo "Unexpected Flyway history: $VERSIONS" >&2
  exit 1
fi

echo "PostgreSQL production smoke passed with Flyway versions $VERSIONS"
