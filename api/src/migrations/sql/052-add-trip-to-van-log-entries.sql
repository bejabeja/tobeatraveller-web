ALTER TABLE van_log_entries
    ADD COLUMN IF NOT EXISTS itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_van_log_entries_itinerary_id ON van_log_entries(itinerary_id);
