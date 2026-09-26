-- When the username last changed: it can change once every 30 days (see
-- utils/usernameChange.js). NULL until the first change, which is always allowed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMP WITH TIME ZONE;
