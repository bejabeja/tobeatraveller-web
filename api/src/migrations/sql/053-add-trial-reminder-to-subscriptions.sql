ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS trial_reminder_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_trialing_ending
    ON subscriptions(current_period_end)
    WHERE status = 'trialing' AND trial_reminder_sent_at IS NULL;
