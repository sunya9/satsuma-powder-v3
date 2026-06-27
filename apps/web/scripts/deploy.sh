#!/usr/bin/env sh
# Build the site against the production cms and deploy it to Cloudflare Workers.
# Loads apps/web/.env.deploy (gitignored) for VITE_* and the build-only PAYLOAD_API_KEY.
set -e
cd "$(CDPATH= cd "$(dirname "$0")/.." && pwd)"

if [ ! -f .env.deploy ]; then
  echo "missing apps/web/.env.deploy (see docs/DEPLOY.md for the required vars)" >&2
  exit 1
fi

set -a
. ./.env.deploy
set +a

rm -rf dist
pnpm build
pnpm exec wrangler deploy
