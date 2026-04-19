-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_id TEXT,
  order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  coupon_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id ON payment_history(payment_id);

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_history' AND policyname = 'Users can read own payment history') THEN
    CREATE POLICY "Users can read own payment history" ON payment_history FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_history' AND policyname = 'Users can insert own payment history') THEN
    CREATE POLICY "Users can insert own payment history" ON payment_history FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_history' AND policyname = 'Users can update own payment history') THEN
    CREATE POLICY "Users can update own payment history" ON payment_history FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_history' AND policyname = 'Service role full access on payment_history') THEN
    CREATE POLICY "Service role full access on payment_history" ON payment_history FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Subscription columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS applications_remaining INTEGER DEFAULT 40;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS applications_limit INTEGER DEFAULT 40;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_play_purchase_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMPTZ;
