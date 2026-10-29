package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

// Connect opens a pooled connection to MySQL/MariaDB.
func Connect(dsn string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("mysql", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(30 * time.Minute)
	return db, nil
}

// EnsureDatabase creates the target database if it does not exist (needs a DSN without db name).
func EnsureDatabase(serverDSN, dbName string) error {
	db, err := sqlx.Connect("mysql", serverDSN)
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", dbName))
	return err
}

// Migrate applies every *.sql file in dir (sorted) that has not been applied yet.
func Migrate(db *sqlx.DB, dir string) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(100) NOT NULL PRIMARY KEY,
		applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read migrations dir %s: %w", dir, err)
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)
	for _, f := range files {
		var n int
		if err := db.Get(&n, "SELECT COUNT(*) FROM schema_migrations WHERE version = ?", f); err != nil {
			return err
		}
		if n > 0 {
			continue
		}
		body, err := os.ReadFile(filepath.Join(dir, f))
		if err != nil {
			return err
		}
		log.Printf("[migrate] applying %s", f)
		if _, err := db.Exec(string(body)); err != nil {
			return fmt.Errorf("apply %s: %w", f, err)
		}
		if _, err := db.Exec("INSERT INTO schema_migrations (version) VALUES (?)", f); err != nil {
			return err
		}
	}
	return nil
}
