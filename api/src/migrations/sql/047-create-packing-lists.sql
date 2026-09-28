-- A user can keep several packing lists (a weekend, a long trip, what to
-- check before driving off) instead of a single one, each for one of their
-- trips if they like; deleting the trip keeps the list.
CREATE TABLE IF NOT EXISTS packing_lists (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
    name VARCHAR(60) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Also for a database where an earlier draft of this migration made the
-- table without it: every step here can run again safely.
ALTER TABLE packing_lists
    ADD COLUMN IF NOT EXISTS itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_packing_lists_user_id ON packing_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_packing_lists_itinerary_id ON packing_lists(itinerary_id);

-- The items now belong to a list, and the table is named after them; the
-- keys Postgres named after the old table follow.
ALTER TABLE IF EXISTS packing_checklist_items RENAME TO packing_list_items;
ALTER INDEX IF EXISTS packing_checklist_items_pkey RENAME TO packing_list_items_pkey;

ALTER INDEX IF EXISTS idx_packing_checklist_items_list_id RENAME TO idx_packing_list_items_list_id;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packing_checklist_items_user_id_fkey') THEN
        ALTER TABLE packing_list_items RENAME CONSTRAINT packing_checklist_items_user_id_fkey TO packing_list_items_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packing_checklist_items_list_id_fkey') THEN
        ALTER TABLE packing_list_items RENAME CONSTRAINT packing_checklist_items_list_id_fkey TO packing_list_items_list_id_fkey;
    END IF;
END $$;

ALTER TABLE packing_list_items
    ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES packing_lists(id) ON DELETE CASCADE;

-- What each user already had becomes their first list, named in their
-- language (English when it isn't known, like their emails).
INSERT INTO packing_lists (id, user_id, name)
SELECT gen_random_uuid(), users.id,
    CASE users.language
        WHEN 'es' THEN 'Mi equipaje'
        WHEN 'fr' THEN 'Mes bagages'
        WHEN 'it' THEN 'Il mio bagaglio'
        WHEN 'de' THEN 'Mein Gepäck'
        ELSE 'My packing list'
    END
FROM users
WHERE EXISTS (SELECT 1 FROM packing_list_items items WHERE items.user_id = users.id AND items.list_id IS NULL);

UPDATE packing_list_items items
SET list_id = lists.id
FROM packing_lists lists
WHERE lists.user_id = items.user_id AND items.list_id IS NULL;

ALTER TABLE packing_list_items ALTER COLUMN list_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_packing_list_items_list_id ON packing_list_items(list_id);

-- How many of it to take (NULL: just the one), and its place in its list,
-- which people can change; what's there keeps the order it was added in.
ALTER TABLE packing_list_items ADD COLUMN IF NOT EXISTS quantity SMALLINT;
ALTER TABLE packing_list_items ADD COLUMN IF NOT EXISTS position INTEGER;

UPDATE packing_list_items items
SET position = ordered.position
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY created_at, id) AS position
    FROM packing_list_items
) ordered
WHERE items.id = ordered.id AND items.position IS NULL;

ALTER TABLE packing_list_items ALTER COLUMN position SET NOT NULL;
