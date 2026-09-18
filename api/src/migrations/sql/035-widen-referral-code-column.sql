-- Referral codes are now derived from the username (up to 50 chars, see
-- schemasValidation.js), not a fixed-length random hex string.
ALTER TABLE users ALTER COLUMN referral_code TYPE VARCHAR(50);
