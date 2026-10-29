package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

// UAInfo is a minimal user-agent classification used by analytics.
type UAInfo struct {
	Device  string // desktop|mobile|tablet|bot
	Browser string
	OS      string
}

// ParseUA classifies a user agent string without external dependencies.
func ParseUA(ua string) UAInfo {
	l := strings.ToLower(ua)
	info := UAInfo{Device: "desktop", Browser: "Other", OS: "Other"}
	switch {
	case strings.Contains(l, "bot"), strings.Contains(l, "crawl"), strings.Contains(l, "spider"),
		strings.Contains(l, "curl/"), strings.Contains(l, "wget"), strings.Contains(l, "python-requests"),
		strings.Contains(l, "go-http-client"):
		info.Device = "bot"
	case strings.Contains(l, "ipad"), strings.Contains(l, "tablet"), (strings.Contains(l, "android") && !strings.Contains(l, "mobile")):
		info.Device = "tablet"
	case strings.Contains(l, "mobile"), strings.Contains(l, "iphone"), strings.Contains(l, "android"):
		info.Device = "mobile"
	}
	switch {
	case strings.Contains(l, "edg/"), strings.Contains(l, "edge/"):
		info.Browser = "Edge"
	case strings.Contains(l, "opr/"), strings.Contains(l, "opera"):
		info.Browser = "Opera"
	case strings.Contains(l, "yabrowser"):
		info.Browser = "Yandex"
	case strings.Contains(l, "samsungbrowser"):
		info.Browser = "Samsung"
	case strings.Contains(l, "firefox/"):
		info.Browser = "Firefox"
	case strings.Contains(l, "chrome/"), strings.Contains(l, "crios/"):
		info.Browser = "Chrome"
	case strings.Contains(l, "safari/"):
		info.Browser = "Safari"
	case strings.Contains(l, "msie"), strings.Contains(l, "trident/"):
		info.Browser = "IE"
	}
	switch {
	case strings.Contains(l, "windows"):
		info.OS = "Windows"
	case strings.Contains(l, "android"):
		info.OS = "Android"
	case strings.Contains(l, "iphone"), strings.Contains(l, "ipad"), strings.Contains(l, "ios"):
		info.OS = "iOS"
	case strings.Contains(l, "mac os"), strings.Contains(l, "macintosh"):
		info.OS = "macOS"
	case strings.Contains(l, "linux"):
		info.OS = "Linux"
	}
	return info
}

// HashIP returns a salted SHA-256 of an IP for privacy-preserving unique visitor counts.
func HashIP(ip, salt string) string {
	sum := sha256.Sum256([]byte(salt + "|" + ip))
	return hex.EncodeToString(sum[:])
}
