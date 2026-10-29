// Package external proxies the centralized education news API (merkez.bilim.tm) with an in-memory
// stale-while-revalidate cache, so the bearer token never reaches the browser and slow upstream
// responses never block page rendering once the cache is warm.
package external

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"sdlohom/backend/internal/models"
)

type cacheEntry struct {
	at   time.Time
	list []models.ExternalNews
	item map[string]any // nil = negative cache (upstream failed) for NegativeTTL
}

type Client struct {
	mu          sync.Mutex
	cache       map[string]cacheEntry
	inflight    map[string]bool
	http        *http.Client
	TTL         time.Duration // after TTL the entry is served stale and refreshed in the background
	MaxStale    time.Duration // after MaxStale the entry is dropped
	NegativeTTL time.Duration // how long a failed detail lookup is remembered
}

func New() *Client {
	return &Client{
		cache:       map[string]cacheEntry{},
		inflight:    map[string]bool{},
		http:        &http.Client{Timeout: 12 * time.Second, Transport: newTransport()},
		TTL:         10 * time.Minute,
		MaxStale:    24 * time.Hour,
		NegativeTTL: 2 * time.Minute,
	}
}

// newTransport dials IPv4 only with TLS 1.2 and HTTP/1.1: the upstream host times out on Go's default
// (IPv6-first, TLS 1.3, HTTP/2) handshake while answering IPv4/TLS 1.2 within a few seconds.
func newTransport() *http.Transport {
	d := &net.Dialer{Timeout: 8 * time.Second, KeepAlive: 30 * time.Second}
	return &http.Transport{
		DialContext: func(ctx context.Context, _ string, addr string) (net.Conn, error) {
			return d.DialContext(ctx, "tcp4", addr)
		},
		TLSClientConfig:       &tls.Config{MaxVersion: tls.VersionTLS12},
		TLSNextProto:          map[string]func(string, *tls.Conn) http.RoundTripper{},
		TLSHandshakeTimeout:   8 * time.Second,
		ResponseHeaderTimeout: 10 * time.Second,
		MaxIdleConnsPerHost:   4,
	}
}

func str(m map[string]any, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			switch t := v.(type) {
			case string:
				if strings.TrimSpace(t) != "" {
					return t
				}
			case float64:
				return fmt.Sprintf("%.0f", t)
			}
		}
	}
	return ""
}

func num(m map[string]any, key string) int {
	if v, ok := m[key].(float64); ok {
		return int(v)
	}
	return 0
}

// List returns the cached list for lang/limit; a fresh fetch only blocks when nothing is cached yet.
func (c *Client) List(baseURL, token, lang string, limit int) []models.ExternalNews {
	key := fmt.Sprintf("list|%s|%d", lang, limit)
	c.mu.Lock()
	e, ok := c.cache[key]
	fresh := ok && time.Since(e.at) < c.TTL
	usable := ok && time.Since(e.at) < c.MaxStale
	if usable && !fresh && !c.inflight[key] {
		c.inflight[key] = true
		go c.refreshList(key, baseURL, token, lang, limit)
	}
	c.mu.Unlock()
	if usable {
		return e.list
	}
	return c.fetchList(key, baseURL, token, lang, limit)
}

func (c *Client) refreshList(key, baseURL, token, lang string, limit int) {
	defer func() {
		c.mu.Lock()
		delete(c.inflight, key)
		c.mu.Unlock()
	}()
	c.fetchList(key, baseURL, token, lang, limit)
}

func (c *Client) fetchList(key, baseURL, token, lang string, limit int) []models.ExternalNews {
	out := []models.ExternalNews{}
	if baseURL == "" {
		return out
	}
	u := strings.TrimRight(baseURL, "/") + "/news/?" + url.Values{"lang": {lang}, "limit": {fmt.Sprint(limit)}}.Encode()
	body, err := c.get(u, token)
	if err != nil {
		return c.stale(key) // keep whatever we had; do not cache the failure
	}
	var payload struct {
		Results []map[string]any `json:"results"`
	}
	if json.Unmarshal(body, &payload) != nil {
		return c.stale(key)
	}
	for _, r := range payload.Results {
		id := num(r, "id")
		var img *string
		if s := str(r, "image_thumbnail", "image"); s != "" {
			img = &s
		}
		var pub *string
		if s := str(r, "published_at", "created_at", "date"); s != "" {
			pub = &s
		}
		out = append(out, models.ExternalNews{
			ID: id, Title: strings.TrimSpace(str(r, "title")), ShortDescription: str(r, "short_description", "description"),
			Image: img, URL: fmt.Sprintf("/%s/external-news/%d", lang, id), PublishedAt: pub,
		})
	}
	c.mu.Lock()
	c.cache[key] = cacheEntry{at: time.Now(), list: out}
	c.mu.Unlock()
	return out
}

func (c *Client) stale(key string) []models.ExternalNews {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e, ok := c.cache[key]; ok {
		return e.list
	}
	return []models.ExternalNews{}
}

// Detail fetches /news/{id}?lang= and returns the raw object (nil on failure).
// Failures are remembered for NegativeTTL so a slow upstream does not stall every page view.
func (c *Client) Detail(baseURL, token, lang string, id int) map[string]any {
	key := fmt.Sprintf("item|%s|%d", lang, id)
	c.mu.Lock()
	if e, ok := c.cache[key]; ok {
		if e.item != nil && time.Since(e.at) < c.MaxStale {
			c.mu.Unlock()
			return e.item
		}
		if e.item == nil && time.Since(e.at) < c.NegativeTTL {
			c.mu.Unlock()
			return nil
		}
	}
	c.mu.Unlock()
	if baseURL == "" {
		return nil
	}
	u := fmt.Sprintf("%s/news/%d?lang=%s", strings.TrimRight(baseURL, "/"), id, url.QueryEscape(lang))
	var item map[string]any
	if body, err := c.get(u, token); err == nil {
		if json.Unmarshal(body, &item) != nil {
			item = nil
		}
	}
	c.mu.Lock()
	c.cache[key] = cacheEntry{at: time.Now(), item: item}
	c.mu.Unlock()
	return item
}

// Warm pre-fills the list cache for the given languages (used at startup, in a goroutine).
func (c *Client) Warm(baseURL, token string, langs []string, limit int) {
	for _, l := range langs {
		c.List(baseURL, token, l, limit)
	}
}

func (c *Client) get(u, token string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if token != "" {
		req.Header.Set("Centralized", "Bearer "+strings.TrimPrefix(token, "Bearer "))
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("external api status %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 4<<20))
}
