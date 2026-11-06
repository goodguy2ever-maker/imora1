-- Disposable database only, after migrations. All fixtures are rolled back.
BEGIN;
CREATE TEMP TABLE test_ids(name text PRIMARY KEY,id uuid NOT NULL DEFAULT gen_random_uuid());
INSERT INTO test_ids(name) VALUES('company'),('other_company'),('admin'),('engineer'),('foreman'),('other_foreman'),('supply'),('seller'),('other_seller'),('sales_lead'),('member'),('other_admin'),('project'),('foreign_project'),('task'),('other_task'),('unit'),('lead'),('other_lead'),('foreign_lead'),('material');
GRANT SELECT ON test_ids TO authenticated;
INSERT INTO auth.users(id) SELECT id FROM test_ids WHERE name IN ('admin','engineer','foreman','other_foreman','supply','seller','other_seller','sales_lead','member','other_admin');
INSERT INTO public.companies(id,name,status,access_until,user_limit) SELECT id,name,'active',now()+interval '1 year',20 FROM test_ids WHERE name IN ('company','other_company');
INSERT INTO public.profiles(id,company_id,role,full_name,email)
 SELECT id, (SELECT id FROM test_ids WHERE name=CASE WHEN t.name='other_admin' THEN 'other_company' ELSE 'company' END),
 CASE t.name WHEN 'admin' THEN 'COMPANY_ADMIN' WHEN 'engineer' THEN 'ENGINEER' WHEN 'foreman' THEN 'FOREMAN' WHEN 'other_foreman' THEN 'FOREMAN' WHEN 'supply' THEN 'SUPPLY_MANAGER' WHEN 'seller' THEN 'SALES_MANAGER' WHEN 'other_seller' THEN 'SALES_MANAGER' WHEN 'sales_lead' THEN 'SALES_LEAD' WHEN 'member' THEN 'MEMBER' ELSE 'COMPANY_ADMIN' END,
 'Test '||name,name||'@example.test'
 FROM test_ids t WHERE name IN ('admin','engineer','foreman','other_foreman','supply','seller','other_seller','sales_lead','member','other_admin');
INSERT INTO public.projects(id,company_id,name,created_by,currency) VALUES
 ((SELECT id FROM test_ids WHERE name='project'),(SELECT id FROM test_ids WHERE name='company'),'Workspace project',(SELECT id FROM test_ids WHERE name='admin'),'RUB'),
 ((SELECT id FROM test_ids WHERE name='foreign_project'),(SELECT id FROM test_ids WHERE name='other_company'),'Foreign project',(SELECT id FROM test_ids WHERE name='other_admin'),'RUB');
INSERT INTO public.tasks(id,company_id,project_id,title,assignee_id,created_by)
 SELECT t.id,(SELECT id FROM test_ids WHERE name='company'),(SELECT id FROM test_ids WHERE name='project'),'Task '||t.name,
 (SELECT id FROM test_ids WHERE name=CASE WHEN t.name='task' THEN 'foreman' ELSE 'other_foreman' END),(SELECT id FROM test_ids WHERE name='admin')
 FROM test_ids t WHERE name IN ('task','other_task');
INSERT INTO public.leads(id,company_id,client_name,phone,currency,manager_id)
 SELECT t.id,(SELECT id FROM test_ids WHERE name=CASE WHEN t.name='foreign_lead' THEN 'other_company' ELSE 'company' END),'Client '||t.name,'1234567','RUB',
 (SELECT id FROM test_ids WHERE name=CASE WHEN t.name='foreign_lead' THEN 'other_admin' WHEN t.name='lead' THEN 'seller' ELSE 'other_seller' END)
 FROM test_ids t WHERE name IN ('lead','other_lead','foreign_lead');
INSERT INTO public.real_estate_units(id,company_id,project_id,section,floor,unit_number,total_area_m2,price_per_m2,total_price,currency)
 VALUES((SELECT id FROM test_ids WHERE name='unit'),(SELECT id FROM test_ids WHERE name='company'),(SELECT id FROM test_ids WHERE name='project'),'A',1,'101',50,100,1,'RUB');
INSERT INTO public.material_requests(id,company_id,project_id,title,quantity,unit,status,created_by)
 VALUES((SELECT id FROM test_ids WHERE name='material'),(SELECT id FROM test_ids WHERE name='company'),(SELECT id FROM test_ids WHERE name='project'),'Concrete',10,'m3','approved',(SELECT id FROM test_ids WHERE name='admin'));

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM test_ids WHERE name='foreman'),true);
DO $$ DECLARE n integer; d jsonb; BEGIN
 SELECT count(*) INTO n FROM public.tasks; IF n<>1 THEN RAISE EXCEPTION 'Foreman saw another task'; END IF;
 UPDATE public.tasks SET status='done' WHERE id=(SELECT id FROM test_ids WHERE name='task');
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Own task status failed'; END IF;
 BEGIN UPDATE public.tasks SET assignee_id=(SELECT id FROM test_ids WHERE name='other_foreman') WHERE id=(SELECT id FROM test_ids WHERE name='task'); RAISE EXCEPTION 'FAIL reassignment allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.estimate_lines) OR EXISTS(SELECT 1 FROM public.drawings) OR EXISTS(SELECT 1 FROM public.leads) THEN RAISE EXCEPTION 'Foreman saw protected data'; END IF;
 d:=public.company_dashboard(); IF jsonb_array_length(d->'by_currency')<>0 THEN RAISE EXCEPTION 'Dashboard leaked finance'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM test_ids WHERE name='seller'),true);
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM public.leads; IF n<>1 THEN RAISE EXCEPTION 'Sales manager saw another managers leads'; END IF;
 INSERT INTO public.leads(client_name,phone,manager_id,currency) VALUES('New client','1234567',(SELECT id FROM test_ids WHERE name='seller'),'RUB');
 UPDATE public.leads SET stage='qualification' WHERE id=(SELECT id FROM test_ids WHERE name='lead');
 IF NOT EXISTS(SELECT 1 FROM public.lead_activities WHERE lead_id=(SELECT id FROM test_ids WHERE name='lead') AND activity_type='stage_change') THEN RAISE EXCEPTION 'No server stage history'; END IF;
 BEGIN
 INSERT INTO public.payment_schedules(lead_id,payment_number,due_date,amount,currency) VALUES((SELECT id FROM test_ids WHERE name='lead'),1,current_date,10,'RUB');
 RAISE EXCEPTION 'FAIL manager recorded payment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.set_material_request_status((SELECT id FROM test_ids WHERE name='material'),'ordered'); RAISE EXCEPTION 'FAIL sales changed procurement'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM test_ids WHERE name='engineer'),true);
