CREATE TABLE IF NOT EXISTS public.landing_page_visits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source TEXT NOT NULL,
  medium TEXT,
  campaign TEXT,
  referrer_host TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_page_visits_visited_at_idx
  ON public.landing_page_visits (visited_at DESC);
CREATE INDEX IF NOT EXISTS landing_page_visits_source_visited_at_idx
  ON public.landing_page_visits (source, visited_at DESC);

ALTER TABLE public.landing_page_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.landing_page_visits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_landing_page_visit(
  p_referrer TEXT DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_host TEXT := '';
  v_source TEXT;
BEGIN
  IF p_referrer IS NOT NULL AND length(p_referrer) <= 2048 THEN
    BEGIN
      v_host := lower(regexp_replace(split_part(split_part(p_referrer, '://', 2), '/', 1), '^www\.', ''));
    EXCEPTION WHEN OTHERS THEN
      v_host := '';
    END;
  END IF;

  v_source := lower(left(trim(COALESCE(p_utm_source, '')), 100));
  IF v_source = '' THEN
    v_source := CASE
      WHEN v_host ~ '(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$' THEN 'facebook'
      WHEN v_host ~ '(^|\.)tiktok\.com$|(^|\.)tiktokv\.com$' THEN 'tiktok'
      WHEN v_host ~ '(^|\.)instagram\.com$' THEN 'instagram'
      WHEN v_host ~ '(^|\.)zalo\.me$|(^|\.)zalo\.vn$' THEN 'zalo'
      WHEN v_host ~ '(^|\.)messenger\.com$|(^|\.)m\.me$' THEN 'messenger'
      WHEN v_host = '' THEN 'direct/unknown'
      ELSE 'other'
    END;
  END IF;

  INSERT INTO public.landing_page_visits (source, medium, campaign, referrer_host)
  VALUES (v_source, NULLIF(left(trim(COALESCE(p_utm_medium, '')), 100), ''),
    NULLIF(left(trim(COALESCE(p_utm_campaign, '')), 150), ''), NULLIF(left(v_host, 255), ''));
END;
$$;

REVOKE ALL ON FUNCTION public.record_landing_page_visit(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.record_landing_page_visit(TEXT, TEXT, TEXT, TEXT) TO anon;

CREATE OR REPLACE FUNCTION public.get_admin_landing_page_sources(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_total BIGINT;
  v_sources JSONB;
  v_daily JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users AS admins WHERE admins.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_total FROM public.landing_page_visits
  WHERE visited_at >= now() - make_interval(days => v_days);

  SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'visits', visits) ORDER BY visits DESC), '[]'::JSONB)
  INTO v_sources
  FROM (
    SELECT source, count(*) AS visits FROM public.landing_page_visits
    WHERE visited_at >= now() - make_interval(days => v_days)
    GROUP BY source
  ) AS totals;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', days.day::TEXT, 'visits', COALESCE(totals.visits, 0)) ORDER BY days.day), '[]'::JSONB)
  INTO v_daily
  FROM generate_series(current_date - (v_days - 1), current_date, INTERVAL '1 day') AS days(day)
  LEFT JOIN (
    SELECT (visited_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE AS day, count(*) AS visits
    FROM public.landing_page_visits
    WHERE visited_at >= now() - make_interval(days => v_days)
    GROUP BY 1
  ) AS totals ON totals.day = days.day::DATE;

  RETURN jsonb_build_object('totalVisits', v_total, 'sources', v_sources, 'daily', v_daily, 'days', v_days);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_landing_page_sources(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_landing_page_sources(INTEGER) TO authenticated;
