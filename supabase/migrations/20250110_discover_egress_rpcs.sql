-- RPC: Top companies by job count within a time range
CREATE OR REPLACE FUNCTION top_companies_hiring(since timestamptz)
RETURNS TABLE(company_name text, job_count bigint) AS $$
  SELECT company_name, COUNT(*) as job_count
  FROM jobs
  WHERE created_at >= since
  GROUP BY company_name
  ORDER BY job_count DESC
  LIMIT 5;
$$ LANGUAGE sql STABLE;

-- RPC: Trending locations within a time range
CREATE OR REPLACE FUNCTION trending_locations(since timestamptz)
RETURNS TABLE(location text, job_count bigint) AS $$
  SELECT location, COUNT(*) as job_count
  FROM jobs
  WHERE created_at >= since
  GROUP BY location
  ORDER BY job_count DESC
  LIMIT 5;
$$ LANGUAGE sql STABLE;
