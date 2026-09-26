-- A user's earlier invite codes, kept for a year after they change their
-- username: links they already shared still credit them, and nobody else
-- can take that name (and with it, the code) in the meantime.
CREATE TABLE IF NOT EXISTS referral_code_history (
    code VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    retired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS referral_code_history_user_id_idx ON referral_code_history (user_id);
CREATE INDEX IF NOT EXISTS referral_code_history_retired_at_idx ON referral_code_history (retired_at);

-- Users who changed their name before this still have the old one as code:
-- it becomes their earlier code, and the current name their code.
INSERT INTO referral_code_history (code, user_id)
SELECT referral_code, id FROM users
WHERE referral_code IS NOT NULL AND referral_code <> LOWER(username)
ON CONFLICT (code) DO NOTHING;

UPDATE users
SET referral_code = LOWER(users.username)
WHERE users.referral_code IS NOT NULL
  AND users.referral_code <> LOWER(users.username)
  AND NOT EXISTS (
      SELECT 1 FROM users other
      WHERE other.id <> users.id AND other.referral_code = LOWER(users.username)
  );
