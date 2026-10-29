// Package store is the data-access layer: every SQL statement lives here and is parameterised.
package store

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/jmoiron/sqlx"

	"sdlohom/backend/internal/config"
)

type Store struct {
	DB  *sqlx.DB
	Cfg *config.Config
}

func New(db *sqlx.DB, cfg *config.Config) *Store { return &Store{DB: db, Cfg: cfg} }

// ErrNotFound is returned when a row does not exist.
var ErrNotFound = errors.New("not found")

func wrapNotFound(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// urlPtr converts a relative upload path pointer to an absolute URL pointer.
func (s *Store) urlPtr(rel *string) *string {
	if rel == nil || strings.TrimSpace(*rel) == "" {
		return nil
	}
	u := s.Cfg.UploadURL(*rel)
	return &u
}

func (s *Store) url(rel string) string {
	if strings.TrimSpace(rel) == "" {
		return ""
	}
	return s.Cfg.UploadURL(rel)
}

func strPtr(v string) *string {
	v = strings.TrimSpace(v)
	if v == "" {
		return nil
	}
	return &v
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func like(q string) string {
	q = strings.TrimSpace(q)
	q = strings.NewReplacer("%", "\\%", "_", "\\_").Replace(q)
	return "%" + q + "%"
}
