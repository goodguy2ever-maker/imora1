-- Admin role checks remain mandatory; MFA is not mandatory by owner request.
BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-000000000099');
INSERT INTO public.profiles(id,role,full_name,email) VALUES ('00000000-0000-4000-8000-000000000099','SUPER_ADMIN','Access test','access@example.test');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
SELECT set_config('request.jwt.claims','{"aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF NOT app.is_super_admin() THEN RAISE EXCEPTION 'Active admin denied'; END IF; END $$;
RESET ROLE;
UPDATE public.profiles SET status='blocked' WHERE id='00000000-0000-4000-8000-000000000099';
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF app.is_super_admin() THEN RAISE EXCEPTION 'Blocked admin bypass'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000098',true);
DO $$ BEGIN IF app.is_super_admin() THEN RAISE EXCEPTION 'Unknown identity bypass'; END IF; END $$;
ROLLBACK;
