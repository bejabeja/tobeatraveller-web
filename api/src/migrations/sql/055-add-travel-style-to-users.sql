ALTER TABLE users
    ADD COLUMN IF NOT EXISTS travel_style VARCHAR(20) CHECK (travel_style IN ('van', 'occasional'));
