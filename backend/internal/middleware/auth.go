// Package middleware holds JWT auth and role guards.
package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"

	"sdlohom/backend/internal/httpx"
)

const (
	TypAdmin  = "admin"
	TypPortal = "portal"
	LocalsKey = "auth"
)

// Claims is the JWT payload for both admins and portal users.
type Claims struct {
	jwt.RegisteredClaims
	UserID   int    `json:"uid"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Typ      string `json:"typ"`
}

// Sign creates a signed token.
func Sign(secret string, ttl time.Duration, userID int, username, role, typ string) (string, time.Time, error) {
	exp := time.Now().Add(ttl)
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(exp),
			Subject:   username,
		},
		UserID: userID, Username: username, Role: role, Typ: typ,
	}
	tok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	return tok, exp, err
}

// Parse validates a token string.
func Parse(secret, tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, err
	}
	return claims, nil
}

func bearer(c fiber.Ctx) string {
	h := c.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(h), "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return strings.TrimSpace(c.Query("token"))
}

// Require returns a middleware that enforces a valid token of the given type.
func Require(secret, typ string) fiber.Handler {
	return func(c fiber.Ctx) error {
		tok := bearer(c)
		if tok == "" {
			return httpx.Unauthorized("")
		}
		claims, err := Parse(secret, tok)
		if err != nil || claims.Typ != typ {
			return httpx.Unauthorized("Token nädogry ýa-da möhleti geçen")
		}
		c.Locals(LocalsKey, claims)
		return c.Next()
	}
}

// RequireRole restricts to the listed admin roles.
func RequireRole(roles ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		cl := Current(c)
		if cl == nil {
			return httpx.Unauthorized("")
		}
		for _, r := range roles {
			if cl.Role == r {
				return c.Next()
			}
		}
		return httpx.Forbidden("Bu amal üçin rugsadyňyz ýok")
	}
}

// Current returns the claims stored by Require (or nil).
func Current(c fiber.Ctx) *Claims {
	if v, ok := c.Locals(LocalsKey).(*Claims); ok {
		return v
	}
	return nil
}
