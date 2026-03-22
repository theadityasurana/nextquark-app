-- Efficiently append a single swiped job ID without sending the full array
CREATE OR REPLACE FUNCTION append_swiped_job_id(user_id UUID, job_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET swiped_job_ids = CASE
    WHEN swiped_job_ids IS NULL THEN jsonb_build_array(job_id)
    WHEN NOT (swiped_job_ids @> to_jsonb(job_id)) THEN swiped_job_ids || to_jsonb(job_id)
    ELSE swiped_job_ids
  END,
  updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
