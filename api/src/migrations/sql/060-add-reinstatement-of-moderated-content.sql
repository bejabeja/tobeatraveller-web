-- A comment removed after a report is hidden instead of deleted, so the team can put it
-- back when the person is right to disagree (article 20 of the Digital Services Act).
-- Hidden comments are deleted for good when the report that hid them is purged.
ALTER TABLE itinerary_comments
    ADD COLUMN IF NOT EXISTS moderation_hidden_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_itinerary_comments_moderation_hidden
    ON itinerary_comments (id) WHERE moderation_hidden_at IS NOT NULL;

-- A removal the team took back keeps its report, with who and when.
ALTER TABLE content_reports
    ADD COLUMN IF NOT EXISTS reinstated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reinstated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reinstatement_note TEXT;

ALTER TABLE content_reports DROP CONSTRAINT IF EXISTS content_reports_status_check;
ALTER TABLE content_reports
    ADD CONSTRAINT content_reports_status_check
    CHECK (status IN ('open', 'removed', 'dismissed', 'resolved', 'reinstated'));
