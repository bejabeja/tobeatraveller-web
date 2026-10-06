ALTER TABLE itineraries
    ADD COLUMN IF NOT EXISTS by_van BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_itineraries_by_van
    ON itineraries (by_van) WHERE by_van = TRUE;
