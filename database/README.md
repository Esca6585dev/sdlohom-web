# Baza dumplary

Bu papkadaky `*.sql` faýllar **git-e goşulmaýar** (parol heşleri we giriş loglary bar).

- `sdlohom.sql` — täze shema + geçirilen maglumatlar (lokalda `mysqldump -u root sdlohom > database/sdlohom.sql` bilen döredilýär). Serwere `scp` bilen iberip `mysql -u sdlohom -p sdlohom < sdlohom.sql` edip ýüklenýär.
- `sdlohomdatabase.sql` — köne PHP saýtyň dumpy (MariaDB üçin `utf8mb4_0900_ai_ci` → `utf8mb4_unicode_ci` çalşylan). Diňe `backend/cmd/migrate` täzeden işletmek gerek bolsa.

Shema migrasiýalary `backend/migrations/*.sql`-de; API başlanda awtomat ulanylýar.
