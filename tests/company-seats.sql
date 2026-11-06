BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-000000000081'),('00000000-0000-4000-8000-000000000082'),('00000000-0000-4000-8000-000000000083');
INSERT INTO public.companies(id,name,user_limit,status,access_until) VALUES ('00000000-0000-4000-8000-000000000080','Seat test',2,'active',now()+interval '1 year');
INSERT INTO public.profiles(id,company_id,role,status,full_name,email) VALUES
('00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000080','COMPANY_ADMIN','active','Admin','seat-admin@example.test'),
('00000000-0000-4000-8000-000000000082','00000000-0000-4000-8000-000000000080','MEMBER','active','Member','seat-member@example.test');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.profiles(id,company_id,role,status,full_name,email) VALUES ('00000000-0000-4000-8000-000000000083','00000000-0000-4000-8000-000000000080','MEMBER','active','Extra','extra@example.test');
    RAISE EXCEPTION 'FAIL: over-capacity seat';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.companies SET user_limit=1 WHERE id='00000000-0000-4000-8000-000000000080';
    RAISE EXCEPTION 'FAIL: reduced limit below usage';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET status='blocked' WHERE id='00000000-0000-4000-8000-000000000081';
    RAISE EXCEPTION 'FAIL: last administrator removed';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE public.profiles SET status='blocked' WHERE id='00000000-0000-4000-8000-000000000082';
INSERT INTO public.profiles(id,company_id,role,status,full_name,email) VALUES ('00000000-0000-4000-8000-000000000083','00000000-0000-4000-8000-000000000080','COMPANY_ADMIN','active','Replacement','replacement@example.test');
UPDATE public.profiles SET status='blocked' WHERE id='00000000-0000-4000-8000-000000000081';
UPDATE public.companies SET user_limit=1 WHERE id='00000000-0000-4000-8000-000000000080';
DO $$ BEGIN
  BEGIN
    UPDATE public.profiles SET status='active' WHERE id='00000000-0000-4000-8000-000000000082';
    RAISE EXCEPTION 'FAIL: over-capacity reactivation';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
