package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"

	"sdlohom/backend/internal/httpx"
	"sdlohom/backend/internal/middleware"
	"sdlohom/backend/internal/store"
	"sdlohom/backend/internal/utils"
)

// ---------- Contacts ----------

func (h *Handler) AdminContactList(c fiber.Ctx) error {
	page, limit, _ := httpx.Pagination(c, 20, 100)
	unread := c.Query("unread") == "1" || c.Query("unread") == "true"
	items, total, err := h.S.ListContacts(page, limit, unread)
	if err != nil {
		return mapErr(err)
	}
	return httpx.Paged(c, items, httpx.NewMeta(page, limit, total))
}

func (h *Handler) AdminContactPatch(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	var req struct {
		IsRead *bool `json:"is_read"`
	}
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	read := true
	if req.IsRead != nil {
		read = *req.IsRead
	}
	ct, err := h.S.SetContactRead(id, read)
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, ct)
}

func (h *Handler) AdminContactDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	if err := h.S.DeleteContact(id); err != nil {
		return mapErr(err)
	}
	h.audit(c, "delete", "contact", &id, "")
	return httpx.NoContent(c)
}

// ---------- Media ----------

var allowedExt = map[string]map[string]bool{
	"image":    {"jpg": true, "jpeg": true, "jfif": true, "png": true, "gif": true, "webp": true, "bmp": true},
	"video":    {"mp4": true, "webm": true, "mov": true, "m4v": true},
	"document": {"pdf": true, "doc": true, "docx": true, "xls": true, "xlsx": true, "ppt": true, "pptx": true, "zip": true, "rar": true, "txt": true, "jpg": true, "jpeg": true, "png": true, "gif": true, "webp": true, "mp4": true},
}

var allowedFolders = map[string]bool{"habarlar": true, "docs": true, "slides": true, "wideo_habarlar": true, "wideo_menu": true, "wideo_docs": true, "gollanma": true, "files": true, "logo": true, "banners": true}

func (h *Handler) AdminMediaList(c fiber.Ctx) error {
	page, limit, _ := httpx.Pagination(c, 24, 100)
	items, total, err := h.S.ListMedia(strings.TrimSpace(c.Query("kind")), c.Query("q"), page, limit)
	if err != nil {
		return mapErr(err)
	}
	return httpx.Paged(c, items, httpx.NewMeta(page, limit, total))
}

func (h *Handler) AdminMediaUpload(c fiber.Ctx) error {
	kind := strings.ToLower(strings.TrimSpace(c.Query("kind", "image")))
	folder := strings.ToLower(strings.TrimSpace(c.Query("folder", "files")))
	exts, ok := allowedExt[kind]
	if !ok {
		return httpx.Validation("kind nädogry (image|video|document)", nil)
	}
	if !allowedFolders[folder] {
		return httpx.Validation("folder nädogry", nil)
	}
	fh, err := c.FormFile("file")
	if err != nil {
		return httpx.Validation("Faýl saýlaň (file)", map[string]string{"file": "Hökmany"})
	}
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(fh.Filename), "."))
	if !exts[ext] {
		return httpx.Validation("Bu faýl görnüşine rugsat ýok: ."+ext, map[string]string{"file": "Görnüş nädogry"})
	}
	maxBytes := h.Cfg.MaxUploadMB << 20
	if kind == "image" && maxBytes > 15<<20 {
		maxBytes = 15 << 20
	}
	if fh.Size > maxBytes {
		return httpx.Validation(fmt.Sprintf("Faýl örän uly (iň köp %d MB)", maxBytes>>20), map[string]string{"file": "Uly"})
	}
	// sniff content for images/videos
	f, err := fh.Open()
	if err != nil {
		return mapErr(err)
	}
	head := make([]byte, 512)
	n, _ := io.ReadFull(f, head)
	f.Close()
	ctype := http.DetectContentType(head[:n])
	if kind == "image" && !strings.HasPrefix(ctype, "image/") {
		return httpx.Validation("Faýl surat däl", map[string]string{"file": "Surat däl"})
	}
	if kind == "video" && !strings.HasPrefix(ctype, "video/") && !strings.Contains(ctype, "octet-stream") {
		return httpx.Validation("Faýl wideo däl", map[string]string{"file": "Wideo däl"})
	}
	rel := filepath.ToSlash(filepath.Join(folder, time.Now().Format("20060102"), utils.RandomHex(8)+"."+ext))
	abs := filepath.Join(h.Cfg.UploadsDir, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		return mapErr(err)
	}
	if err := c.SaveFile(fh, abs); err != nil {
		return mapErr(err)
	}
	var by *int
	if cl := middleware.Current(c); cl != nil {
		id := cl.UserID
		by = &id
	}
	m, err := h.S.CreateMedia(kind, rel, fh.Filename, ctype, fh.Size, by)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "upload", "media", &m.ID, rel)
	return httpx.Created(c, m)
}

