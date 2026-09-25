-- Which itinerary a trip was cloned from. A clone keeps the original trip's
-- dates and country, so while those dates are untouched it isn't a place the
-- user has been and doesn't stamp its country in their passport.
--
-- No foreign key on purpose: deleting the original must not turn its clones
-- into trips the user seems to have made.
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS cloned_from_itinerary_id UUID;

-- Clones made before this column existed: the same title, dates and place as
-- an earlier trip by someone else, which is what cloning copies.
UPDATE itineraries AS clone
SET cloned_from_itinerary_id = original.id
FROM itineraries AS original
WHERE clone.cloned_from_itinerary_id IS NULL
  AND original.user_id <> clone.user_id
  AND original.created_at < clone.created_at
  AND original.title = clone.title
  AND original.start_date = clone.start_date
  AND original.end_date = clone.end_date
  AND original.location_name IS NOT DISTINCT FROM clone.location_name;
