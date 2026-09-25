ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS location_country_code CHAR(2);
ALTER TABLE van_log_entries ADD COLUMN IF NOT EXISTS location_country_code CHAR(2);
ALTER TABLE life_diary_entries ADD COLUMN IF NOT EXISTS location_country_code CHAR(2);
