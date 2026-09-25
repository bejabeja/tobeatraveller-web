-- Whether the user hears about the new public countries and stamps of the
-- people they follow. On by default, like the other notification types.
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS notify_on_friend_stamps BOOLEAN NOT NULL DEFAULT true;
