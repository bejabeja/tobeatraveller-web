-- Postgres doesn't index foreign keys on its own, and these per-user lookups
-- run on every profile and passport view and after every trip, van log or
-- diary entry and follow (badge evaluation). Without an index each one reads
-- the whole table, so its cost would grow with the whole app's data.
--
-- Plain CREATE INDEX (not CONCURRENTLY): migrate.js runs each file in one
-- implicit transaction, where CONCURRENTLY isn't allowed. At the current
-- size the brief lock this takes is not noticeable.
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_van_log_entries_user_id ON van_log_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_life_diary_entries_user_id ON life_diary_entries(user_id);

-- The UNIQUE (follower_id, followed_id) index starts with follower_id, so it
-- can't serve "who follows this user" (follower counts, the "popular" badge).
CREATE INDEX IF NOT EXISTS idx_user_followers_followed_id ON user_followers(followed_id);

-- Serves the notifications list (by user, newest activity first), the
-- unread and total counts, and the grouping lookup, all filtered by user.
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_last_activity ON notifications(user_id, last_activity_at DESC);
