-- Run on a disposable/test database after all migrations, as the migration owner.
-- Fixtures and changes are rolled back. This does not exercise hosted Auth settings.
BEGIN;
DO $$
DECLARE
  actor uuid := gen_random_uuid();
  admin_user uuid := gen_random_uuid();
  another_user uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  legacy_id uuid := gen_random_uuid();
  company uuid;
  before_count bigint;
BEGIN
  INSERT INTO auth.users(id) VALUES (actor), (admin_user), (another_user);
  INSERT INTO public.profiles(id, role, full_name, email) VALUES (actor, 'SUPER_ADMIN', 'Test root', 'root@example.test');
  INSERT INTO public.demo_requests(id, full_name, company_name, position, contact, status)
    VALUES (request_id, 'Director', 'Test company', 'Director', 'admin@example.test', 'negotiation'),
           (legacy_id, 'Director', 'Legacy company', 'Director', 'admin@example.test', 'closed');
  company := public.create_company_from_demo_request(request_id, actor, 'Test company', NULL, NULL, NULL,
    'trial', now() + interval '14 days', 10, admin_user, 'admin@example.test', 'Director', NULL);
  IF NOT EXISTS (SELECT 1 FROM public.demo_requests WHERE id=request_id AND company_id=company AND status='approved') THEN
    RAISE EXCEPTION 'FAIL: activation did not link and approve request';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=admin_user AND company_id=company AND role='COMPANY_ADMIN') THEN
    RAISE EXCEPTION 'FAIL: first administrator was not created';
  END IF;
  SELECT count(*) INTO before_count FROM public.companies;
  BEGIN
    PERFORM public.create_company_from_demo_request(request_id, actor, 'Duplicate', NULL, NULL, NULL,
      'trial', now() + interval '14 days', 10, another_user, 'other@example.test', 'Other admin', NULL);
    RAISE EXCEPTION 'FAIL: duplicate activation was allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.companies) <> before_count THEN RAISE EXCEPTION 'FAIL: duplicate company persisted'; END IF;
  BEGIN
    PERFORM public.create_company_from_demo_request(legacy_id, actor, 'Closed', NULL, NULL, NULL,
      'trial', now() + interval '14 days', 10, another_user, 'other@example.test', 'Other admin', NULL);
    RAISE EXCEPTION 'FAIL: closed request activated';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.create_company_from_demo_request(legacy_id, admin_user, 'Unauthorized', NULL, NULL, NULL,
      'trial', now() + interval '14 days', 10, another_user, 'other@example.test', 'Other admin', NULL);
    RAISE EXCEPTION 'FAIL: company admin activated another company';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (SELECT status FROM public.demo_requests WHERE id=legacy_id) <> 'closed' THEN RAISE EXCEPTION 'FAIL: legacy status lost'; END IF;
  IF has_column_privilege('anon', 'public.demo_requests', 'company_id', 'INSERT')
     OR has_column_privilege('anon', 'public.demo_requests', 'status', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: public form can assign access';
  END IF;
  IF has_function_privilege('authenticated', 'public.create_company_from_demo_request(uuid,uuid,text,text,text,text,text,timestamp with time zone,integer,uuid,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: client can call privileged activation RPC';
  END IF;
END;
$$;

-- Force a request-update failure AFTER company/profile insertion: both must roll back.
CREATE FUNCTION public.test_fail_request_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Injected request update failure'; END $$;
CREATE TRIGGER test_fail_request_update BEFORE UPDATE ON public.demo_requests
  FOR EACH ROW EXECUTE FUNCTION public.test_fail_request_update();
DO $$
DECLARE
  actor uuid := gen_random_uuid();
  admin_user uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  before_count bigint;
BEGIN
  INSERT INTO auth.users(id) VALUES(actor), (admin_user);
  INSERT INTO public.profiles(id, role, full_name, email) VALUES(actor, 'SUPER_ADMIN', 'Rollback root', 'rollback@example.test');
  INSERT INTO public.demo_requests(id, full_name, company_name, position, contact)
    VALUES(request_id, 'Director', 'Rollback company', 'Director', 'admin@example.test');
  SELECT count(*) INTO before_count FROM public.companies;
  BEGIN
    PERFORM public.create_company_from_demo_request(request_id, actor, 'Rollback company', NULL, NULL, NULL,
      'trial', now() + interval '14 days', 10, admin_user, 'admin@example.test', 'Director', NULL);
    RAISE EXCEPTION 'FAIL: injected failure did not occur';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Injected request update failure' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.companies) <> before_count OR EXISTS(SELECT 1 FROM public.profiles WHERE id=admin_user) THEN
    RAISE EXCEPTION 'FAIL: partial activation persisted';
  END IF;
  IF (SELECT status FROM public.demo_requests WHERE id=request_id) <> 'new' THEN RAISE EXCEPTION 'FAIL: request changed after rollback'; END IF;
END;
$$;
ROLLBACK;
