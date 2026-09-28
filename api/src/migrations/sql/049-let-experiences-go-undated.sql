-- A trip keeps how many days it lasts on its own, so an experience can be
-- planned by its days without a date. Until now experiences got the day they
-- were saved as their dates, which stamped their country in the passport on
-- that day; those made-up dates are dropped. Re-runnable: only rows without
-- total_days yet are touched.
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS total_days SMALLINT;
ALTER TABLE itineraries ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE itineraries ALTER COLUMN end_date DROP NOT NULL;

UPDATE itineraries SET
    total_days = end_date - start_date + 1,
    start_date = CASE WHEN source = 'experience' THEN NULL ELSE start_date END,
    end_date = CASE WHEN source = 'experience' THEN NULL ELSE end_date END
WHERE total_days IS NULL;

ALTER TABLE itineraries ALTER COLUMN total_days SET NOT NULL;

ALTER TABLE itineraries DROP CONSTRAINT IF EXISTS itineraries_dates_check;
ALTER TABLE itineraries ADD CONSTRAINT itineraries_dates_check CHECK (
    total_days > 0
    AND (start_date IS NULL) = (end_date IS NULL)
    AND (start_date IS NOT NULL OR source IS NOT DISTINCT FROM 'experience')
    AND (start_date IS NULL OR end_date - start_date + 1 = total_days)
);
