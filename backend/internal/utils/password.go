package utils

import (
	"crypto/sha1"
	"crypto/subtle"
	"encoding/hex"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword returns a bcrypt hash.
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), 12)
	return string(b), err
}

// LegacySHA1Hash wraps a legacy SHA1 hex digest so it can be stored next to bcrypt hashes.
func LegacySHA1Hash(sha1Hex string) string { return "sha1$" + strings.ToLower(sha1Hex) }

// CheckPassword verifies plain against a stored hash. It supports bcrypt and legacy "sha1$<hex>" hashes.
// needsRehash is true when the stored hash is legacy and should be upgraded to bcrypt.
func CheckPassword(stored, plain string) (ok bool, needsRehash bool) {
	if strings.HasPrefix(stored, "sha1$") {
		sum := sha1.Sum([]byte(plain))
		want := strings.TrimPrefix(stored, "sha1$")
		got := hex.EncodeToString(sum[:])
		return subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1, true
	}
	return bcrypt.CompareHashAndPassword([]byte(stored), []byte(plain)) == nil, false
}
