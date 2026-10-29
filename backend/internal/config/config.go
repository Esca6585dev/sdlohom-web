package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration, loaded from environment / .env.
type Config struct {
	AppEnv     string
	Port       string
	PublicURL  string // where this API is reachable, used to build absolute upload URLs
	UploadsDir string

	DBHost string
	DBPort string
	DBUser string
	DBPass string
	DBName string

	// Legacy (old PHP) database, used only by cmd/migrate
	LegacyDBName string
	LegacyHTML   string // path to old html/ folder (uploads, download)

	JWTSecret         string
	JWTTTL            time.Duration
	CORSOrigins       []string
	Timezone          string
	MaxUploadMB       int64
	TrustProxy        bool
	IPHashSalt        string
	ExternalNewsToken string
}

func env(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && strings.TrimSpace(v) != "" {
		return v
	}
	return def
}

// Load reads .env (if present) and environment variables.
func Load() *Config {
	_ = godotenv.Load()

	ttlHours, _ := strconv.Atoi(env("JWT_TTL_HOURS", "12"))
	maxMB, _ := strconv.ParseInt(env("MAX_UPLOAD_MB", "64"), 10, 64)

	c := &Config{
		AppEnv:            env("APP_ENV", "development"),
		Port:              env("PORT", "8090"),
		PublicURL:         strings.TrimRight(env("PUBLIC_URL", "http://localhost:8090"), "/"),
		UploadsDir:        env("UPLOADS_DIR", "./uploads"),
		DBHost:            env("DB_HOST", "127.0.0.1"),
		DBPort:            env("DB_PORT", "3306"),
		DBUser:            env("DB_USER", "root"),
		DBPass:            env("DB_PASS", ""),
		DBName:            env("DB_NAME", "sdlohom"),
		LegacyDBName:      env("LEGACY_DB_NAME", "sdlohomdatabase"),
		LegacyHTML:        env("LEGACY_HTML_DIR", "../html"),
		JWTSecret:         env("JWT_SECRET", "change-me-in-production-please"),
		JWTTTL:            time.Duration(ttlHours) * time.Hour,
		Timezone:          env("TIMEZONE", "Asia/Ashgabat"),
		MaxUploadMB:       maxMB,
		TrustProxy:        env("TRUST_PROXY", "0") == "1",
		IPHashSalt:        env("IP_HASH_SALT", "sdlohom-salt"),
		ExternalNewsToken: env("EXTERNAL_NEWS_TOKEN", ""),
	}
	for _, o := range strings.Split(env("CORS_ORIGINS", "http://localhost:3001,http://localhost:3000"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			c.CORSOrigins = append(c.CORSOrigins, o)
		}
	}
	return c
}

// DSN builds a go-sql-driver DSN for the given database name.
func (c *Config) DSN(dbName string) string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci&loc=%s&multiStatements=true&interpolateParams=false",
		c.DBUser, c.DBPass, c.DBHost, c.DBPort, dbName, strings.ReplaceAll(c.Timezone, "/", "%2F"))
}

// UploadURL returns the absolute URL of a relative upload path (or nil-safe empty string).
func (c *Config) UploadURL(rel string) string {
	rel = strings.TrimLeft(strings.TrimSpace(rel), "/")
	if rel == "" {
		return ""
	}
	return c.PublicURL + "/uploads/" + rel
}
