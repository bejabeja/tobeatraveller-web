CREATE TABLE IF NOT EXISTS itinerary_places (
    id UUID PRIMARY KEY,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    order_index INT DEFAULT 0,
    day_number INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
