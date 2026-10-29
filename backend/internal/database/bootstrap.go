package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/jmoiron/sqlx"

	"sdlohom/backend/internal/utils"
)

// EnsureAdmin creates the first "superadmin" account when the admins table is empty.
// The password comes from ADMIN_PASSWORD; otherwise a random one is generated and written to
// <dir>/initial-admin-password.txt (0600) and printed to the log, so the operator can log in and change it.
func EnsureAdmin(db *sqlx.DB, password, dir string) error {
	var n int
	if err := db.Get(&n, `SELECT COUNT(*) FROM admins`); err != nil {
		return fmt.Errorf("admin check: %w", err)
	}
	if n > 0 {
		return nil
	}
	generated := false
	if password == "" {
		password = "Sdl-" + utils.RandomHex(5) + "!"
		generated = true
	}
	hash, err := utils.HashPassword(password)
	if err != nil {
		return err
	}
	if _, err := db.Exec(`INSERT INTO admins (name, surname, username, password_hash, role, is_active) VALUES ('Super','Admin','superadmin',?,'superadmin',1)`, hash); err != nil {
		return fmt.Errorf("create admin: %w", err)
	}
	if generated {
		p := filepath.Join(dir, "initial-admin-password.txt")
		_ = os.WriteFile(p, []byte(fmt.Sprintf("superadmin\n%s\n", password)), 0o600)
		log.Printf("[bootstrap] no admins found — created 'superadmin' with password %q (also saved to %s). Change it after the first login!", password, p)
	} else {
		log.Printf("[bootstrap] no admins found — created 'superadmin' with ADMIN_PASSWORD from the environment")
	}
	return nil
}
