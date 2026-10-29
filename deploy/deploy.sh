#!/usr/bin/env bash
# Server-side deploy: git pull -> build Go API -> build Next.js -> restart services.
# One-time setup is described in deploy/README.md.  Usage on the server:
#   cd /var/www/sdlohom-web && sudo ./deploy/deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> git pull"
git pull --ff-only

echo "==> backend build"
( cd backend && go build -ldflags="-s -w" -o bin/api ./cmd/api \
  && go build -ldflags="-s -w" -o bin/migrate ./cmd/migrate \
  && go build -ldflags="-s -w" -o bin/adminctl ./cmd/adminctl )

echo "==> frontend build"
( cd frontend && npm ci --no-audit --no-fund && npm run build )

echo "==> permissions"
chown -R www-data:www-data "$ROOT/backend/uploads" "$ROOT/frontend/.next" 2>/dev/null || true

echo "==> restart services (API applies DB migrations on start)"
systemctl restart sdlohom-api
sleep 2
systemctl restart sdlohom-web
sleep 3
systemctl --no-pager --lines=3 status sdlohom-api sdlohom-web || true

echo "==> health"
curl -fsS http://127.0.0.1:8090/api/v1/health && echo
curl -fsS -o /dev/null -w "web: %{http_code}\n" http://127.0.0.1:3002/tm
echo "done"
