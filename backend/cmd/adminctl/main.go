// cmd/adminctl creates or resets admin panel accounts from the command line.
//
//	go run ./cmd/adminctl -user superadmin -password 'Strong-Pass-123' -role superadmin -name Admin -surname User
//	go run ./cmd/adminctl -user admin -password 'NewPass123'        (reset password of an existing admin)
package main

import (
	"flag"
	"fmt"
	"log"
	"strings"

	"sdlohom/backend/internal/config"
	"sdlohom/backend/internal/database"
	"sdlohom/backend/internal/utils"
)

func main() {
	cfg := config.Load()
	user := flag.String("user", "", "username (required)")
	pass := flag.String("password", "", "password (required, min 6)")
	role := flag.String("role", "superadmin", "superadmin|admin|editor (only for new accounts unless -set-role)")
	setRole := flag.Bool("set-role", false, "also update role of an existing account")
	name := flag.String("name", "Admin", "first name (new accounts)")
	surname := flag.String("surname", "", "surname (new accounts)")
	flag.Parse()

	*user = strings.TrimSpace(*user)
	if *user == "" || len(*pass) < 6 {
		log.Fatal("usage: adminctl -user <username> -password <min 6 chars> [-role superadmin|admin|editor]")
	}
	if *role != "superadmin" && *role != "admin" && *role != "editor" {
		log.Fatal("role must be superadmin|admin|editor")
	}
	db, err := database.Connect(cfg.DSN(cfg.DBName))
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer db.Close()
	hash, err := utils.HashPassword(*pass)
	if err != nil {
		log.Fatal(err)
	}
	var id int
	if err := db.Get(&id, `SELECT id FROM admins WHERE username = ?`, *user); err == nil {
		q, args := `UPDATE admins SET password_hash = ?, is_active = 1 WHERE id = ?`, []any{hash, id}
		if *setRole {
			q, args = `UPDATE admins SET password_hash = ?, is_active = 1, role = ? WHERE id = ?`, []any{hash, *role, id}
		}
		if _, err := db.Exec(q, args...); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("password reset for existing admin %q (id %d)\n", *user, id)
		return
	}
	res, err := db.Exec(`INSERT INTO admins (name, surname, username, password_hash, role, is_active) VALUES (?,?,?,?,?,1)`, *name, *surname, *user, hash, *role)
	if err != nil {
		log.Fatal(err)
	}
	nid, _ := res.LastInsertId()
	fmt.Printf("created admin %q (id %d, role %s)\n", *user, nid, *role)
}
