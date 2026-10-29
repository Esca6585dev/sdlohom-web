// Package httpx contains the JSON envelope helpers and typed API errors shared by all handlers.
package httpx

import (
	"errors"
	"math"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// APIError is returned to the client as {"error": {...}}.
type APIError struct {
	Status  int               `json:"-"`
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

func (e *APIError) Error() string { return e.Message }

func NotFound(msg string) *APIError {
	if msg == "" {
		msg = "Tapylmady"
	}
	return &APIError{Status: 404, Code: "not_found", Message: msg}
}
func Validation(msg string, fields map[string]string) *APIError {
	if msg == "" {
		msg = "Maglumatlar nädogry"
	}
	return &APIError{Status: 422, Code: "validation", Message: msg, Fields: fields}
}
func Unauthorized(msg string) *APIError {
	if msg == "" {
		msg = "Ulgama giriň"
	}
	return &APIError{Status: 401, Code: "unauthorized", Message: msg}
}
func Forbidden(msg string) *APIError {
	if msg == "" {
		msg = "Rugsat ýok"
	}
	return &APIError{Status: 403, Code: "forbidden", Message: msg}
}
func Conflict(msg string) *APIError { return &APIError{Status: 409, Code: "conflict", Message: msg} }
func RateLimited() *APIError {
	return &APIError{Status: 429, Code: "rate_limited", Message: "Köp synanyşyk, biraz garaşyň"}
}
func Internal(err error) *APIError {
	return &APIError{Status: 500, Code: "internal", Message: "Içki ýalňyşlyk: " + err.Error()}
}

// Meta is pagination metadata.
type Meta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

func NewMeta(page, limit, total int) Meta {
	tp := int(math.Ceil(float64(total) / float64(limit)))
	if tp < 1 {
		tp = 1
	}
	return Meta{Page: page, Limit: limit, Total: total, TotalPages: tp}
}

// OK writes {"data": v}.
func OK(c fiber.Ctx, v any) error { return c.JSON(fiber.Map{"data": v}) }

// Created writes 201 {"data": v}.
func Created(c fiber.Ctx, v any) error { return c.Status(201).JSON(fiber.Map{"data": v}) }

// Paged writes {"data": v, "meta": m}.
func Paged(c fiber.Ctx, v any, m Meta) error { return c.JSON(fiber.Map{"data": v, "meta": m}) }

// NoContent writes 204.
func NoContent(c fiber.Ctx) error { return c.SendStatus(204) }

// ErrorHandler is the Fiber error handler that renders APIError / fiber.Error as the envelope.
func ErrorHandler(c fiber.Ctx, err error) error {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		return c.Status(apiErr.Status).JSON(fiber.Map{"error": apiErr})
	}
	var fe *fiber.Error
	if errors.As(err, &fe) {
		code := "internal"
		switch fe.Code {
		case 404:
			code = "not_found"
		case 401:
			code = "unauthorized"
		case 403:
			code = "forbidden"
		case 429:
			code = "rate_limited"
		case 400, 422:
			code = "validation"
		case 413:
			code = "validation"
		}
		return c.Status(fe.Code).JSON(fiber.Map{"error": fiber.Map{"code": code, "message": fe.Message}})
	}
	return c.Status(500).JSON(fiber.Map{"error": fiber.Map{"code": "internal", "message": err.Error()}})
}

// Pagination reads ?page=&limit= with bounds.
func Pagination(c fiber.Ctx, defLimit, maxLimit int) (page, limit, offset int) {
	page, _ = strconv.Atoi(c.Query("page", "1"))
	limit, _ = strconv.Atoi(c.Query("limit", strconv.Itoa(defLimit)))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = defLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	return page, limit, (page - 1) * limit
}

// ParamInt reads an integer route parameter.
func ParamInt(c fiber.Ctx, name string) (int, error) {
	n, err := strconv.Atoi(c.Params(name))
	if err != nil || n <= 0 {
		return 0, NotFound("")
	}
	return n, nil
}
