#!/usr/bin/env bash
# Boots the built Worker locally and probes it.
#
# `opennextjs-cloudflare build` can succeed while the Worker crashes at startup
# (e.g. next 16.4.0 vs OpenNext: "Unexpected loadManifest(...) call!"), which
# turns every route into a 500. `/nonexistent` goes through Next's server and
# not-found rendering without touching Payload or the DB, which CI doesn't have.
set -euo pipefail

cms_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
port="${PORT:-8787}"

cd "$cms_dir"

if [ ! -f .open-next/worker.js ]; then
  echo "error: .open-next/worker.js not found. Run 'pnpm run build:cf' first." >&2
  exit 1
fi

log_file="$(mktemp "${TMPDIR:-/tmp}/cms-smoke.XXXXXX")"

dump_log() {
  echo "----- wrangler dev log -----" >&2
  cat "$log_file" >&2
  echo "----------------------------" >&2
}

npx wrangler dev --local --port "$port" --show-interactive-dev-session=false >"$log_file" 2>&1 &
server_pid=$!

# npx -> wrangler -> workerd: killing only the top pid would orphan workerd.
kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2>/dev/null || true); do
    kill_tree "$child"
  done
  kill "$1" 2>/dev/null || true
}

cleanup() {
  kill_tree "$server_pid"
  wait "$server_pid" 2>/dev/null || true
  rm -f "$log_file"
}
trap cleanup EXIT

ready=false
for _ in $(seq 1 90); do
  if grep -q "Ready on" "$log_file"; then
    ready=true
    break
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    break
  fi
  sleep 1
done

if [ "$ready" != true ]; then
  echo "error: wrangler dev did not become ready." >&2
  dump_log
  exit 1
fi

status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "http://localhost:$port/nonexistent" || true)"

if [ "$status" != "404" ]; then
  echo "error: GET /nonexistent returned $status, expected 404." >&2
  # Give wrangler a moment to flush the request's error output.
  sleep 1
  dump_log
  exit 1
fi

echo "OK: Worker booted and GET /nonexistent returned 404."
