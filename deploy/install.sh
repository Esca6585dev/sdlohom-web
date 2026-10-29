#!/usr/bin/env bash
# =============================================================================
#  SDLOHOM v2 — serwer gurnama / täzeleme skripti (Ubuntu 22.04 / 24.04)
#
#  Bir buýruk: paketler + Go + Node + MySQL + kod (GitHub ýa-da bundle) + baza +
#  .env + build + systemd + nginx (domen üýtgedilýär) + bar bolan SSL sertifikaty.
#  Gaýtadan işledilende täzeleýär (git pull → build → restart). Hiç zat pozmaýar.
#
#  Ulanyş (serwerde):
#     sudo bash install.sh                      # ilkinji gurnama ýa-da täzeleme
#     sudo DOMAIN=sdlohom.edu.tm bash install.sh
#     sudo BUNDLE=/home/ubuntu/sdlohom.bundle bash install.sh   # GitHub ýapyk bolsa
#
#  Sazlamalar: aşakdaky üýtgeýjiler ýa-da /etc/sdlohom/deploy.conf (ilkinji
#  işlenişde awtomat döredilýär, soňra şondan okalýar).
# =============================================================================
set -euo pipefail

CONF_DIR=/etc/sdlohom
CONF="$CONF_DIR/deploy.conf"
[ -r "$CONF" ] && . "$CONF"

DOMAIN="${DOMAIN:-sdlohom.edu.tm}"              # esasy domen; www.$DOMAIN awtomat goşulýar
APP_DIR="${APP_DIR:-/var/www/sdlohom-web}"
REPO_URL="${REPO_URL:-https://github.com/Esca6585dev/sdlohom-web.git}"
BRANCH="${BRANCH:-main}"
GH_USER="${GH_USER:-Esca6585dev}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"                 # ýapyk (private) repo üçin: github_pat_… (Contents: read)
VPN_SOCKS="${VPN_SOCKS:-127.0.0.1:10808}"        # GitHub göni açylmasa SOCKS5 proxy
VPN_SCRIPT="${VPN_SCRIPT:-/root/vpn.sh}"         # bar bolsa proxy-ni işledýän skript
BUNDLE="${BUNDLE:-}"                             # lokaldan scp bilen iberilen git bundle
WEB_USER="${WEB_USER:-www-data}"
API_PORT="${API_PORT:-8090}"
WEB_PORT="${WEB_PORT:-3002}"
DB_NAME="${DB_NAME:-sdlohom}"
DB_USER="${DB_USER:-sdlohom}"
DB_PASS="${DB_PASS:-}"                           # boş bolsa döredilýär we deploy.conf-a ýazylýar
DB_DUMP="${DB_DUMP:-}"                           # ilkinji gurnamada import ediljek sdlohom.sql
DISABLE_APACHE="${DISABLE_APACHE:-1}"            # 1 = apache2 togtadylýar (80/443 nginx-e)
SSL_CERT="${SSL_CERT:-}"                         # boş bolsa: letsencrypt ýa-da apache konfiginden tapylýar
SSL_KEY="${SSL_KEY:-}"
GO_VERSION="${GO_VERSION:-1.27.0}"
NODE_MAJOR="${NODE_MAJOR:-22}"
GO_TARBALL="${GO_TARBALL:-}"                     # offline: öňünden iberilen go*.linux-amd64.tar.gz
NODE_TARBALL="${NODE_TARBALL:-}"                 # offline: node-v22*-linux-x64.tar.xz
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"             # berilse "superadmin" hasaby döredilýär / paroly täzelenýär
EXTERNAL_NEWS_TOKEN="${EXTERNAL_NEWS_TOKEN:-}"   # merkez.bilim.tm tokeni (admin panelden hem goýup bolýar)

