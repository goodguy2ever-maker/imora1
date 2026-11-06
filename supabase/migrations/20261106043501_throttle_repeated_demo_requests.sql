-- Reduce repeated submissions without exposing existing requests to the caller.
-- This is contact-based throttling, not a replacement for server-verified CAPTCHA.
CREATE INDEX IF NOT EXISTS demo_requests_contact_window_idx
ON public.demo_requests (lower(regexp_replace(contact, '[[:space:]()-]', '', 'g')), created_at DESC);

CREATE OR REPLACE FUNCTION app.limit_repeated_demo_requests()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  contact_key text := lower(regexp_replace(NEW.contact, '[[:space:]()-]', '', 'g'));
BEGIN
  -- Serialize concurrent inserts for one normalized contact.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('demo-request:' || contact_key, 0));
  IF (SELECT count(*) FROM public.demo_requests d
      WHERE lower(regexp_replace(d.contact, '[[:space:]()-]', '', 'g')) = contact_key
        AND d.created_at > now() - interval '1 hour') >= 3 THEN
    RAISE EXCEPTION 'Request limit reached. Try again later.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION app.limit_repeated_demo_requests() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER limit_repeated_demo_requests BEFORE INSERT ON public.demo_requests
FOR EACH ROW EXECUTE FUNCTION app.limit_repeated_demo_requests();