func (h *Handler) AdminMediaDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	m, err := h.S.MediaByID(id)
	if err != nil {
		return mapErr(err)
	}
	if err := h.S.DeleteMedia(id); err != nil {
		return mapErr(err)
	}
	// remove file (ignore errors; keep DB consistent)
	clean := filepath.Clean(filepath.FromSlash(m.Path))
	if !strings.HasPrefix(clean, "..") {
		_ = os.Remove(filepath.Join(h.Cfg.UploadsDir, clean))
	}
	h.audit(c, "delete", "media", &id, m.Path)
	return httpx.NoContent(c)
}

// ---------- User groups ----------

func (h *Handler) AdminGroupList(c fiber.Ctx) error {
	list, err := h.S.ListUserGroups()
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, list)
}

func (h *Handler) AdminGroupCreate(c fiber.Ctx) error {
	var in store.UserGroupInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	if in.Name == nil || strings.TrimSpace(*in.Name) == "" {
		return httpx.Validation("Ady hökmany", map[string]string{"name": "Hökmany"})
	}
	g, err := h.S.CreateUserGroup(in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "create", "user_group", &g.ID, g.Name)
	return httpx.Created(c, g)
}

func (h *Handler) AdminGroupUpdate(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	var in store.UserGroupInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	g, err := h.S.UpdateUserGroup(id, in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "update", "user_group", &id, g.Name)
	return httpx.OK(c, g)
}

func (h *Handler) AdminGroupDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	if err := h.S.DeleteUserGroup(id); err != nil {
		return mapErr(err)
	}
	h.audit(c, "delete", "user_group", &id, "")
	return httpx.NoContent(c)
}

// ---------- Portal users ----------

func (h *Handler) AdminUserList(c fiber.Ctx) error {
	page, limit, _ := httpx.Pagination(c, 20, 100)
	gid, _ := strconv.Atoi(c.Query("group_id", "0"))
	items, total, err := h.S.ListPortalUsers(c.Query("q"), gid, page, limit)
	if err != nil {
		return mapErr(err)
	}
	return httpx.Paged(c, items, httpx.NewMeta(page, limit, total))
}

func (h *Handler) AdminUserCreate(c fiber.Ctx) error {
	var in store.PortalUserInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	fields := map[string]string{}
	if in.Username == nil || strings.TrimSpace(*in.Username) == "" {
		fields["username"] = "Hökmany"
	}
	if in.Password == nil || len(*in.Password) < 4 {
		fields["password"] = "Azyndan 4 belgi"
	}
	if in.GroupID == nil || *in.GroupID <= 0 {
		fields["group_id"] = "Topar saýlaň"
	}
	if len(fields) > 0 {
		return httpx.Validation("Formany dogry dolduryň", fields)
	}
	u, err := h.S.CreatePortalUser(in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "create", "portal_user", &u.ID, u.Username)
	return httpx.Created(c, u)
}

