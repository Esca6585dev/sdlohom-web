# Serwere ýerleşdirmek (sdlohom.edu.tm)

Ubuntu 22.04/24.04 + nginx + systemd (Docker-siz). Ähli ýollar `/var/www/sdlohom-web` üçin ýazyldy.

## 0. Serwerde gerekli programmalar
```bash
sudo apt update && sudo apt install -y nginx git curl mysql-server   # ýa-da bar bolan MySQL 8 / MariaDB 10.6+
# Go 1.27
curl -LO https://go.dev/dl/go1.27.0.linux-amd64.tar.gz && sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.27.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' | sudo tee /etc/profile.d/go.sh && source /etc/profile.d/go.sh
# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
```

## 1. Kody almak
```bash
sudo mkdir -p /var/www && cd /var/www
sudo git clone https://github.com/Esca6585dev/sdlohom-web.git
sudo chown -R $USER:www-data sdlohom-web && cd sdlohom-web
```

## 2. Baza
```bash
sudo mysql -e "CREATE DATABASE sdlohom CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sdlohom'@'localhost' IDENTIFIED BY 'GUYCLI_PAROL';
GRANT ALL ON sdlohom.* TO 'sdlohom'@'localhost'; FLUSH PRIVILEGES;"
```
Maglumatlary geçirmek — iki ýol:
- **A (maslahat berilýär):** lokal taýýar bazany göçürmek. Lokalda: `mysqldump -u root sdlohom > sdlohom.sql`, serwere `scp` bilen iberiň, serwerde `mysql -u sdlohom -p sdlohom < sdlohom.sql`. (Dumplar repo-da ýok, `.gitignore`-da.)
- **B:** köne `sdlohomdatabase` dumpyny serwere import edip, `backend/bin/migrate` işletmek (`LEGACY_DB_NAME`, `LEGACY_HTML_DIR` `.env`-de).

Suratlar/wideolar `backend/uploads/` içinde repo bilen gelýär.

## 3. Env faýllary
```bash
cp backend/.env.production.example backend/.env          # DB_PASS, JWT_SECRET, IP_HASH_SALT, EXTERNAL_NEWS_TOKEN dolduryň
cp frontend/.env.production.example frontend/.env.production
```
`JWT_SECRET` üçin: `openssl rand -hex 32`.

## 4. Gurmak we hyzmatlar
```bash
sudo cp deploy/sdlohom-api.service deploy/sdlohom-web.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable sdlohom-api sdlohom-web
chmod +x deploy/deploy.sh && sudo ./deploy/deploy.sh      # build + restart; API başlanda tablisalary özi döredýär
```

## 5. nginx + SSL
```bash
sudo cp deploy/nginx.sdlohom.conf /etc/nginx/sites-available/sdlohom.edu.tm
sudo ln -s /etc/nginx/sites-available/sdlohom.edu.tm /etc/nginx/sites-enabled/
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d sdlohom.edu.tm -d www.sdlohom.edu.tm
sudo nginx -t && sudo systemctl reload nginx
```
(Bar bolan Sectigo sertifikatyňyz bolsa `ssl_certificate` ýollaryny şoňa üýtgediň.)

## 6. Admin
```bash
cd backend && ./bin/adminctl -user superadmin -password 'GUYCLI_PAROL' -role superadmin
```
Köne `admin` hasaby köne paroly bilen hem girýär (ilkinji girişde bcrypt-e geçýär).

## Täzelemek
Lokalda `git push`, serwerde `sudo ./deploy/deploy.sh`.

## Barlag
- https://www.sdlohom.edu.tm/api/v1/health → `{"data":{"status":"ok"}}`
- https://www.sdlohom.edu.tm/tm, /en, /ru, /admin
- Loglar: `journalctl -u sdlohom-api -f`, `journalctl -u sdlohom-web -f`

## Docker bilen (alternatiwa)
`docker compose up -d --build` (mysql + api + web); `.env`-de `PUBLIC_URL`, `NEXT_PUBLIC_API_URL`, `CORS_ORIGINS` domen boýunça.
