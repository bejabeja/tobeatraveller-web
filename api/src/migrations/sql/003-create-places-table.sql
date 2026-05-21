CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    label TEXT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    category VARCHAR(50) DEFAULT 'other',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
