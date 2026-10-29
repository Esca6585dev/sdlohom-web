package store

import (
	"strings"
	"time"

	"sdlohom/backend/internal/models"
	"sdlohom/backend/internal/utils"
)

// ---------- Admins ----------

const adminCols = `id, name, surname, username, password_hash, role, is_active, last_login_at, legacy_id, created_at, updated_at`

func toAdmin(r *models.AdminRow) models.Admin {
	return models.Admin{ID: r.ID, Name: r.Name, Surname: r.Surname, Username: r.Username, Role: r.Role, IsActive: r.IsActive, LastLoginAt: r.LastLoginAt, CreatedAt: r.CreatedAt}
}

func (s *Store) AdminRowByUsername(username string) (*models.AdminRow, error) {
	var r models.AdminRow
	if err := s.DB.Get(&r, `SELECT `+adminCols+` FROM admins WHERE username = ?`, strings.TrimSpace(username)); err != nil {
		return nil, wrapNotFound(err)
	}
	return &r, nil
}

func (s *Store) AdminRowByID(id int) (*models.AdminRow, error) {
	var r models.AdminRow
	if err := s.DB.Get(&r, `SELECT `+adminCols+` FROM admins WHERE id = ?`, id); err != nil {
		return nil, wrapNotFound(err)
	}
	return &r, nil
}

func (s *Store) AdminByID(id int) (*models.Admin, error) {
	r, err := s.AdminRowByID(id)
	if err != nil {
		return nil, err
	}
	a := toAdmin(r)
	return &a, nil
}

func (s *Store) ListAdmins() ([]models.Admin, error) {
	var rows []models.AdminRow
	if err := s.DB.Select(&rows, `SELECT `+adminCols+` FROM admins ORDER BY id`); err != nil {
		return nil, err
	}
	out := make([]models.Admin, 0, len(rows))
	for i := range rows {
		out = append(out, toAdmin(&rows[i]))
	}
	return out, nil
}

type AdminInput struct {
	Name     *string `json:"name"`
	Surname  *string `json:"surname"`
	Username *string `json:"username"`
	Password *string `json:"password"`
	Role     *string `json:"role"`
	IsActive *bool   `json:"is_active"`
}

func validRole(r string) bool { return r == "superadmin" || r == "admin" || r == "editor" }

func (s *Store) CreateAdmin(in AdminInput) (*models.Admin, error) {
	hash, err := utils.HashPassword(deref(in.Password))
	if err != nil {
		return nil, err
	}
	role := "admin"
	if in.Role != nil && validRole(*in.Role) {
		role = *in.Role
	}
	active := true
	if in.IsActive != nil {
		active = *in.IsActive
	}
	res, err := s.DB.Exec(`INSERT INTO admins (name, surname, username, password_hash, role, is_active) VALUES (?,?,?,?,?,?)`,
		deref(in.Name), deref(in.Surname), strings.TrimSpace(deref(in.Username)), hash, role, active)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.AdminByID(int(id))
}

func (s *Store) UpdateAdmin(id int, in AdminInput) (*models.Admin, error) {
	cur, err := s.AdminRowByID(id)
	if err != nil {
		return nil, err
	}
	if in.Name != nil {
		cur.Name = *in.Name
	}
	if in.Surname != nil {
		cur.Surname = *in.Surname
	}
	if in.Username != nil && strings.TrimSpace(*in.Username) != "" {
		cur.Username = strings.TrimSpace(*in.Username)
	}
	if in.Role != nil && validRole(*in.Role) {
		cur.Role = *in.Role
	}
	if in.IsActive != nil {
		cur.IsActive = *in.IsActive
	}
	if in.Password != nil && strings.TrimSpace(*in.Password) != "" {
		if cur.PasswordHash, err = utils.HashPassword(*in.Password); err != nil {
			return nil, err
		}
	}
	if _, err := s.DB.Exec(`UPDATE admins SET name=?, surname=?, username=?, password_hash=?, role=?, is_active=? WHERE id=?`,
		cur.Name, cur.Surname, cur.Username, cur.PasswordHash, cur.Role, cur.IsActive, id); err != nil {
		return nil, err
	}
	return s.AdminByID(id)
}

