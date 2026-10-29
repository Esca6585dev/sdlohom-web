-- Advertising / promo banners shown in sidebars and on the home page.
CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position VARCHAR(40) NOT NULL DEFAULT 'news_sidebar',
  lang VARCHAR(5) NOT NULL DEFAULT '',
  title VARCHAR(150) NOT NULL DEFAULT '',
  image VARCHAR(255) NOT NULL,
  link VARCHAR(255) NULL,
  open_new_tab TINYINT(1) NOT NULL DEFAULT 1,
  sort INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  clicks INT NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_banners_pos (position, is_active, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
