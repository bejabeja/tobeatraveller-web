-- Free-text body for admin-sent notices ("admin_notice" type); every other
-- notification type keeps rendering a fixed, translated template instead.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
