BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-000000000099');
INSERT INTO public.profiles(id,role,full_name,email) VALUES ('00000000-0000-4000-8000-000000000099','SUPER_ADMIN','MFA test','mfa@example.test');
INSERT INTO public.demo_requests(full_name,company_name,position,contact) VALUES ('MFA Lead','MFA Company','Director','mfa@example.test');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"aal":"aal1"}',true);
DO $$ BEGIN
  IF public.admin_mfa_verified() THEN RAISE EXCEPTION 'AAL1 bypass'; END IF;
  IF EXISTS (SELECT 1 FROM public.demo_requests) THEN RAISE EXCEPTION 'AAL1 reads leads'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"aal":"aal2"}',true);
DO $$ BEGIN IF NOT public.admin_mfa_verified() THEN RAISE EXCEPTION 'AAL2 denied'; END IF; END $$;
RESET ROLE;
UPDATE public.profiles SET status='blocked' WHERE id='00000000-0000-4000-8000-000000000099';
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF public.admin_mfa_verified() THEN RAISE EXCEPTION 'Blocked admin bypass'; END IF; END $$;
ROLLBACK;