func (s *Store) SetAdminPassword(id int, hash string) error {
	_, err := s.DB.Exec(`UPDATE admins SET password_hash = ? WHERE id = ?`, hash, id)
	return err
}

func (s *Store) TouchAdminLogin(id int) {
	_, _ = s.DB.Exec(`UPDATE admins SET last_login_at = ? WHERE id = ?`, time.Now(), id)
}

func (s *Store) DeleteAdmin(id int) error {
	res, err := s.DB.Exec(`DELETE FROM admins WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------- User groups ----------

func (s *Store) ListUserGroups() ([]models.UserGroup, error) {
	var rows []models.UserGroupRow
	err := s.DB.Select(&rows, `SELECT g.id, g.name, g.note, g.legacy_id, g.created_at,
		(SELECT COUNT(*) FROM portal_users u WHERE u.group_id = g.id) AS users_count,
		(SELECT COUNT(*) FROM user_files f WHERE f.group_id = g.id) AS files_count
		FROM user_groups g ORDER BY g.id`)
	if err != nil {
		return nil, err
	}
	out := make([]models.UserGroup, 0, len(rows))
	for _, r := range rows {
		out = append(out, models.UserGroup{ID: r.ID, Name: r.Name, Note: r.Note, UsersCount: r.UsersCount, FilesCount: r.FilesCount, CreatedAt: r.CreatedAt})
	}
	return out, nil
}

func (s *Store) UserGroupByID(id int) (*models.UserGroup, error) {
	var r models.UserGroupRow
	err := s.DB.Get(&r, `SELECT g.id, g.name, g.note, g.legacy_id, g.created_at,
		(SELECT COUNT(*) FROM portal_users u WHERE u.group_id = g.id) AS users_count,
		(SELECT COUNT(*) FROM user_files f WHERE f.group_id = g.id) AS files_count
		FROM user_groups g WHERE g.id = ?`, id)
	if err != nil {
		return nil, wrapNotFound(err)
	}
	return &models.UserGroup{ID: r.ID, Name: r.Name, Note: r.Note, UsersCount: r.UsersCount, FilesCount: r.FilesCount, CreatedAt: r.CreatedAt}, nil
}

type UserGroupInput struct {
	Name *string `json:"name"`
	Note *string `json:"note"`
}

func (s *Store) CreateUserGroup(in UserGroupInput) (*models.UserGroup, error) {
	res, err := s.DB.Exec(`INSERT INTO user_groups (name, note) VALUES (?,?)`, strings.TrimSpace(deref(in.Name)), deref(in.Note))
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.UserGroupByID(int(id))
}

func (s *Store) UpdateUserGroup(id int, in UserGroupInput) (*models.UserGroup, error) {
	cur, err := s.UserGroupByID(id)
	if err != nil {
		return nil, err
	}
	if in.Name != nil && strings.TrimSpace(*in.Name) != "" {
		cur.Name = strings.TrimSpace(*in.Name)
	}
	if in.Note != nil {
		cur.Note = *in.Note
	}
	if _, err := s.DB.Exec(`UPDATE user_groups SET name=?, note=? WHERE id=?`, cur.Name, cur.Note, id); err != nil {
		return nil, err
	}
	return s.UserGroupByID(id)
}

func (s *Store) DeleteUserGroup(id int) error {
	res, err := s.DB.Exec(`DELETE FROM user_groups WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------- Portal users ----------

const portalUserSel = `SELECT u.id, u.group_id, COALESCE(g.name,'') AS group_name, u.username, u.password_hash, u.full_name, u.is_active, u.last_login_at, u.legacy_id, u.created_at, u.updated_at
	FROM portal_users u LEFT JOIN user_groups g ON g.id = u.group_id`

func toPortalUser(r *models.PortalUserRow) models.PortalUser {
	return models.PortalUser{ID: r.ID, GroupID: r.GroupID, GroupName: r.GroupName, Username: r.Username, FullName: r.FullName, IsActive: r.IsActive, LastLoginAt: r.LastLoginAt, CreatedAt: r.CreatedAt}
}

func (s *Store) PortalUserRowByUsername(username string) (*models.PortalUserRow, error) {
	var r models.PortalUserRow
	if err := s.DB.Get(&r, portalUserSel+` WHERE u.username = ?`, strings.TrimSpace(username)); err != nil {
		return nil, wrapNotFound(err)
	}
	return &r, nil
}

func (s *Store) PortalUserRowByID(id int) (*models.PortalUserRow, error) {
	var r models.PortalUserRow
	if err := s.DB.Get(&r, portalUserSel+` WHERE u.id = ?`, id); err != nil {
		return nil, wrapNotFound(err)
	}
	return &r, nil
}

func (s *Store) PortalUserByID(id int) (*models.PortalUser, error) {
	r, err := s.PortalUserRowByID(id)
	if err != nil {
		return nil, err
	}
	u := toPortalUser(r)
	return &u, nil
}

func (s *Store) ListPortalUsers(q string, groupID, page, limit int) ([]models.PortalUser, int, error) {
	where, args := []string{"1=1"}, []any{}
	if groupID > 0 {
		where = append(where, "u.group_id = ?")
		args = append(args, groupID)
	}
	if strings.TrimSpace(q) != "" {
		l := like(q)
		where = append(where, "(u.username LIKE ? OR u.full_name LIKE ?)")
		args = append(args, l, l)
	}
	w := strings.Join(where, " AND ")
	var total int
	if err := s.DB.Get(&total, `SELECT COUNT(*) FROM portal_users u WHERE `+w, args...); err != nil {
		return nil, 0, err
	}
	var rows []models.PortalUserRow
	argsL := append(append([]any{}, args...), limit, (page-1)*limit)
	if err := s.DB.Select(&rows, portalUserSel+` WHERE `+w+` ORDER BY u.id DESC LIMIT ? OFFSET ?`, argsL...); err != nil {
		return nil, 0, err
	}
	out := make([]models.PortalUser, 0, len(rows))
	for i := range rows {
		out = append(out, toPortalUser(&rows[i]))
	}
	return out, total, nil
}

type PortalUserInput struct {
	GroupID  *int    `json:"group_id"`
	Username *string `json:"username"`
	Password *string `json:"password"`
	FullName *string `json:"full_name"`
	IsActive *bool   `json:"is_active"`
}

func (s *Store) CreatePortalUser(in PortalUserInput) (*models.PortalUser, error) {
	hash, err := utils.HashPassword(deref(in.Password))
	if err != nil {
		return nil, err
	}
	active := true
	if in.IsActive != nil {
		active = *in.IsActive
	}
	gid := 0
	if in.GroupID != nil {
		gid = *in.GroupID
	}
	res, err := s.DB.Exec(`INSERT INTO portal_users (group_id, username, password_hash, full_name, is_active) VALUES (?,?,?,?,?)`,
		gid, strings.TrimSpace(deref(in.Username)), hash, deref(in.FullName), active)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.PortalUserByID(int(id))
}

func (s *Store) UpdatePortalUser(id int, in PortalUserInput) (*models.PortalUser, error) {
	cur, err := s.PortalUserRowByID(id)
	if err != nil {
		return nil, err
	}
	if in.GroupID != nil {
		cur.GroupID = *in.GroupID
	}
	if in.Username != nil && strings.TrimSpace(*in.Username) != "" {
		cur.Username = strings.TrimSpace(*in.Username)
	}
	if in.FullName != nil {
		cur.FullName = *in.FullName
	}
	if in.IsActive != nil {
		cur.IsActive = *in.IsActive
	}
	if in.Password != nil && strings.TrimSpace(*in.Password) != "" {
		if cur.PasswordHash, err = utils.HashPassword(*in.Password); err != nil {
			return nil, err
		}
	}
	if _, err := s.DB.Exec(`UPDATE portal_users SET group_id=?, username=?, password_hash=?, full_name=?, is_active=? WHERE id=?`,
		cur.GroupID, cur.Username, cur.PasswordHash, cur.FullName, cur.IsActive, id); err != nil {
		return nil, err
	}
	return s.PortalUserByID(id)
}

func (s *Store) SetPortalPassword(id int, hash string) error {
	_, err := s.DB.Exec(`UPDATE portal_users SET password_hash = ? WHERE id = ?`, hash, id)
	return err
}

func (s *Store) TouchPortalLogin(id int) {
	_, _ = s.DB.Exec(`UPDATE portal_users SET last_login_at = ? WHERE id = ?`, time.Now(), id)
}

func (s *Store) DeletePortalUser(id int) error {
	res, err := s.DB.Exec(`DELETE FROM portal_users WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------- User files ----------

const userFileSel = `SELECT f.id, f.group_id, COALESCE(g.name,'') AS group_name, f.file, f.original_name, f.note, f.legacy_id, f.created_at
	FROM user_files f LEFT JOIN user_groups g ON g.id = f.group_id`

func (s *Store) toUserFile(r *models.UserFileRow) models.UserFile {
	return models.UserFile{ID: r.ID, GroupID: r.GroupID, GroupName: r.GroupName, File: r.File, FileURL: s.url(r.File), OriginalName: r.OriginalName, Note: r.Note, CreatedAt: r.CreatedAt}
}

func (s *Store) ListUserFiles(groupID, page, limit int) ([]models.UserFile, int, error) {
	where, args := "1=1", []any{}
	if groupID > 0 {
		where = "f.group_id = ?"
		args = append(args, groupID)
	}
	var total int
	if err := s.DB.Get(&total, `SELECT COUNT(*) FROM user_files f WHERE `+where, args...); err != nil {
		return nil, 0, err
	}
	var rows []models.UserFileRow
	argsL := append(append([]any{}, args...), limit, (page-1)*limit)
	if err := s.DB.Select(&rows, userFileSel+` WHERE `+where+` ORDER BY f.id DESC LIMIT ? OFFSET ?`, argsL...); err != nil {
		return nil, 0, err
	}
	out := make([]models.UserFile, 0, len(rows))
	for i := range rows {
		out = append(out, s.toUserFile(&rows[i]))
	}
	return out, total, nil
}

func (s *Store) FilesForGroup(groupID int) ([]models.UserFile, error) {
	var rows []models.UserFileRow
	if err := s.DB.Select(&rows, userFileSel+` WHERE f.group_id = ? ORDER BY f.id DESC`, groupID); err != nil {
		return nil, err
	}
	out := make([]models.UserFile, 0, len(rows))
	for i := range rows {
		out = append(out, s.toUserFile(&rows[i]))
	}
	return out, nil
}

func (s *Store) UserFileByID(id int) (*models.UserFile, error) {
	var r models.UserFileRow
	if err := s.DB.Get(&r, userFileSel+` WHERE f.id = ?`, id); err != nil {
		return nil, wrapNotFound(err)
	}
	f := s.toUserFile(&r)
	return &f, nil
}

type UserFileInput struct {
	GroupID      *int    `json:"group_id"`
	File         *string `json:"file"`
	OriginalName *string `json:"original_name"`
	Note         *string `json:"note"`
}

func (s *Store) CreateUserFile(in UserFileInput) (*models.UserFile, error) {
	gid := 0
	if in.GroupID != nil {
		gid = *in.GroupID
	}
	res, err := s.DB.Exec(`INSERT INTO user_files (group_id, file, original_name, note) VALUES (?,?,?,?)`, gid, deref(in.File), deref(in.OriginalName), deref(in.Note))
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.UserFileByID(int(id))
}

func (s *Store) UpdateUserFile(id int, in UserFileInput) (*models.UserFile, error) {
	cur, err := s.UserFileByID(id)
	if err != nil {
		return nil, err
	}
	if in.GroupID != nil {
		cur.GroupID = *in.GroupID
	}
	if in.File != nil && strings.TrimSpace(*in.File) != "" {
		cur.File = *in.File
	}
	if in.OriginalName != nil {
		cur.OriginalName = *in.OriginalName
	}
	if in.Note != nil {
		cur.Note = *in.Note
	}
	if _, err := s.DB.Exec(`UPDATE user_files SET group_id=?, file=?, original_name=?, note=? WHERE id=?`, cur.GroupID, cur.File, cur.OriginalName, cur.Note, id); err != nil {
		return nil, err
	}
	return s.UserFileByID(id)
}

func (s *Store) DeleteUserFile(id int) error {
	res, err := s.DB.Exec(`DELETE FROM user_files WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
