package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/jmoiron/sqlx"
)

// SeedIfEmpty loads seed/*.sql (site content) when the menus table is empty, so a fresh
// server gets the migrated public content straight from the repository (git pull is enough).
func SeedIfEmpty(db *sqlx.DB, dir string) error {
	var n int
	if err := db.Get(&n, `SELECT COUNT(*) FROM menus`); err != nil {
		return fmt.Errorf("seed check: %w", err)
	}
	if n > 0 {
		return nil
	}
	files, _ := filepath.Glob(filepath.Join(dir, "*.sql"))
	if len(files) == 0 {
		log.Printf("[seed] menus table is empty and no seed files found in %s", dir)
		return nil
	}
	for _, f := range files {
		body, err := os.ReadFile(f)
		if err != nil {
			return err
		}
		log.Printf("[seed] database is empty — loading %s (%d KB)", filepath.Base(f), len(body)/1024)
		// one transaction = one connection, so the FOREIGN_KEY_CHECKS session flag applies to the whole file
		tx, err := db.Beginx()
		if err != nil {
			return err
		}
		if _, err := tx.Exec("SET FOREIGN_KEY_CHECKS=0"); err != nil {
			tx.Rollback()
			return err
		}
		if _, err := tx.Exec(string(body)); err != nil {
			tx.Rollback()
			return fmt.Errorf("seed %s: %w", filepath.Base(f), err)
		}
		if _, err := tx.Exec("SET FOREIGN_KEY_CHECKS=1"); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	var menus, news int
	_ = db.Get(&menus, `SELECT COUNT(*) FROM menus`)
	_ = db.Get(&news, `SELECT COUNT(*) FROM news`)
	log.Printf("[seed] done: %d menus, %d news", menus, news)
	return nil
}
