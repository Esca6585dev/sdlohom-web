package utils

import (
	"crypto/rand"
	"encoding/hex"
	"html"
	"regexp"
	"strings"
	"unicode"
)

var (
	reTags       = regexp.MustCompile(`(?s)<[^>]*>`)
	reSpaces     = regexp.MustCompile(`\s+`)
	reSlugDash   = regexp.MustCompile(`-+`)
	reScript     = regexp.MustCompile(`(?is)<script.*?</script>`)
	reStyleBlock = regexp.MustCompile(`(?is)<style.*?</style>`)
	reOnAttr     = regexp.MustCompile(`(?i)\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)`)
	reJSHref     = regexp.MustCompile(`(?i)(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')`)
)

// StripTags removes HTML tags and decodes entities, collapsing whitespace.
func StripTags(s string) string {
	s = reScript.ReplaceAllString(s, " ")
	s = reStyleBlock.ReplaceAllString(s, " ")
	s = reTags.ReplaceAllString(s, " ")
	s = html.UnescapeString(s)
	s = strings.ReplaceAll(s, " ", " ")
	s = strings.ReplaceAll(s, "­", "")
	s = reSpaces.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

// Excerpt returns the first n runes of the plain text, cut at a word boundary.
func Excerpt(htmlText string, n int) string {
	t := StripTags(htmlText)
	r := []rune(t)
	if len(r) <= n {
		return t
	}
	cut := string(r[:n])
	if i := strings.LastIndex(cut, " "); i > n/2 {
		cut = cut[:i]
	}
	return strings.TrimSpace(cut) + "…"
}

var (
	reNbspRun = regexp.MustCompile(`(?i)(?:&nbsp;|\x{00a0}|[ \t]){3,}`)
	reTabSpan = regexp.MustCompile(`(?is)<span[^>]*white-space:\s*pre[^>]*>\s*</span>`)
)

// TidyLegacyHTML collapses the tab/nbsp padding the old WYSIWYG editor left in migrated content.
func TidyLegacyHTML(s string) string {
	s = reTabSpan.ReplaceAllString(s, " ")
	s = reNbspRun.ReplaceAllString(s, " ")
	return s
}

// SanitizeHTML removes scripts, inline event handlers and javascript: URLs from admin HTML content.
func SanitizeHTML(s string) string {
	s = reScript.ReplaceAllString(s, "")
	s = reOnAttr.ReplaceAllString(s, "")
	s = reJSHref.ReplaceAllString(s, `$1="#"`)
	return s
}

var translit = map[rune]string{
	// Turkmen Latin
	'ä': "a", 'Ä': "a", 'ç': "ch", 'Ç': "ch", 'ž': "zh", 'Ž': "zh", 'ň': "n", 'Ň': "n",
	'ö': "o", 'Ö': "o", 'ş': "sh", 'Ş': "sh", 'ü': "u", 'Ü': "u", 'ý': "y", 'Ý': "y",
	// Cyrillic (Russian)
	'а': "a", 'б': "b", 'в': "v", 'г': "g", 'д': "d", 'е': "e", 'ё': "yo", 'ж': "zh", 'з': "z",
	'и': "i", 'й': "y", 'к': "k", 'л': "l", 'м': "m", 'н': "n", 'о': "o", 'п': "p", 'р': "r",
	'с': "s", 'т': "t", 'у': "u", 'ф': "f", 'х': "h", 'ц': "ts", 'ч': "ch", 'ш': "sh", 'щ': "sch",
	'ъ': "", 'ы': "y", 'ь': "", 'э': "e", 'ю': "yu", 'я': "ya",
	'А': "a", 'Б': "b", 'В': "v", 'Г': "g", 'Д': "d", 'Е': "e", 'Ё': "yo", 'Ж': "zh", 'З': "z",
	'И': "i", 'Й': "y", 'К': "k", 'Л': "l", 'М': "m", 'Н': "n", 'О': "o", 'П': "p", 'Р': "r",
	'С': "s", 'Т': "t", 'У': "u", 'Ф': "f", 'Х': "h", 'Ц': "ts", 'Ч': "ch", 'Ш': "sh", 'Щ': "sch",
	'Ъ': "", 'Ы': "y", 'Ь': "", 'Э': "e", 'Ю': "yu", 'Я': "ya",
}

// Slugify converts a Turkmen/Russian/English title into an ASCII URL slug.
func Slugify(s string) string {
	s = StripTags(s)
	var b strings.Builder
	for _, r := range s {
		if t, ok := translit[r]; ok {
			b.WriteString(t)
			continue
		}
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			if r < 128 {
				b.WriteRune(unicode.ToLower(r))
			}
		default:
			b.WriteRune('-')
		}
	}
	out := reSlugDash.ReplaceAllString(b.String(), "-")
	out = strings.Trim(out, "-")
	if len(out) > 120 {
		out = strings.Trim(out[:120], "-")
	}
	if out == "" {
		out = "item"
	}
	return out
}

// RandomHex returns n random bytes hex-encoded.
func RandomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// NormalizeLang maps any accepted language code to the canonical API form (tm|en|ru).
func NormalizeLang(l string) string {
	switch strings.ToLower(strings.TrimSpace(l)) {
	case "en", "eng", "english":
		return "en"
	case "ru", "rus", "russian":
		return "ru"
	default:
		return "tm"
	}
}

// DBLang maps canonical API lang to the value stored in the database (we keep legacy codes tm|eng|rus).
func DBLang(l string) string {
	switch NormalizeLang(l) {
	case "en":
		return "eng"
	case "ru":
		return "rus"
	default:
		return "tm"
	}
}

// APILang maps a database lang value to the canonical API form.
func APILang(dbLang string) string { return NormalizeLang(dbLang) }
