-- SDLOHOM v2 schema (MySQL 8 / MariaDB 10.4+ compatible)

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL DEFAULT '',
  surname VARCHAR(100) NOT NULL DEFAULT '',
  username VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('superadmin','admin','editor') NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  legacy_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NULL,
  lang VARCHAR(5) NOT NULL DEFAULT 'tm',
  title VARCHAR(150) NOT NULL,
  full_title VARCHAR(200) NOT NULL DEFAULT '',
  slug VARCHAR(190) NOT NULL,
  content LONGTEXT NULL,
  image VARCHAR(255) NULL,
  video VARCHAR(255) NULL,
  external_url VARCHAR(255) NULL,
  sort INT NOT NULL DEFAULT 0,
  depth TINYINT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  show_in_menu TINYINT(1) NOT NULL DEFAULT 1,
  legacy_table VARCHAR(20) NULL,
  legacy_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_menus_lang_slug (lang, slug),
  KEY ix_menus_parent (parent_id),
  KEY ix_menus_lang_sort (lang, sort),
  CONSTRAINT fk_menus_parent FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lang VARCHAR(5) NOT NULL DEFAULT 'tm',
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  excerpt VARCHAR(600) NOT NULL DEFAULT '',
  content LONGTEXT NULL,
  image VARCHAR(255) NULL,
  video VARCHAR(255) NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  views INT NOT NULL DEFAULT 0,
  legacy_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_news_lang_slug (lang, slug),
  KEY ix_news_lang_pub (lang, is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS slides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lang VARCHAR(5) NOT NULL DEFAULT 'tm',
  design TINYINT NOT NULL DEFAULT 1,
  title VARCHAR(200) NOT NULL DEFAULT '',
  subtitle VARCHAR(200) NOT NULL DEFAULT '',
  caption VARCHAR(200) NOT NULL DEFAULT '',
  image VARCHAR(255) NOT NULL,
  link VARCHAR(255) NULL,
  sort INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  legacy_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_slides_lang_sort (lang, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(64) NOT NULL PRIMARY KEY,
  `value` TEXT NULL,
  `group` VARCHAR(32) NOT NULL DEFAULT 'general',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NULL,
  message TEXT NOT NULL,
  ip VARCHAR(45) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  legacy_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_contacts_created (created_at),
  KEY ix_contacts_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(20) NOT NULL DEFAULT 'image',
  path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL DEFAULT '',
  mime VARCHAR(100) NOT NULL DEFAULT '',
  size BIGINT NOT NULL DEFAULT 0,
  uploaded_by INT NULL,
  legacy_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_path (path),
  KEY ix_media_kind (kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  legacy_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  legacy_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_portal_users_username (username),
  KEY ix_portal_users_group (group_id),
  CONSTRAINT fk_portal_users_group FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  file VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL DEFAULT '',
  note VARCHAR(255) NOT NULL DEFAULT '',
  legacy_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_user_files_group (group_id),
  CONSTRAINT fk_user_files_group FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  actor_type ENUM('admin','portal') NOT NULL DEFAULT 'admin',
  event ENUM('login','logout','failed') NOT NULL DEFAULT 'login',
  ip VARCHAR(45) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_login_logs_created (created_at),
  KEY ix_login_logs_user (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NULL,
  admin_username VARCHAR(60) NOT NULL DEFAULT '',
  action VARCHAR(40) NOT NULL,
  entity VARCHAR(40) NOT NULL,
  entity_id INT NULL,
  details TEXT NULL,
  ip VARCHAR(45) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS page_views (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  path VARCHAR(255) NOT NULL,
  locale VARCHAR(5) NOT NULL DEFAULT 'tm',
  referrer VARCHAR(255) NOT NULL DEFAULT '',
  ip_hash CHAR(64) NOT NULL DEFAULT '',
  visitor_id CHAR(36) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  device ENUM('desktop','mobile','tablet','bot') NOT NULL DEFAULT 'desktop',
  browser VARCHAR(40) NOT NULL DEFAULT '',
  os VARCHAR(40) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pv_created (created_at),
  KEY ix_pv_path (path),
  KEY ix_pv_visitor (visitor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (`key`,`value`,`group`) VALUES
('site_title_tm','Saçly Dursunowa adyndaky Arkadag şäher lukmançylyk orta hünär okuw mekdebi','general'),
('site_title_en','Arkadag City Medical Secondary Vocational School named after Sachly Dursunova','general'),
('site_title_ru','Аркадагское городское медицинское среднее профессиональное училище имени Сачлы Дурсуновой','general'),
('phone','','contact'),
('email','','contact'),
('address_tm','','contact'),
('address_en','','contact'),
('address_ru','','contact'),
('meta_description_tm','','seo'),
('meta_description_en','','seo'),
('meta_description_ru','','seo'),
('logo','','general'),
('stat_books','0','stats'),
('stat_specialties','0','stats'),
('stat_teachers','0','stats'),
('stat_students','0','stats'),
('facebook','','social'),
('instagram','','social'),
('youtube','','social'),
('telegram','','social'),
('moodle_url','http://119.235.119.206/','general'),
('map_url','','contact'),
('external_news_enabled','1','integrations'),
('external_news_url','https://merkez.bilim.tm/api/v1/centralized','integrations'),
('external_news_token','','integrations');
