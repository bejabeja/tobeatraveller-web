CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    location VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT,
    avatar_public_id TEXT,
    bio VARCHAR(160),
    about TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
