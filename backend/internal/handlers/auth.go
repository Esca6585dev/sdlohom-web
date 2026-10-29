package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v3"

	"sdlohom/backend/internal/httpx"
	"sdlohom/backend/internal/middleware"
	"sdlohom/backend/internal/utils"
)

type loginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *Handler) AdminLogin(c fiber.Ctx) error {
	var req loginReq
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	req.Username = strings.TrimSpace(req.Username)
	ip, ua := h.clientIP(c), h.ua(c)
	row, err := h.S.AdminRowByUsername(req.Username)
	if err != nil || !row.IsActive {
		h.S.LogLogin(req.Username, "admin", "failed", ip, ua)
		return httpx.Unauthorized("Ulanyjy ady ýa-da parol nädogry")
	}
	ok, rehash := utils.CheckPassword(row.PasswordHash, req.Password)
	if !ok {
		h.S.LogLogin(req.Username, "admin", "failed", ip, ua)
		return httpx.Unauthorized("Ulanyjy ady ýa-da parol nädogry")
	}
	if rehash {
		if newHash, err := utils.HashPassword(req.Password); err == nil {
			_ = h.S.SetAdminPassword(row.ID, newHash)
		}
	}
	tok, exp, err := middleware.Sign(h.Cfg.JWTSecret, h.Cfg.JWTTTL, row.ID, row.Username, row.Role, middleware.TypAdmin)
	if err != nil {
		return mapErr(err)
	}
	h.S.TouchAdminLogin(row.ID)
	h.S.LogLogin(row.Username, "admin", "login", ip, ua)
	admin, _ := h.S.AdminByID(row.ID)
	return httpx.OK(c, fiber.Map{"token": tok, "expires_at": exp, "admin": admin})
}

func (h *Handler) AdminMe(c fiber.Ctx) error {
	cl := middleware.Current(c)
	a, err := h.S.AdminByID(cl.UserID)
	if err != nil {
		return httpx.Unauthorized("")
	}
	if !a.IsActive {
		return httpx.Unauthorized("Hasap işjeň däl")
	}
	return httpx.OK(c, a)
}

func (h *Handler) AdminLogout(c fiber.Ctx) error {
	cl := middleware.Current(c)
	h.S.LogLogin(cl.Username, "admin", "logout", h.clientIP(c), h.ua(c))
	return httpx.NoContent(c)
}

type changePwReq struct {
	Current string `json:"current_password"`
	New     string `json:"new_password"`
}

func (h *Handler) AdminChangePassword(c fiber.Ctx) error {
	var req changePwReq
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	if len(req.New) < 6 {
		return httpx.Validation("Täze parol azyndan 6 belgi bolmaly", map[string]string{"new_password": "Azyndan 6 belgi"})
	}
	cl := middleware.Current(c)
	row, err := h.S.AdminRowByID(cl.UserID)
	if err != nil {
		return httpx.Unauthorized("")
	}
	if ok, _ := utils.CheckPassword(row.PasswordHash, req.Current); !ok {
		return httpx.Validation("Häzirki parol nädogry", map[string]string{"current_password": "Nädogry"})
	}
	hash, err := utils.HashPassword(req.New)
	if err != nil {
		return mapErr(err)
	}
	if err := h.S.SetAdminPassword(row.ID, hash); err != nil {
		return mapErr(err)
	}
	h.audit(c, "change_password", "admin", &row.ID, "")
	return httpx.NoContent(c)
}

func (h *Handler) PortalLogin(c fiber.Ctx) error {
	var req loginReq
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	req.Username = strings.TrimSpace(req.Username)
	ip, ua := h.clientIP(c), h.ua(c)
	row, err := h.S.PortalUserRowByUsername(req.Username)
	if err != nil || !row.IsActive {
		h.S.LogLogin(req.Username, "portal", "failed", ip, ua)
		return httpx.Unauthorized("Ulanyjy ady ýa-da parol nädogry")
	}
	ok, rehash := utils.CheckPassword(row.PasswordHash, req.Password)
	if !ok {
		h.S.LogLogin(req.Username, "portal", "failed", ip, ua)
		return httpx.Unauthorized("Ulanyjy ady ýa-da parol nädogry")
	}
	if rehash {
		if newHash, err := utils.HashPassword(req.Password); err == nil {
			_ = h.S.SetPortalPassword(row.ID, newHash)
		}
	}
	tok, exp, err := middleware.Sign(h.Cfg.JWTSecret, h.Cfg.JWTTTL, row.ID, row.Username, "user", middleware.TypPortal)
	if err != nil {
		return mapErr(err)
	}
	h.S.TouchPortalLogin(row.ID)
	h.S.LogLogin(row.Username, "portal", "login", ip, ua)
	u, _ := h.S.PortalUserByID(row.ID)
	return httpx.OK(c, fiber.Map{"token": tok, "expires_at": exp, "user": u})
}

func (h *Handler) PortalMe(c fiber.Ctx) error {
	cl := middleware.Current(c)
	u, err := h.S.PortalUserByID(cl.UserID)
	if err != nil || !u.IsActive {
		return httpx.Unauthorized("")
	}
	return httpx.OK(c, u)
}

func (h *Handler) PortalFiles(c fiber.Ctx) error {
	cl := middleware.Current(c)
	u, err := h.S.PortalUserByID(cl.UserID)
	if err != nil {
		return httpx.Unauthorized("")
	}
	files, err := h.S.FilesForGroup(u.GroupID)
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, files)
}
