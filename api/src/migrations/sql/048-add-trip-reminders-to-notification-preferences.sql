-- Whether to be reminded, a couple of days before a trip, of what's still
-- to pack on its lists. On by default, like the other notification types.
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS notify_on_trip_reminders BOOLEAN NOT NULL DEFAULT true;
