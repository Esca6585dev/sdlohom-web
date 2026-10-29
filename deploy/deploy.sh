#!/usr/bin/env bash
# Täzeleme: git pull → build → restart. Doly logika install.sh-da (idempotent); bu diňe gysga ýol.
#   cd /var/www/sdlohom-web && sudo ./deploy/deploy.sh
set -euo pipefail
exec bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install.sh" "$@"
