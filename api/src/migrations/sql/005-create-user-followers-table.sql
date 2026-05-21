CREATE TABLE IF NOT EXISTS user_followers (
    id UUID PRIMARY KEY,
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, followed_id)
);