export GIT_TERMINAL_PROMPT=0 DEBIAN_FRONTEND=noninteractive
PROXY=""            # "socks5h://host:port" — tapylsa doldurylýar
GIT_NET=()

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m   ✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m   ! %s\033[0m\n' "$*" >&2; }
die()  { printf '\n\033[1;31mÝALŇYŞLYK: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "root bilen işlediň: sudo bash install.sh"
. /etc/os-release 2>/dev/null || true
command -v apt-get >/dev/null || die "Bu skript Ubuntu/Debian üçin (apt)."

# -----------------------------------------------------------------------------
# 0. Sazlamalary ýatda saklamak
# -----------------------------------------------------------------------------
mkdir -p "$CONF_DIR"
[ -n "$DB_PASS" ] || DB_PASS="$(openssl rand -hex 12)"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
IP_HASH_SALT="${IP_HASH_SALT:-$(openssl rand -hex 16)}"
umask 077
cat > "$CONF" <<EOF
# SDLOHOM deploy sazlamalary (install.sh şuny okaýar). Gizlin — diňe root.
DOMAIN="$DOMAIN"
APP_DIR="$APP_DIR"
REPO_URL="$REPO_URL"
BRANCH="$BRANCH"
GH_USER="$GH_USER"
GITHUB_TOKEN="$GITHUB_TOKEN"
VPN_SOCKS="$VPN_SOCKS"
VPN_SCRIPT="$VPN_SCRIPT"
WEB_USER="$WEB_USER"
API_PORT="$API_PORT"
WEB_PORT="$WEB_PORT"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASS="$DB_PASS"
DISABLE_APACHE="$DISABLE_APACHE"
SSL_CERT="$SSL_CERT"
SSL_KEY="$SSL_KEY"
GO_VERSION="$GO_VERSION"
NODE_MAJOR="$NODE_MAJOR"
JWT_SECRET="$JWT_SECRET"
IP_HASH_SALT="$IP_HASH_SALT"
EXTERNAL_NEWS_TOKEN="$EXTERNAL_NEWS_TOKEN"
EOF
umask 022
log "Sazlamalar: $CONF  (domen: $DOMAIN, papka: $APP_DIR)"

# -----------------------------------------------------------------------------
# 1. Internet / proxy
# -----------------------------------------------------------------------------
net_direct() { curl -fsS -m 6 -o /dev/null https://github.com >/dev/null 2>&1; }
net_proxy()  { curl -fsS -m 8 -o /dev/null -x "socks5h://$VPN_SOCKS" https://github.com >/dev/null 2>&1; }

log "Internet barlanýar"
if net_direct; then
    ok "GitHub göni açylýar"
else
    if [ -x "$VPN_SCRIPT" ]; then warn "GitHub göni açylmaýar — VPN skripti işledilýär: $VPN_SCRIPT"; "$VPN_SCRIPT" >/dev/null 2>&1 || true; sleep 2; fi
    if net_proxy; then
        PROXY="socks5h://$VPN_SOCKS"; GIT_NET=(-c "http.proxy=$PROXY")
        export HTTPS_PROXY="socks5://$VPN_SOCKS" HTTP_PROXY="socks5://$VPN_SOCKS" NO_PROXY="localhost,127.0.0.1"
        ok "GitHub proxy arkaly ($VPN_SOCKS)"
    else
        warn "GitHub-a ne göni, ne proxy ($VPN_SOCKS) bilen baryp bolýar. BUNDLE / GO_TARBALL / NODE_TARBALL berilse offline dowam edýär."
    fi
fi
curlx() { if [ -n "$PROXY" ]; then curl -fL --retry 3 -x "$PROXY" "$@"; else curl -fL --retry 3 "$@"; fi; }

# -----------------------------------------------------------------------------
# 2. Paketler
# -----------------------------------------------------------------------------
log "Paketler gurnalýar (git, curl, nginx, mysql, openssl, unzip)"
apt-get update -qq
apt-get install -y -qq git curl ca-certificates openssl unzip xz-utils nginx >/dev/null
if ! command -v mysql >/dev/null; then
    apt-get install -y -qq mysql-server >/dev/null || apt-get install -y -qq mariadb-server >/dev/null
    systemctl enable --now mysql 2>/dev/null || systemctl enable --now mariadb 2>/dev/null || true
fi
ok "paketler taýýar"

# --- Go ---
need_go=1
if command -v /usr/local/go/bin/go >/dev/null && /usr/local/go/bin/go version | grep -q "go$GO_VERSION"; then need_go=0; fi
if [ "$need_go" = 1 ]; then
    log "Go $GO_VERSION gurnalýar"
    tgz="/tmp/go$GO_VERSION.linux-amd64.tar.gz"
    if [ -n "$GO_TARBALL" ] && [ -f "$GO_TARBALL" ]; then cp "$GO_TARBALL" "$tgz"; else curlx -o "$tgz" "https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz" || die "Go ýükläp bolmady. Lokaldan iberiň we GO_TARBALL=/ýol beriň."; fi
    rm -rf /usr/local/go && tar -C /usr/local -xzf "$tgz"
fi
export PATH="/usr/local/go/bin:$PATH" GOPATH=/root/go GOFLAGS=-mod=mod GOPROXY="${GOPROXY:-https://proxy.golang.org,https://goproxy.io,direct}" GOSUMDB=off CGO_ENABLED=0
ok "$(go version)"

# --- Node ---
need_node=1
if command -v node >/dev/null && [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -ge "$NODE_MAJOR" ]; then need_node=0; fi
if [ "$need_node" = 1 ]; then
    log "Node.js $NODE_MAJOR gurnalýar"
    txz="/tmp/node.tar.xz"
    if [ -n "$NODE_TARBALL" ] && [ -f "$NODE_TARBALL" ]; then
        cp "$NODE_TARBALL" "$txz"
    else
        fname="$(curlx -s "https://nodejs.org/dist/latest-v$NODE_MAJOR.x/SHASUMS256.txt" | grep -o "node-v[0-9.]*-linux-x64.tar.xz" | head -1 || true)"
        [ -n "$fname" ] || die "Node ýükläp bolmady. Lokaldan node-v$NODE_MAJOR*-linux-x64.tar.xz iberip NODE_TARBALL=/ýol beriň."
        curlx -o "$txz" "https://nodejs.org/dist/latest-v$NODE_MAJOR.x/$fname" || die "Node ýükläp bolmady."
    fi
    tar -C /usr/local --strip-components=1 -xJf "$txz"
fi
ok "node $(node -v), npm $(npm -v)"
if [ -n "$PROXY" ]; then npm config set proxy "socks5://$VPN_SOCKS" >/dev/null; npm config set https-proxy "socks5://$VPN_SOCKS" >/dev/null; fi

# -----------------------------------------------------------------------------
# 3. Apache → nginx
# -----------------------------------------------------------------------------
if systemctl list-unit-files 2>/dev/null | grep -q '^apache2'; then
    if [ "$DISABLE_APACHE" = 1 ]; then
        if systemctl is-active --quiet apache2; then
            log "Apache togtadylýar (80/443 nginx-e geçýär)"
            # SSL sertifikatyny apache konfiginden ýatda saklaýarys (aşakda ulanylýar)
            if [ -z "$SSL_CERT" ]; then
                cf="$(grep -rlE "ServerName\s+(www\.)?$DOMAIN" /etc/apache2/sites-enabled/ 2>/dev/null | head -1 || true)"
                [ -n "$cf" ] && {
                    SSL_CERT="$(grep -hE '^\s*SSLCertificateFile' "$cf" | head -1 | awk '{print $2}' || true)"
                    SSL_KEY="$(grep -hE '^\s*SSLCertificateKeyFile' "$cf" | head -1 | awk '{print $2}' || true)"
                    chain="$(grep -hE '^\s*SSLCertificateChainFile' "$cf" | head -1 | awk '{print $2}' || true)"
                    if [ -n "$SSL_CERT" ] && [ -n "$chain" ] && [ -f "$chain" ]; then
                        mkdir -p /etc/ssl/sdlohom && cat "$SSL_CERT" "$chain" > /etc/ssl/sdlohom/fullchain.pem && SSL_CERT=/etc/ssl/sdlohom/fullchain.pem
                    fi
                }
            fi
            systemctl stop apache2
        fi
        systemctl disable apache2 >/dev/null 2>&1 || true
        ok "apache2 öçürildi"
    else
        warn "DISABLE_APACHE=0: apache2 80/443-de bolsa nginx başlamaz!"
    fi
fi

# -----------------------------------------------------------------------------
# 4. Kod (clone / pull)
# -----------------------------------------------------------------------------
log "Kod: $APP_DIR"
git config --global --get-all safe.directory 2>/dev/null | grep -qxF "$APP_DIR" || git config --global --add safe.directory "$APP_DIR"
if [ -n "$BUNDLE" ] && [ -f "$BUNDLE" ]; then
    if [ -d "$APP_DIR/.git" ]; then
        ( cd "$APP_DIR" && git fetch -q "$BUNDLE" "$BRANCH:refs/remotes/bundle/$BRANCH" && git checkout -q "$BRANCH" && git merge --ff-only -q "bundle/$BRANCH" )
    else
        git clone -q -b "$BRANCH" "$BUNDLE" "$APP_DIR"
    fi
    ok "kod bundle-dan alyndy: $BUNDLE"
else
    if [ -d "$APP_DIR/.git" ]; then
        cd "$APP_DIR"
        if [ -n "$GITHUB_TOKEN" ]; then ( umask 077; printf 'https://%s:%s@github.com\n' "$GH_USER" "$GITHUB_TOKEN" > .git/github-credentials ); git config credential.helper "store --file=$APP_DIR/.git/github-credentials"; fi
        git remote set-url origin "$REPO_URL"
        git "${GIT_NET[@]}" fetch -q origin "$BRANCH" || die "GitHub-dan alyp bolmady (internet/VPN/token). Ýa-da lokaldan bundle iberiň: BUNDLE=/ýol/sdlohom.bundle"
        git checkout -q "$BRANCH" && git merge --ff-only -q "origin/$BRANCH"
    else
        url="$REPO_URL"; [ -n "$GITHUB_TOKEN" ] && url="https://$GH_USER:$GITHUB_TOKEN@github.com/${REPO_URL#https://github.com/}"
        git "${GIT_NET[@]}" clone -q -b "$BRANCH" "$url" "$APP_DIR" || die "GitHub-dan clone edip bolmady (internet/VPN/token). Ýa-da lokaldan bundle iberiň: BUNDLE=/ýol/sdlohom.bundle"
        cd "$APP_DIR" && git remote set-url origin "$REPO_URL"
        if [ -n "$GITHUB_TOKEN" ]; then ( umask 077; printf 'https://%s:%s@github.com\n' "$GH_USER" "$GITHUB_TOKEN" > .git/github-credentials ); git config credential.helper "store --file=$APP_DIR/.git/github-credentials"; fi
    fi
    ok "kod GitHub-dan täzelendi"
fi
cd "$APP_DIR" && git log -1 --format='   commit: %h %s'
[ -f backend/go.mod ] && [ -f frontend/package.json ] || die "$APP_DIR içinde backend/frontend tapylmady"

# -----------------------------------------------------------------------------
# 5. Baza
# -----------------------------------------------------------------------------
log "MySQL: baza '$DB_NAME', ulanyjy '$DB_USER'"
mysql -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;" || die "MySQL-e girip bolmady (sudo mysql işleýärmi?)"
tables="$(mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'")"
rows="$(mysql -N -e "SELECT IFNULL((SELECT COUNT(*) FROM \`$DB_NAME\`.admins),0)" 2>/dev/null || echo 0)"
if [ -n "$DB_DUMP" ] && [ -f "$DB_DUMP" ]; then
    # DB_DUMP açyk berilse hemişe import edilýär (dumpdaky tablisalar täzeden döredilýär)
    log "Dump import edilýär: $DB_DUMP"
    mysql --default-character-set=utf8mb4 "$DB_NAME" < "$DB_DUMP" && ok "import tamam"
elif [ "${tables:-0}" = 0 ] || [ "${rows:-0}" = 0 ]; then
    dump=""
    for cand in "$APP_DIR/database/sdlohom.sql" /root/sdlohom.sql "$HOME/sdlohom.sql" /home/*/sdlohom.sql; do [ -z "$dump" ] && [ -f "$cand" ] && dump="$cand"; done
    if [ -n "$dump" ]; then
        log "Baza boş — dump import edilýär: $dump"
        mysql --default-character-set=utf8mb4 "$DB_NAME" < "$dump" && ok "import tamam"
    else
        warn "Baza boş we dump tapylmady. Lokaldan iberiň: scp database\\sdlohom.sql ubuntu@SERWER:~/  soň: sudo DB_DUMP=~/sdlohom.sql bash install.sh"
    fi
else
    ok "bazada $tables tablisa, $rows admin bar (import geçildi)"
fi

# -----------------------------------------------------------------------------
# 6. .env faýllary (bar bolsa üýtgedilmeýär)
# -----------------------------------------------------------------------------
log ".env faýllary"
if [ ! -f backend/.env ]; then
cat > backend/.env <<EOF
APP_ENV=production
PORT=$API_PORT
PUBLIC_URL=https://www.$DOMAIN
UPLOADS_DIR=$APP_DIR/backend/uploads
MIGRATIONS_DIR=$APP_DIR/backend/migrations
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
JWT_TTL_HOURS=12
CORS_ORIGINS=https://www.$DOMAIN,https://$DOMAIN,http://www.$DOMAIN,http://$DOMAIN
TIMEZONE=Asia/Ashgabat
MAX_UPLOAD_MB=64
TRUST_PROXY=1
IP_HASH_SALT=$IP_HASH_SALT
EXTERNAL_NEWS_TOKEN=$EXTERNAL_NEWS_TOKEN
EOF
ok "backend/.env döredildi"; else ok "backend/.env bar (üýtgedilmedi)"; fi
if [ ! -f frontend/.env.production ]; then
cat > frontend/.env.production <<EOF
NEXT_PUBLIC_API_URL=https://www.$DOMAIN/api/v1
API_URL=http://127.0.0.1:$API_PORT/api/v1
NEXT_PUBLIC_SITE_URL=https://www.$DOMAIN
EOF
ok "frontend/.env.production döredildi"; else ok "frontend/.env.production bar (üýtgedilmedi)"; fi
chmod 600 backend/.env frontend/.env.production

# -----------------------------------------------------------------------------
# 7. Build
# -----------------------------------------------------------------------------
log "Backend build (Go)"
( cd backend && go build -ldflags="-s -w" -o bin/api ./cmd/api && go build -ldflags="-s -w" -o bin/migrate ./cmd/migrate && go build -ldflags="-s -w" -o bin/adminctl ./cmd/adminctl ) || die "Go build şowsuz (go modullary üçin internet/proxy gerek)"
ok "backend/bin/api taýýar"

log "Frontend build (Next.js) — birnäçe minut"
( cd frontend && export NODE_OPTIONS="--max-old-space-size=2048" NEXT_TELEMETRY_DISABLED=1 && npm ci --no-audit --no-fund --loglevel=error && npm run build ) || die "npm build şowsuz (registry.npmjs.org açykmy? proxy?)"
ok "frontend/.next taýýar"

chown -R "$WEB_USER:$WEB_USER" "$APP_DIR"
chmod 600 backend/.env frontend/.env.production

# -----------------------------------------------------------------------------
# 8. systemd
# -----------------------------------------------------------------------------
log "systemd hyzmatlary"
cat > /etc/systemd/system/sdlohom-api.service <<EOF
[Unit]
Description=SDLOHOM API (Go Fiber)
After=network.target mysql.service mariadb.service

[Service]
Type=simple
User=$WEB_USER
Group=$WEB_USER
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/bin/api
Restart=always
RestartSec=3
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
cat > /etc/systemd/system/sdlohom-web.service <<EOF
[Unit]
Description=SDLOHOM web (Next.js)
After=network.target sdlohom-api.service

[Service]
Type=simple
User=$WEB_USER
Group=$WEB_USER
WorkingDirectory=$APP_DIR/frontend
Environment=NODE_ENV=production
Environment=PORT=$WEB_PORT
Environment=PATH=/usr/local/bin:/usr/bin:/bin
EnvironmentFile=$APP_DIR/frontend/.env.production
ExecStart=/usr/local/bin/node $APP_DIR/frontend/node_modules/next/dist/bin/next start -p $WEB_PORT
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable sdlohom-api sdlohom-web >/dev/null 2>&1
systemctl restart sdlohom-api; sleep 2; systemctl restart sdlohom-web; sleep 4
systemctl is-active --quiet sdlohom-api || { journalctl -u sdlohom-api -n 20 --no-pager; die "sdlohom-api başlamady"; }
systemctl is-active --quiet sdlohom-web || { journalctl -u sdlohom-web -n 20 --no-pager; die "sdlohom-web başlamady"; }
ok "sdlohom-api we sdlohom-web işleýär"

# -----------------------------------------------------------------------------
# 9. SSL sertifikaty (bar bolany ulanylýar, täze alynmaýar)
# -----------------------------------------------------------------------------
if [ -z "$SSL_CERT" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
fi
if [ -z "$SSL_CERT" ]; then
    cf="$(grep -rlE "ServerName\s+(www\.)?$DOMAIN" /etc/apache2/sites-available/ 2>/dev/null | head -1 || true)"
    if [ -n "$cf" ]; then
        SSL_CERT="$(grep -hE '^\s*SSLCertificateFile' "$cf" | head -1 | awk '{print $2}' || true)"
        SSL_KEY="$(grep -hE '^\s*SSLCertificateKeyFile' "$cf" | head -1 | awk '{print $2}' || true)"
        chain="$(grep -hE '^\s*SSLCertificateChainFile' "$cf" | head -1 | awk '{print $2}' || true)"
        if [ -n "$SSL_CERT" ] && [ -n "$chain" ] && [ -f "$chain" ]; then mkdir -p /etc/ssl/sdlohom && cat "$SSL_CERT" "$chain" > /etc/ssl/sdlohom/fullchain.pem && SSL_CERT=/etc/ssl/sdlohom/fullchain.pem; fi
    fi
fi
HAS_SSL=0
[ -n "$SSL_CERT" ] && [ -f "$SSL_CERT" ] && [ -n "$SSL_KEY" ] && [ -f "$SSL_KEY" ] && HAS_SSL=1
sed -i "s#^SSL_CERT=.*#SSL_CERT=\"$SSL_CERT\"#; s#^SSL_KEY=.*#SSL_KEY=\"$SSL_KEY\"#" "$CONF"

# -----------------------------------------------------------------------------
# 10. nginx
# -----------------------------------------------------------------------------
log "nginx: $DOMAIN (SSL: $([ $HAS_SSL = 1 ] && echo "$SSL_CERT" || echo 'ýok — HTTP'))"
SITE=/etc/nginx/sites-available/$DOMAIN
common_locations() {
cat <<EOF
    client_max_body_size 64m;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;
    access_log /var/log/nginx/$DOMAIN.access.log;
    error_log  /var/log/nginx/$DOMAIN.error.log;

    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
    location /uploads/ {
        alias $APP_DIR/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        add_header Cross-Origin-Resource-Policy "cross-origin";
        try_files \$uri =404;
    }
    location /_next/static/ {
        proxy_pass http://127.0.0.1:$WEB_PORT/_next/static/;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location / {
        proxy_pass http://127.0.0.1:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
EOF
}
if [ "$HAS_SSL" = 1 ]; then
{
cat <<EOF
# SDLOHOM — install.sh tarapyndan döredildi ($(date +%F))
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://www.$DOMAIN\$request_uri; }
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;
    ssl_certificate     $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    return 301 https://www.$DOMAIN\$request_uri;
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.$DOMAIN;
    ssl_certificate     $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    ssl_protocols TLSv1.2 TLSv1.3;
EOF
common_locations
echo "}"
} > "$SITE"
else
{
cat <<EOF
# SDLOHOM — install.sh tarapyndan döredildi ($(date +%F)) — SSL ýok (HTTP)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
EOF
common_locations
echo "}"
} > "$SITE"
    # SSL ýok bolsa .env-lerdäki https → http (ilkinji gurnamada)
    sed -i "s#https://www.$DOMAIN#http://www.$DOMAIN#g; s#https://$DOMAIN#http://$DOMAIN#g" backend/.env frontend/.env.production
    systemctl restart sdlohom-api sdlohom-web || true
fi
ln -sf "$SITE" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>&1 | tail -2 || die "nginx konfigi nädogry: $SITE"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
ok "nginx işleýär"

# -----------------------------------------------------------------------------
# 11. Admin hasaby (islege görä) + barlag
# -----------------------------------------------------------------------------
if [ -n "$ADMIN_PASSWORD" ]; then
    ( cd backend && ./bin/adminctl -user superadmin -password "$ADMIN_PASSWORD" -role superadmin ) && ok "superadmin hasaby taýýar"
fi

log "Barlag"
curl -fsS -m 10 "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null && ok "API: http://127.0.0.1:$API_PORT/api/v1/health" || warn "API jogap bermeýär: journalctl -u sdlohom-api -n 50"
code="$(curl -s -o /dev/null -m 60 -w '%{http_code}' "http://127.0.0.1:$WEB_PORT/tm")"; [ "$code" = 200 ] && ok "Web: /tm → 200" || warn "Web /tm → $code: journalctl -u sdlohom-web -n 50"
code="$(curl -s -o /dev/null -m 60 -w '%{http_code}' -H "Host: www.$DOMAIN" "http://127.0.0.1/tm")"; ok "nginx → /tm → $code"

cat <<EOF

=============================================================
 TAMAM.  Saýt:  $([ $HAS_SSL = 1 ] && echo https || echo http)://www.$DOMAIN
         Admin: $([ $HAS_SSL = 1 ] && echo https || echo http)://www.$DOMAIN/admin
         API:   $([ $HAS_SSL = 1 ] && echo https || echo http)://www.$DOMAIN/api/v1/health
 Sazlamalar: $CONF   |  Loglar: journalctl -u sdlohom-api -f / -u sdlohom-web -f
 Täzelemek: sudo bash $APP_DIR/deploy/install.sh   (ýa-da: sudo $APP_DIR/deploy/deploy.sh)
 Domeni üýtgetmek: sudo DOMAIN=taze.domen.tm bash $APP_DIR/deploy/install.sh
$([ $HAS_SSL = 1 ] || echo " SSL goşmak: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN, soň .env-lerde http→https we restart")
=============================================================
EOF