DO $$ DECLARE v uuid; BEGIN
 v:=public.create_estimate_version((SELECT id FROM test_ids WHERE name='project'));
 INSERT INTO public.estimate_lines(version_id,name,unit,quantity,unit_price) VALUES(v,'Engineering line','m2',10,100);
 INSERT INTO public.drawings(company_id,project_id,name) VALUES((SELECT id FROM test_ids WHERE name='company'),(SELECT id FROM test_ids WHERE name='project'),'Engineering drawing');
 BEGIN PERFORM public.approve_estimate_version(v); RAISE EXCEPTION 'FAIL engineer approved finance'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM test_ids WHERE name='admin'),true);
DO $$ DECLARE v uuid; BEGIN
 SELECT id INTO v FROM public.estimate_versions WHERE project_id=(SELECT id FROM test_ids WHERE name='project') LIMIT 1;
 PERFORM public.approve_estimate_version(v);
 IF (SELECT total_price FROM public.real_estate_units WHERE id=(SELECT id FROM test_ids WHERE name='unit'))<>5000 THEN RAISE EXCEPTION 'Price not computed on server'; END IF;
 BEGIN INSERT INTO public.lead_activities(lead_id,activity_type,text) VALUES((SELECT id FROM test_ids WHERE name='foreign_lead'),'note','Cross tenant'); RAISE EXCEPTION 'FAIL cross tenant activity'; EXCEPTION WHEN insufficient_privilege OR foreign_key_violation THEN NULL; END;
 BEGIN INSERT INTO public.leads(client_name,phone,project_id,currency) VALUES('Wrong tenant','1234567',(SELECT id FROM test_ids WHERE name='foreign_project'),'RUB'); RAISE EXCEPTION 'FAIL cross tenant project'; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM test_ids WHERE name='engineer'),true);
DO $$ DECLARE n integer; BEGIN
 UPDATE public.estimate_lines SET unit_price=1 WHERE version_id IN(SELECT id FROM public.estimate_versions WHERE status='approved');
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Approved estimate was edited'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM test_ids WHERE name='supply'),true);
DO $$ BEGIN
 UPDATE public.material_requests SET supplier='Supplier',estimated_unit_price=20 WHERE id=(SELECT id FROM test_ids WHERE name='material');
 BEGIN UPDATE public.material_requests SET quantity=999 WHERE id=(SELECT id FROM test_ids WHERE name='material'); RAISE EXCEPTION 'FAIL approved volume changed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.set_material_request_status((SELECT id FROM test_ids WHERE name='material'),'ordered');
SELECT public.set_material_request_status((SELECT id FROM test_ids WHERE name='material'),'delivered');
RESET ROLE;
DO $$ BEGIN
 -- Bypass RLS as owner to prove the FK itself prevents cross-company linkage.
 BEGIN INSERT INTO public.lead_activities(company_id,lead_id,activity_type,text) VALUES((SELECT id FROM test_ids WHERE name='company'),(SELECT id FROM test_ids WHERE name='foreign_lead'),'note','Bad FK'); RAISE EXCEPTION 'FAIL cross tenant FK'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM test_ids WHERE name='sales_lead'),true);
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM public.leads; IF n<>3 THEN RAISE EXCEPTION 'Sales lead cannot read team deals'; END IF;
 INSERT INTO public.payment_schedules(lead_id,payment_number,due_date,amount,currency,status,paid_amount,paid_at)
 VALUES((SELECT id FROM test_ids WHERE name='lead'),1,current_date,100,'RUB','paid',100,now());
 BEGIN INSERT INTO public.payment_schedules(lead_id,payment_number,due_date,amount,currency)
 VALUES((SELECT id FROM test_ids WHERE name='lead'),2,current_date,100,'KZT'); RAISE EXCEPTION 'FAIL mixed currency';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
UPDATE public.profiles SET status='blocked' WHERE id=(SELECT id FROM test_ids WHERE name='seller');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM test_ids WHERE name='seller'),true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.leads) OR EXISTS(SELECT 1 FROM public.real_estate_units) THEN RAISE EXCEPTION 'Blocked user retained data access'; END IF; END $$;
RESET ROLE;
UPDATE public.companies SET access_until=now()-interval '1 day' WHERE id=(SELECT id FROM test_ids WHERE name='company');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM test_ids WHERE name='admin'),true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.projects) OR EXISTS(SELECT 1 FROM public.leads) THEN RAISE EXCEPTION 'Expired company retained data access'; END IF;
 BEGIN PERFORM public.create_estimate_version((SELECT id FROM test_ids WHERE name='project')); RAISE EXCEPTION 'FAIL expired company wrote an estimate'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
