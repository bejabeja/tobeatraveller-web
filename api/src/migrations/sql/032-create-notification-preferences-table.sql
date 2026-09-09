CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notify_on_comment BOOLEAN NOT NULL DEFAULT true,
    notify_on_like BOOLEAN NOT NULL DEFAULT true,
    notify_on_follow BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
