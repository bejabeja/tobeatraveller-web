CREATE TABLE IF NOT EXISTS itinerary_likes (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, itinerary_id)
);
