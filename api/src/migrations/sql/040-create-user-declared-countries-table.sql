-- Countries a user says they have been to, without a trip or entry behind
-- them. Shown apart from the countries their activity earned, and never
-- counted towards badges, so the earned passport stays trustworthy.
CREATE TABLE IF NOT EXISTS user_declared_countries (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code CHAR(2) NOT NULL,
    declared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, country_code)
);
