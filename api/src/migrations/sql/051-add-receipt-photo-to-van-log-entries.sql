ALTER TABLE van_log_entries
    ADD COLUMN IF NOT EXISTS receipt_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS receipt_photo_public_id TEXT;
