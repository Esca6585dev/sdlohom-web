// SDLOHOM API server (Go + Fiber v3).
package main

import (
	"log"
	"os"
	"path/filepath"
	"time"
	_ "time/tzdata"

	"sdlohom/backend/internal/config"
	"sdlohom/backend/internal/database"
	"sdlohom/backend/internal/handlers"
	"sdlohom/backend/internal/router"
	"sdlohom/backend/internal/store"
)

func main() {
	cfg := config.Load()
	if loc, err := time.LoadLocation(cfg.Timezone); err == nil {
		time.Local = loc
	}

	if err := database.EnsureDatabase(cfg.DSN(""), cfg.DBName); err != nil {
		log.Fatalf("ensure database: %v", err)
	}
	db, err := database.Connect(cfg.DSN(cfg.DBName))
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer db.Close()

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "./migrations"
	}
	if err := database.Migrate(db, migrationsDir); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if err := os.MkdirAll(cfg.UploadsDir, 0o755); err != nil {
		log.Fatalf("uploads dir: %v", err)
	}
	abs, _ := filepath.Abs(cfg.UploadsDir)
	log.Printf("uploads dir: %s", abs)

	s := store.New(db, cfg)
	h := handlers.New(s, cfg)
	go h.WarmExternalNews() // pre-fill the merkez.bilim.tm cache so the first home page render is fast
	app := router.New(cfg, h)

	log.Printf("SDLOHOM API listening on :%s (env=%s, public=%s)", cfg.Port, cfg.AppEnv, cfg.PublicURL)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
