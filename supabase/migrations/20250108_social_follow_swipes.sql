-- Track social media follows for free swipes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followed_instagram BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followed_twitter BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followed_linkedin BOOLEAN DEFAULT FALSE;
