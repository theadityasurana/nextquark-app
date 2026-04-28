-- RPC: Search jobs with proper AND between title keywords and experience keywords.
-- Supabase PostgREST cannot AND multiple .or() calls, so we do it in SQL.
CREATE OR REPLACE FUNCTION search_jobs(
  p_title_keywords text[] DEFAULT NULL,
  p_exp_keywords text[] DEFAULT NULL,
  p_exclude_ids text[] DEFAULT NULL,
  p_tab text DEFAULT 'discover',
  p_search_tags text[] DEFAULT NULL,
  p_company_names text[] DEFAULT NULL,
  p_location_keywords text[] DEFAULT NULL,
  p_work_modes text[] DEFAULT NULL,
  p_job_types text[] DEFAULT NULL,
  p_posted_after timestamptz DEFAULT NULL,
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0
)
RETURNS SETOF jobs AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM jobs j
  WHERE
    -- Exclude swiped jobs
    (p_exclude_ids IS NULL OR j.id != ALL(p_exclude_ids))

    -- Tab filter
    AND (
      CASE p_tab
        WHEN 'india' THEN j.location ILIKE '%india%'
        WHEN 'foryou' THEN j.location ILIKE '%india%'
        WHEN 'remote' THEN (j.type ILIKE '%remote%' OR j.location ILIKE '%remote%')
        ELSE TRUE
      END
    )

    -- Title keywords (OR within, AND with everything else)
    AND (
      p_title_keywords IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_title_keywords) kw
        WHERE j.title ILIKE '%' || kw || '%'
      )
    )

    -- Experience keywords (OR within, AND with everything else)
    AND (
      p_exp_keywords IS NULL
      OR j.experience IS NULL
      OR j.experience = ''
      OR EXISTS (
        SELECT 1 FROM unnest(p_exp_keywords) kw
        WHERE j.experience ILIKE '%' || kw || '%'
      )
    )

    -- Search tags (match title or company_name)
    AND (
      p_search_tags IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_search_tags) tag
        WHERE j.title ILIKE '%' || tag || '%'
           OR j.company_name ILIKE '%' || tag || '%'
      )
    )

    -- Company filter
    AND (
      p_company_names IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_company_names) cn
        WHERE j.company_name ILIKE '%' || cn || '%'
      )
    )

    -- Location filter
    AND (
      p_location_keywords IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_location_keywords) loc
        WHERE j.location ILIKE '%' || loc || '%'
      )
    )

    -- Work mode filter
    AND (
      p_work_modes IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_work_modes) wm
        WHERE j.type ILIKE '%' || wm || '%'
           OR j.location ILIKE '%' || wm || '%'
      )
    )

    -- Job type filter (column is "type", not "employment_type")
    AND (
      p_job_types IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_job_types) jt
        WHERE j.type ILIKE '%' || jt || '%'
      )
    )

    -- Posted within filter
    AND (p_posted_after IS NULL OR j.created_at >= p_posted_after)

  ORDER BY j.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
