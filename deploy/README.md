# Serwere ýerleşdirmek (sdlohom.edu.tm) — bir buýruk

`deploy/install.sh` Ubuntu 22.04/24.04 serwerde hemme zady özi edýär we gaýtadan işledilende täzeleýär:
paketler → Go 1.27 → Node 22 → MySQL → kod (GitHub ýa-da bundle) → baza (dump import) → `.env` →
build → systemd (`sdlohom-api`, `sdlohom-web`) → Apache öçürmek → nginx saýty (domen üýtgedilýär) →
bar bolan SSL sertifikatyny ulanmak (täze almaýar) → barlag.

## A. GitHub açyk ýa-da VPN bar bolsa
```bash
curl -fsSLo install.sh https://raw.githubusercontent.com/Esca6585dev/sdlohom-web/main/deploy/install.sh   # ýa-da scp bilen iberiň
sudo bash install.sh
```
- Repo ýapyk (private) bolsa: `sudo GITHUB_TOKEN=github_pat_xxx bash install.sh` (GitHub → Settings → Developer settings → Fine-grained token → diňe şu repo, Contents: Read).
- GitHub göni açylmasa skript `127.0.0.1:10808` SOCKS5 proxy-ni (tds serwerindäki ýaly VPN) synanyşýar; proxy skriptiňiz bar bolsa `VPN_SCRIPT=/root/vpn.sh`.

## B. Serwer GitHub-a baglanyp bilmese (port 443 ýapyk) — lokaldan ibermek
Lokal kompýuterde (PowerShell, taslamanyň içinde):
```powershell
.\deploy\push-bundle.ps1 -Server ubuntu@SERWER_IP            # kod (git bundle) + baza dumpy + install.sh
.\deploy\push-bundle.ps1 -Server ubuntu@SERWER_IP -WithTools  # + Go/Node tarball (serwerde go.dev/nodejs.org hem ýapyk bolsa)
```
Serwerde:
```bash
sudo BUNDLE=~/sdlohom.bundle DB_DUMP=~/sdlohom.sql bash ~/install.sh
# offline: sudo BUNDLE=~/sdlohom.bundle DB_DUMP=~/sdlohom.sql GO_TARBALL=~/go1.27.0.linux-amd64.tar.gz NODE_TARBALL=~/node-v22.x.x-linux-x64.tar.xz bash ~/install.sh
```
Bellik: `npm ci` üçin registry.npmjs.org, `go build` üçin Go modul proxy-si gerek (VPN bolmasa şolar hem ýapyk bolup biler).

## Sazlamalar
Üýtgeýji hökmünde berilýär ýa-da ilkinji işlenişden soň `/etc/sdlohom/deploy.conf`-da saklanýar:

| Üýtgeýji | Default | Näme |
|---|---|---|
| `DOMAIN` | `sdlohom.edu.tm` | nginx `server_name` (www. awtomat), `.env`-lerdäki URL-ler |
| `APP_DIR` | `/var/www/sdlohom-web` | kod papkasy |
| `DB_NAME`/`DB_USER`/`DB_PASS` | `sdlohom`/`sdlohom`/awtomat | MySQL |
| `DB_DUMP` | awtomat gözleg | ilkinji gurnamada import ediljek `sdlohom.sql` |
| `GITHUB_TOKEN` | — | ýapyk repo üçin |
| `BUNDLE` | — | lokaldan iberilen git bundle |
| `DISABLE_APACHE` | `1` | apache2 togtadylyp öçürilýär (80/443 nginx-e) |
| `SSL_CERT`/`SSL_KEY` | awtomat | boş bolsa letsencrypt ýa-da apache konfiginden alynýar; tapylmasa HTTP |
| `ADMIN_PASSWORD` | — | berilse `superadmin` hasaby döredilýär |
| `EXTERNAL_NEWS_TOKEN` | — | merkez.bilim.tm tokeni (admin panelden hem goýup bolýar) |

Mysal: `sudo DOMAIN=sdlohom.edu.tm ADMIN_PASSWORD='GuycliParol1' bash install.sh`

## SSL
Skript täze sertifikat almaýar. Apache-de Sectigo sertifikaty bolsa, `SSLCertificateFile/KeyFile/ChainFile` ýollaryny okap nginx-e geçirýär (chain bilen `fullchain.pem` ýasaýar). Letsencrypt bar bolsa şony ulanýar. Hiç biri ýok bolsa saýt HTTP-de işleýär; soň:
```bash
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d sdlohom.edu.tm -d www.sdlohom.edu.tm
sudo sed -i 's#http://www.#https://www.#g; s#http://sdlohom#https://sdlohom#g' /var/www/sdlohom-web/backend/.env /var/www/sdlohom-web/frontend/.env.production
sudo bash /var/www/sdlohom-web/deploy/install.sh
```

## Täzelemek
Lokalda `git push` (ýa-da `push-bundle.ps1`), serwerde `sudo bash /var/www/sdlohom-web/deploy/install.sh` (= `deploy.sh`).

## Barlag / loglar
- `https://www.sdlohom.edu.tm/api/v1/health`, `/tm`, `/en`, `/ru`, `/admin`
- `journalctl -u sdlohom-api -f`, `journalctl -u sdlohom-web -f`, `/var/log/nginx/sdlohom.edu.tm.error.log`
- `systemctl status sdlohom-api sdlohom-web nginx`

## Docker (alternatiwa)
`docker compose up -d --build` (mysql + api + web); `.env`-de `PUBLIC_URL`, `NEXT_PUBLIC_API_URL`, `CORS_ORIGINS` domen boýunça.
