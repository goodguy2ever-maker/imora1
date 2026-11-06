BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.demo_requests(full_name,company_name,position,contact)
SELECT 'Test request','Test company','Director','rate-test@example.test' FROM generate_series(1,3);
DO $$ BEGIN
  BEGIN
    INSERT INTO public.demo_requests(full_name,company_name,position,contact)
    VALUES ('Test request','Test company','Director',' RATE-TEST@example.test ');
    RAISE EXCEPTION 'FAIL: fourth normalized contact accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
END $$;
INSERT INTO public.demo_requests(full_name,company_name,position,contact)
VALUES ('Other request','Other company','Director','other-rate@example.test');
RESET ROLE;
UPDATE public.demo_requests SET created_at=now()-interval '2 hours' WHERE contact='rate-test@example.test';
SET LOCAL ROLE anon;
INSERT INTO public.demo_requests(full_name,company_name,position,contact)
VALUES ('Later request','Test company','Director','rate-test@example.test');
ROLLBACK;
