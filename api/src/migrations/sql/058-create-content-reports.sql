-- A report is a notice from a user about a comment, trip or profile. The
-- reporter and the author are kept only as long as the account exists
-- (ON DELETE SET NULL), and resolved reports are purged after a retention
-- window, so no personal data stays here indefinitely. No IP address or
-- user agent is stored.
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY,
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('comment', 'itinerary', 'user')),
    target_id UUID NOT NULL,
    target_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_excerpt VARCHAR(200),
    reason VARCHAR(30) NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate', 'sexual', 'illegal', 'misleading', 'other')),
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'removed', 'dismissed', 'resolved')),
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created
    ON content_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_reports_resolved_at
    ON content_reports (resolved_at) WHERE resolved_at IS NOT NULL;

-- One open report per person and target: pressing the button again does not
-- pile up the queue.
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_one_open_per_reporter
    ON content_reports (reporter_id, target_type, target_id) WHERE status = 'open';

-- A trip hidden by the team stays hidden: its owner cannot publish it again.
ALTER TABLE itineraries
    ADD COLUMN IF NOT EXISTS moderation_hidden_at TIMESTAMP WITH TIME ZONE;
