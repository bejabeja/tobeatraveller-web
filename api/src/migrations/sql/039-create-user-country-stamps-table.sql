-- Which countries each user has already been told about, so a new visit to a
-- country they already have doesn't announce it again. The passport itself
-- is still computed from their trips and entries.
CREATE TABLE IF NOT EXISTS user_country_stamps (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code CHAR(2) NOT NULL,
    stamped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, country_code)
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS country_code CHAR(2);