func (h *Handler) AdminUserUpdate(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	var in store.PortalUserInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	u, err := h.S.UpdatePortalUser(id, in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "update", "portal_user", &id, u.Username)
	return httpx.OK(c, u)
}

func (h *Handler) AdminUserDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	if err := h.S.DeletePortalUser(id); err != nil {
		return mapErr(err)
	}
	h.audit(c, "delete", "portal_user", &id, "")
	return httpx.NoContent(c)
}

// ---------- User files ----------

func (h *Handler) AdminUserFileList(c fiber.Ctx) error {
	page, limit, _ := httpx.Pagination(c, 20, 100)
	gid, _ := strconv.Atoi(c.Query("group_id", "0"))
	items, total, err := h.S.ListUserFiles(gid, page, limit)
	if err != nil {
		return mapErr(err)
	}
	return httpx.Paged(c, items, httpx.NewMeta(page, limit, total))
}

func (h *Handler) AdminUserFileCreate(c fiber.Ctx) error {
	var in store.UserFileInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	fields := map[string]string{}
	if in.File == nil || strings.TrimSpace(*in.File) == "" {
		fields["file"] = "Faýl hökmany"
	}
	if in.GroupID == nil || *in.GroupID <= 0 {
		fields["group_id"] = "Topar saýlaň"
	}
	if len(fields) > 0 {
		return httpx.Validation("Formany dogry dolduryň", fields)
	}
	f, err := h.S.CreateUserFile(in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "create", "user_file", &f.ID, f.File)
	return httpx.Created(c, f)
}

func (h *Handler) AdminUserFileUpdate(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	var in store.UserFileInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	f, err := h.S.UpdateUserFile(id, in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "update", "user_file", &id, f.File)
	return httpx.OK(c, f)
}

func (h *Handler) AdminUserFileDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	if err := h.S.DeleteUserFile(id); err != nil {
		return mapErr(err)
	}
	h.audit(c, "delete", "user_file", &id, "")
	return httpx.NoContent(c)
}

// ---------- Admins ----------

func (h *Handler) AdminAdminList(c fiber.Ctx) error {
	list, err := h.S.ListAdmins()
	if err != nil {
		return mapErr(err)
	}
	return httpx.OK(c, list)
}

func (h *Handler) AdminAdminCreate(c fiber.Ctx) error {
	var in store.AdminInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	fields := map[string]string{}
	if in.Username == nil || strings.TrimSpace(*in.Username) == "" {
		fields["username"] = "Hökmany"
	}
	if in.Password == nil || len(*in.Password) < 6 {
		fields["password"] = "Azyndan 6 belgi"
	}
	if len(fields) > 0 {
		return httpx.Validation("Formany dogry dolduryň", fields)
	}
	a, err := h.S.CreateAdmin(in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "create", "admin", &a.ID, a.Username)
	return httpx.Created(c, a)
}

func (h *Handler) AdminAdminUpdate(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	var in store.AdminInput
	if err := bindJSON(c, &in); err != nil {
		return err
	}
	if in.Password != nil && strings.TrimSpace(*in.Password) != "" && len(*in.Password) < 6 {
		return httpx.Validation("Parol azyndan 6 belgi", map[string]string{"password": "Azyndan 6 belgi"})
	}
	a, err := h.S.UpdateAdmin(id, in)
	if err != nil {
		return mapErr(err)
	}
	h.audit(c, "update", "admin", &id, a.Username)
	return httpx.OK(c, a)
}

func (h *Handler) AdminAdminDelete(c fiber.Ctx) error {
	id, err := httpx.ParamInt(c, "id")
	if err != nil {
		return err
	}
	if cl := middleware.Current(c); cl != nil && cl.UserID == id {
		return httpx.Validation("Öz hasabyňyzy pozup bilmersiňiz", nil)
	}
	if err := h.S.DeleteAdmin(id); err != nil {
		return mapErr(err)
	}
	h.audit(c, "delete", "admin", &id, "")
	return httpx.NoContent(c)
}
