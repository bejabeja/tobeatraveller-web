-- Every trip, van log entry and diary entry belongs to someone: the API always creates them
-- for the person signed in, and deleting the account deletes them. An official trip seeded
-- before its account was registered was left without an owner, and the jobs that go through
-- everyone's trips took it for one more person. Fails while such a row exists.
ALTER TABLE itineraries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE van_log_entries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE life_diary_entries ALTER COLUMN user_id SET NOT NULL;
