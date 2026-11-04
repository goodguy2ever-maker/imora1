BEGIN;
CREATE OR REPLACE FUNCTION app.has_role(roles text[]) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT app.my_company_id() IS NOT NULL AND app.my_role() = ANY(roles)
$$;
REVOKE EXECUTE ON FUNCTION app.has_role(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app.has_role(text[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION app.can_access_sales_crm() FROM PUBLIC, anon;

-- Composite references retain the tenant identifier on every relationship.
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_company_unique UNIQUE(id,company_id);
ALTER TABLE public.real_estate_units ADD CONSTRAINT units_id_company_unique UNIQUE(id,company_id);
ALTER TABLE public.leads ADD CONSTRAINT leads_id_company_unique UNIQUE(id,company_id);
ALTER TABLE public.real_estate_units DROP CONSTRAINT IF EXISTS real_estate_units_project_id_fkey;
ALTER TABLE public.real_estate_units ADD CONSTRAINT real_estate_units_project_id_tenant_fk FOREIGN KEY(project_id,company_id) REFERENCES public.projects(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS real_estate_units_project_id_tenant_idx ON public.real_estate_units(project_id,company_id);
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_project_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_project_id_tenant_fk FOREIGN KEY(project_id,company_id) REFERENCES public.projects(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS leads_project_id_tenant_idx ON public.leads(project_id,company_id);
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_interested_unit_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_interested_unit_id_tenant_fk FOREIGN KEY(interested_unit_id,company_id) REFERENCES public.real_estate_units(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS leads_interested_unit_id_tenant_idx ON public.leads(interested_unit_id,company_id);
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_manager_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_manager_id_tenant_fk FOREIGN KEY(manager_id,company_id) REFERENCES public.profiles(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS leads_manager_id_tenant_idx ON public.leads(manager_id,company_id);
ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_lead_id_fkey;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_lead_id_tenant_fk FOREIGN KEY(lead_id,company_id) REFERENCES public.leads(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS lead_activities_lead_id_tenant_idx ON public.lead_activities(lead_id,company_id);
ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_author_id_fkey;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_author_id_tenant_fk FOREIGN KEY(author_id,company_id) REFERENCES public.profiles(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS lead_activities_author_id_tenant_idx ON public.lead_activities(author_id,company_id);
ALTER TABLE public.payment_schedules DROP CONSTRAINT IF EXISTS payment_schedules_lead_id_fkey;
ALTER TABLE public.payment_schedules ADD CONSTRAINT payment_schedules_lead_id_tenant_fk FOREIGN KEY(lead_id,company_id) REFERENCES public.leads(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS payment_schedules_lead_id_tenant_idx ON public.payment_schedules(lead_id,company_id);
ALTER TABLE public.commercial_proposals DROP CONSTRAINT IF EXISTS commercial_proposals_lead_id_fkey;
ALTER TABLE public.commercial_proposals ADD CONSTRAINT commercial_proposals_lead_id_tenant_fk FOREIGN KEY(lead_id,company_id) REFERENCES public.leads(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS commercial_proposals_lead_id_tenant_idx ON public.commercial_proposals(lead_id,company_id);
ALTER TABLE public.commercial_proposals DROP CONSTRAINT IF EXISTS commercial_proposals_unit_id_fkey;
ALTER TABLE public.commercial_proposals ADD CONSTRAINT commercial_proposals_unit_id_tenant_fk FOREIGN KEY(unit_id,company_id) REFERENCES public.real_estate_units(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS commercial_proposals_unit_id_tenant_idx ON public.commercial_proposals(unit_id,company_id);
ALTER TABLE public.commercial_proposals DROP CONSTRAINT IF EXISTS commercial_proposals_created_by_fkey;
ALTER TABLE public.commercial_proposals ADD CONSTRAINT commercial_proposals_created_by_tenant_fk FOREIGN KEY(created_by,company_id) REFERENCES public.profiles(id,company_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS commercial_proposals_created_by_tenant_idx ON public.commercial_proposals(created_by,company_id);
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename=ANY(ARRAY['projects','estimate_versions','estimate_lines','tasks','material_requests','expenses','daily_reports','drawings','real_estate_units','leads','lead_activities','payment_schedules','commercial_proposals']) LOOP
  EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
END $$;
CREATE POLICY projects_select ON public.projects FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()));
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN'])) AND created_by=(select auth.uid()));
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN']))) WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN'])));
CREATE POLICY estimate_versions_select ON public.estimate_versions FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])));
CREATE POLICY estimate_versions_update ON public.estimate_versions FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) AND status='draft') WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) AND status='draft');
CREATE POLICY estimate_lines_select ON public.estimate_lines FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])));
CREATE POLICY estimate_lines_insert ON public.estimate_lines FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) AND EXISTS(SELECT 1 FROM public.estimate_versions v WHERE v.id=version_id AND v.company_id=estimate_lines.company_id AND v.status='draft'));
CREATE POLICY estimate_lines_update ON public.estimate_lines FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) AND EXISTS(SELECT 1 FROM public.estimate_versions v WHERE v.id=version_id AND v.company_id=estimate_lines.company_id AND v.status='draft')) WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) AND EXISTS(SELECT 1 FROM public.estimate_versions v WHERE v.id=version_id AND v.company_id=estimate_lines.company_id AND v.status='draft'));
CREATE POLICY estimate_lines_delete ON public.estimate_lines FOR DELETE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) AND EXISTS(SELECT 1 FROM public.estimate_versions v WHERE v.id=version_id AND v.company_id=estimate_lines.company_id AND v.status='draft'));
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR assignee_id=(select auth.uid()) OR created_by=(select auth.uid())));
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER'])) AND created_by=(select auth.uid()) AND (assignee_id IS NULL OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=assignee_id AND p.company_id=tasks.company_id AND p.status='active')) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR assignee_id IS NULL OR assignee_id=(select auth.uid())));
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR assignee_id=(select auth.uid()) OR created_by=(select auth.uid()))) WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR assignee_id=(select auth.uid()) OR created_by=(select auth.uid())) AND (assignee_id IS NULL OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=assignee_id AND p.company_id=tasks.company_id AND p.status='active')));
CREATE POLICY material_requests_select ON public.material_requests FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR created_by=(select auth.uid()) OR ((select app.has_role(ARRAY['SUPPLY_MANAGER'])) AND status IN ('approved','ordered','delivered'))));
CREATE POLICY material_requests_insert ON public.material_requests FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER'])) AND created_by=(select auth.uid()) AND status='draft');
CREATE POLICY material_requests_update ON public.material_requests FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER'])) AND ((created_by=(select auth.uid()) AND status='draft') OR ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) AND status IN ('draft','submitted')) OR ((select app.has_role(ARRAY['COMPANY_ADMIN','SUPPLY_MANAGER'])) AND status IN ('approved','ordered')))) WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER'])) AND ((created_by=(select auth.uid()) AND status='draft') OR ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) AND status IN ('draft','submitted')) OR ((select app.has_role(ARRAY['COMPANY_ADMIN','SUPPLY_MANAGER'])) AND status IN ('approved','ordered'))));
CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR ((select app.has_role(ARRAY['SUPPLY_MANAGER'])) AND created_by=(select auth.uid()))));
CREATE POLICY expenses_insert ON public.expenses FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','SUPPLY_MANAGER'])) AND created_by=(select auth.uid()));
CREATE POLICY expenses_update ON public.expenses FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR ((select app.has_role(ARRAY['SUPPLY_MANAGER'])) AND created_by=(select auth.uid())))) WITH CHECK (company_id = (select app.my_company_id()) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR ((select app.has_role(ARRAY['SUPPLY_MANAGER'])) AND created_by=(select auth.uid()))));
CREATE POLICY expenses_delete ON public.expenses FOR DELETE TO authenticated USING (company_id = (select app.my_company_id()) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR ((select app.has_role(ARRAY['SUPPLY_MANAGER'])) AND created_by=(select auth.uid()))));
CREATE POLICY daily_reports_select ON public.daily_reports FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','MEMBER'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR created_by=(select auth.uid())));
CREATE POLICY daily_reports_insert ON public.daily_reports FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','MEMBER'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR created_by=(select auth.uid())) AND created_by=(select auth.uid()));
CREATE POLICY daily_reports_update ON public.daily_reports FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','MEMBER'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR created_by=(select auth.uid()))) WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','MEMBER'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR created_by=(select auth.uid())));
CREATE POLICY daily_reports_delete ON public.daily_reports FOR DELETE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','MEMBER'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) OR created_by=(select auth.uid())));
CREATE POLICY drawings_select ON public.drawings FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])));
CREATE POLICY drawings_insert ON public.drawings FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])) AND created_by=(select auth.uid()));
CREATE POLICY drawings_update ON public.drawings FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER']))) WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER'])));
CREATE POLICY real_estate_units_select ON public.real_estate_units FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])));
CREATE POLICY real_estate_units_insert ON public.real_estate_units FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])));
CREATE POLICY real_estate_units_update ON public.real_estate_units FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD']))) WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])));
CREATE POLICY real_estate_units_delete ON public.real_estate_units FOR DELETE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])));
CREATE POLICY leads_select ON public.leads FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])) OR manager_id=(select auth.uid())));
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])) OR manager_id=(select auth.uid())));
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])) OR manager_id=(select auth.uid()))) WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])) OR manager_id=(select auth.uid())));
CREATE POLICY leads_delete ON public.leads FOR DELETE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND ((select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])) OR manager_id=(select auth.uid())));
CREATE POLICY lead_activities_select ON public.lead_activities FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=lead_activities.lead_id AND l.company_id=lead_activities.company_id));
CREATE POLICY lead_activities_insert ON public.lead_activities FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=lead_activities.lead_id AND l.company_id=lead_activities.company_id) AND author_id=(select auth.uid()) AND activity_type <> 'stage_change');
CREATE POLICY payment_schedules_select ON public.payment_schedules FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=payment_schedules.lead_id AND l.company_id=payment_schedules.company_id));
CREATE POLICY payment_schedules_insert ON public.payment_schedules FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])) AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=payment_schedules.lead_id AND l.company_id=payment_schedules.company_id));
CREATE POLICY payment_schedules_update ON public.payment_schedules FOR UPDATE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])) AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=payment_schedules.lead_id AND l.company_id=payment_schedules.company_id)) WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])) AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=payment_schedules.lead_id AND l.company_id=payment_schedules.company_id));
CREATE POLICY payment_schedules_delete ON public.payment_schedules FOR DELETE TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_LEAD'])) AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=payment_schedules.lead_id AND l.company_id=payment_schedules.company_id));
CREATE POLICY commercial_proposals_select ON public.commercial_proposals FOR SELECT TO authenticated USING (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=commercial_proposals.lead_id AND l.company_id=commercial_proposals.company_id));
CREATE POLICY commercial_proposals_insert ON public.commercial_proposals FOR INSERT TO authenticated WITH CHECK (company_id = (select app.my_company_id()) AND (select app.has_role(ARRAY['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'])) AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=commercial_proposals.lead_id AND l.company_id=commercial_proposals.company_id) AND created_by=(select auth.uid()));
REVOKE ALL ON public.real_estate_units FROM anon,authenticated;
GRANT SELECT ON public.real_estate_units TO authenticated;
ALTER TABLE public.real_estate_units ALTER COLUMN company_id SET DEFAULT app.my_company_id();
REVOKE ALL ON public.leads FROM anon,authenticated;
GRANT SELECT ON public.leads TO authenticated;
ALTER TABLE public.leads ALTER COLUMN company_id SET DEFAULT app.my_company_id();
REVOKE ALL ON public.lead_activities FROM anon,authenticated;
GRANT SELECT ON public.lead_activities TO authenticated;
ALTER TABLE public.lead_activities ALTER COLUMN company_id SET DEFAULT app.my_company_id();
REVOKE ALL ON public.payment_schedules FROM anon,authenticated;
GRANT SELECT ON public.payment_schedules TO authenticated;
ALTER TABLE public.payment_schedules ALTER COLUMN company_id SET DEFAULT app.my_company_id();
REVOKE ALL ON public.commercial_proposals FROM anon,authenticated;
GRANT SELECT ON public.commercial_proposals TO authenticated;
ALTER TABLE public.commercial_proposals ALTER COLUMN company_id SET DEFAULT app.my_company_id();
GRANT INSERT(company_id,project_id,section,floor,unit_number,unit_type,rooms,total_area_m2,price_per_m2,total_price,currency,status,reserved_until,reserved_client_name), UPDATE(section,floor,unit_number,unit_type,rooms,total_area_m2,price_per_m2,total_price,currency,status,reserved_until,reserved_client_name), DELETE ON public.real_estate_units TO authenticated;
GRANT INSERT(company_id,project_id,client_name,phone,email,interested_unit_id,budget,agreed_price,currency,stage,manager_id,source,purchase_method,notes), UPDATE(project_id,client_name,phone,email,interested_unit_id,budget,agreed_price,currency,stage,manager_id,source,purchase_method,notes,lost_reason), DELETE ON public.leads TO authenticated;
GRANT INSERT(company_id,lead_id,activity_type,text,author_id) ON public.lead_activities TO authenticated;
GRANT INSERT(company_id,lead_id,payment_number,due_date,amount,currency,description,status,paid_amount,paid_at), UPDATE(due_date,amount,currency,description,status,paid_amount,paid_at), DELETE ON public.payment_schedules TO authenticated;
GRANT INSERT(company_id,lead_id,unit_id,created_by,unit_number,section,floor,total_area_m2,price_per_m2,total_price,discount_amount,final_price,currency,valid_until,notes) ON public.commercial_proposals TO authenticated;
ALTER TABLE public.lead_activities ALTER COLUMN author_id SET DEFAULT auth.uid();
ALTER TABLE public.commercial_proposals ALTER COLUMN created_by SET DEFAULT auth.uid();
CREATE TRIGGER leads_touch BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER units_touch BEFORE UPDATE ON public.real_estate_units FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Definer audit trigger uses the server actor; client-supplied stage-change events are forbidden.
CREATE FUNCTION app.audit_lead_stage() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NEW.stage IS DISTINCT FROM OLD.stage THEN
  INSERT INTO public.lead_activities(company_id,lead_id,activity_type,text,author_id)
  VALUES(NEW.company_id,NEW.id,'stage_change',OLD.stage || ' → ' || NEW.stage,auth.uid());
 END IF; RETURN NEW; END $$;
REVOKE EXECUTE ON FUNCTION app.audit_lead_stage() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER lead_stage_audit AFTER UPDATE OF stage ON public.leads FOR EACH ROW EXECUTE FUNCTION app.audit_lead_stage();

CREATE FUNCTION app.guard_task_fields() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NOT app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER']) AND
 (to_jsonb(NEW)-'status'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'updated_at') THEN
 RAISE EXCEPTION 'Можно изменить только статус своей задачи' USING ERRCODE='42501'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER task_fields_guard BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION app.guard_task_fields();
CREATE FUNCTION app.lock_draft_estimate() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v public.estimate_versions%ROWTYPE; BEGIN
 SELECT * INTO v FROM public.estimate_versions WHERE id=COALESCE(NEW.version_id,OLD.version_id) FOR UPDATE;
 IF v.id IS NULL OR v.status <> 'draft' THEN RAISE EXCEPTION 'Утверждённую смету изменять нельзя'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;
CREATE TRIGGER estimate_line_draft_lock BEFORE INSERT OR UPDATE OR DELETE ON public.estimate_lines FOR EACH ROW EXECUTE FUNCTION app.lock_draft_estimate();
CREATE OR REPLACE FUNCTION public.create_estimate_version(p_project_id uuid, p_copy_from uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cid uuid := app.my_company_id();
  next_no integer;
  new_id uuid;
BEGIN
  IF cid IS NULL OR NOT app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER']) THEN
    RAISE EXCEPTION 'Недостаточно прав' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.projects WHERE id = p_project_id AND company_id = cid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Проект не найден';
  END IF;
  IF p_copy_from IS NOT NULL THEN
    PERFORM 1 FROM public.estimate_versions WHERE id = p_copy_from AND project_id = p_project_id AND company_id = cid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Версия для копирования не найдена';
    END IF;
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_no
  FROM public.estimate_versions WHERE project_id = p_project_id;

  INSERT INTO public.estimate_versions (company_id, project_id, version_number, title, status)
  VALUES (cid, p_project_id, next_no, 'Версия ' || next_no, 'draft')
  RETURNING id INTO new_id;

  IF p_copy_from IS NOT NULL THEN
    INSERT INTO public.estimate_lines (company_id, version_id, position, name, unit, quantity, unit_price)
    SELECT cid, new_id, l.position, l.name, l.unit, l.quantity, l.unit_price
    FROM public.estimate_lines l
    WHERE l.version_id = p_copy_from
    ORDER BY l.position;
  END IF;
  RETURN new_id;
END
$$;
CREATE OR REPLACE FUNCTION public.approve_estimate_version(p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cid uuid := app.my_company_id();
  v public.estimate_versions%ROWTYPE;
  total numeric;
BEGIN
  IF cid IS NULL OR NOT app.is_company_admin() THEN
    RAISE EXCEPTION 'Недостаточно прав' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.projects WHERE id=(SELECT project_id FROM public.estimate_versions WHERE id=p_version_id AND company_id=cid) FOR UPDATE;
  SELECT * INTO v FROM public.estimate_versions WHERE id = p_version_id AND company_id = cid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Версия сметы не найдена';
  END IF;
  IF v.status <> 'draft' THEN
    RAISE EXCEPTION 'Утвердить можно только черновик сметы';
  END IF;
  SELECT COALESCE(SUM(line_total), 0) INTO total FROM public.estimate_lines WHERE version_id = p_version_id;
  IF total <= 0 THEN
    RAISE EXCEPTION 'В смете нет строк с суммой. Добавьте позиции перед утверждением';
  END IF;

  UPDATE public.estimate_versions SET status = 'archived'
  WHERE project_id = v.project_id AND status = 'approved';

  UPDATE public.estimate_versions
  SET status = 'approved', approved_by = auth.uid(), approved_at = now()
  WHERE id = p_version_id;

  PERFORM app.write_audit(auth.uid(), cid, 'estimate.approved', 'estimate_version', p_version_id::text,
    jsonb_build_object('project_id', v.project_id, 'version_number', v.version_number, 'total', total));
END
$$;
CREATE OR REPLACE FUNCTION public.set_material_request_status(p_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cid uuid := app.my_company_id();
  uid uuid := auth.uid();
  is_admin boolean := app.is_company_admin();
  r public.material_requests%ROWTYPE;
  allowed boolean := false;
BEGIN
  IF cid IS NULL OR NOT app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER']) THEN
    RAISE EXCEPTION 'Недостаточно прав' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.material_requests WHERE id = p_id AND company_id = cid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;

  IF r.status = 'draft' AND p_status = 'submitted' THEN
    allowed := (r.created_by = uid OR is_admin);
  ELSIF r.status = 'submitted' AND p_status IN ('approved', 'rejected') THEN
    allowed := is_admin;
  ELSIF r.status = 'rejected' AND p_status = 'draft' THEN
    allowed := (r.created_by = uid OR is_admin);
  ELSIF r.status = 'approved' AND p_status = 'ordered' THEN
    allowed := is_admin OR app.my_role()='SUPPLY_MANAGER';
  ELSIF r.status = 'ordered' AND p_status = 'delivered' THEN
    allowed := is_admin OR app.my_role()='SUPPLY_MANAGER';
  ELSIF p_status = 'cancelled' AND r.status IN ('draft', 'submitted', 'rejected') THEN
    allowed := (r.created_by = uid OR is_admin);
  ELSIF p_status = 'cancelled' AND r.status = 'approved' THEN
    allowed := is_admin;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Это действие недоступно для текущего статуса или ваших прав';
  END IF;

  UPDATE public.material_requests
  SET status = p_status,
      status_changed_at = now(),
      approved_by = CASE WHEN p_status = 'approved' THEN uid ELSE approved_by END,
      approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END
  WHERE id = p_id;

  IF p_status IN ('approved', 'rejected') THEN
    PERFORM app.write_audit(uid, cid, 'material_request.' || p_status, 'material_request', p_id::text,
      jsonb_build_object('title', r.title));
  END IF;
END
$$;
CREATE OR REPLACE FUNCTION public.company_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  cid uuid := app.my_company_id();
  by_currency jsonb;
  active_projects bigint;
  open_tasks bigint;
  pending_requests bigint;
  recent_expenses jsonb;
  recent_reports jsonb;
BEGIN
  IF cid IS NULL OR NOT app.has_role(ARRAY['COMPANY_ADMIN','ENGINEER','FOREMAN','SUPPLY_MANAGER','MEMBER']) THEN
    RAISE EXCEPTION 'Доступ к рабочему пространству ограничен' USING ERRCODE = '42501';
  END IF;

  WITH budgets AS (
    SELECT pj.currency, COALESCE(SUM(l.line_total), 0) AS approved_budget
    FROM public.projects pj
    JOIN public.estimate_versions v ON v.project_id = pj.id AND v.status = 'approved'
    LEFT JOIN public.estimate_lines l ON l.version_id = v.id
    WHERE pj.company_id = cid AND pj.status <> 'archived'
    GROUP BY pj.currency
  ),
  spent AS (
    SELECT e.currency, SUM(e.amount) AS actual_expenses
    FROM public.expenses e
    JOIN public.projects pj ON pj.id = e.project_id
    WHERE e.company_id = cid AND pj.status <> 'archived'
    GROUP BY e.currency
  ),
  currencies AS (
    SELECT b.currency FROM budgets b
    UNION
    SELECT s.currency FROM spent s
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'currency', c.currency,
    'approved_budget', COALESCE(b.approved_budget, 0),
    'actual_expenses', COALESCE(s.actual_expenses, 0),
    'remaining', COALESCE(b.approved_budget, 0) - COALESCE(s.actual_expenses, 0),
    'used_percent', CASE WHEN COALESCE(b.approved_budget, 0) = 0 THEN NULL
      ELSE round(COALESCE(s.actual_expenses, 0) / b.approved_budget * 100, 1) END
  ) ORDER BY c.currency), '[]'::jsonb)
  INTO by_currency
  FROM currencies c
  LEFT JOIN budgets b ON b.currency = c.currency
  LEFT JOIN spent s ON s.currency = c.currency;

  SELECT count(*) INTO active_projects FROM public.projects WHERE company_id = cid AND status IN ('planning', 'active');
  SELECT count(*) INTO open_tasks FROM public.tasks WHERE company_id = cid AND status IN ('todo', 'in_progress', 'blocked');
  SELECT count(*) INTO pending_requests FROM public.material_requests WHERE company_id = cid AND status = 'submitted';

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO recent_expenses FROM (
    SELECT jsonb_build_object('id', e.id, 'expense_date', e.expense_date, 'description', e.description,
      'amount', e.amount, 'currency', e.currency, 'project_name', pj.name, 'category', e.category) AS x
    FROM public.expenses e
    JOIN public.projects pj ON pj.id = e.project_id
    WHERE e.company_id = cid
    ORDER BY e.expense_date DESC, e.created_at DESC
    LIMIT 5
  ) s;

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO recent_reports FROM (
    SELECT jsonb_build_object('id', r.id, 'report_date', r.report_date, 'work_done', r.work_done,
      'project_name', pj.name, 'author_name', pr.full_name) AS x
    FROM public.daily_reports r
    JOIN public.projects pj ON pj.id = r.project_id
    LEFT JOIN public.profiles pr ON pr.id = r.created_by
    WHERE r.company_id = cid
    ORDER BY r.report_date DESC, r.created_at DESC
    LIMIT 5
  ) s;

  RETURN jsonb_build_object(
    'active_projects', active_projects,
    'open_tasks', open_tasks,
    'pending_requests', pending_requests,
    'by_currency', by_currency,
    'recent_expenses', recent_expenses,
    'recent_reports', recent_reports
  );
END
$$;

-- Reject contradictory currencies and recompute prices on the server.
ALTER TABLE public.payment_schedules ADD CONSTRAINT payment_number_unique UNIQUE(lead_id,payment_number);
ALTER TABLE public.payment_schedules ADD CONSTRAINT payment_amount_check CHECK(paid_amount IS NULL OR paid_amount <= amount);
CREATE FUNCTION app.validate_crm_values() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c text; project uuid; BEGIN
 IF TG_TABLE_NAME='real_estate_units' THEN
  SELECT currency INTO c FROM public.projects WHERE id=NEW.project_id AND company_id=NEW.company_id;
  IF c IS NULL OR c<>NEW.currency THEN RAISE EXCEPTION 'Валюта объекта должна совпадать с проектом'; END IF;
  NEW.total_price := round(NEW.total_area_m2 * NEW.price_per_m2,2);
 ELSIF TG_TABLE_NAME='leads' THEN
  IF NEW.manager_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.manager_id AND company_id=NEW.company_id AND status='active' AND role IN ('COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD')) THEN RAISE EXCEPTION 'Выберите активного менеджера своей компании'; END IF;
  IF NEW.interested_unit_id IS NOT NULL THEN
   SELECT currency,project_id INTO c,project FROM public.real_estate_units WHERE id=NEW.interested_unit_id AND company_id=NEW.company_id;
   IF c IS NULL OR c<>NEW.currency OR (NEW.project_id IS NOT NULL AND project<>NEW.project_id) THEN RAISE EXCEPTION 'Проверьте проект и валюту выбранного объекта'; END IF;
   NEW.project_id := project;
  ELSIF NEW.project_id IS NOT NULL THEN
   SELECT currency INTO c FROM public.projects WHERE id=NEW.project_id AND company_id=NEW.company_id;
   IF c IS NULL OR c<>NEW.currency THEN RAISE EXCEPTION 'Валюта лида должна совпадать с проектом'; END IF;
  END IF;
 ELSE
  SELECT currency INTO c FROM public.leads WHERE id=NEW.lead_id AND company_id=NEW.company_id;
  IF c IS NULL OR c<>NEW.currency THEN RAISE EXCEPTION 'Валюта документа должна совпадать со сделкой'; END IF;
 END IF;
 IF NEW.currency NOT IN ('RUB','USD','EUR','KZT') THEN RAISE EXCEPTION 'Неподдерживаемая валюта'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER units_validate BEFORE INSERT OR UPDATE ON public.real_estate_units FOR EACH ROW EXECUTE FUNCTION app.validate_crm_values();
CREATE TRIGGER leads_validate BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION app.validate_crm_values();
CREATE TRIGGER payments_validate BEFORE INSERT OR UPDATE ON public.payment_schedules FOR EACH ROW EXECUTE FUNCTION app.validate_crm_values();
CREATE TRIGGER proposals_validate BEFORE INSERT OR UPDATE ON public.commercial_proposals FOR EACH ROW EXECUTE FUNCTION app.validate_crm_values();
-- Never relabel existing monetary data by changing its parent currency.
CREATE FUNCTION app.guard_project_currency() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
 IF NEW.currency IS DISTINCT FROM OLD.currency AND (
 EXISTS(SELECT 1 FROM public.estimate_versions WHERE project_id=OLD.id) OR
 EXISTS(SELECT 1 FROM public.drawings WHERE project_id=OLD.id) OR
 EXISTS(SELECT 1 FROM public.expenses WHERE project_id=OLD.id) OR
 EXISTS(SELECT 1 FROM public.real_estate_units WHERE project_id=OLD.id) OR
 EXISTS(SELECT 1 FROM public.leads WHERE project_id=OLD.id)) THEN
 RAISE EXCEPTION 'Нельзя менять валюту проекта с финансовыми данными. Создайте новый проект в нужной валюте'; END IF;
 RETURN NEW; END $$;
REVOKE EXECUTE ON FUNCTION app.guard_project_currency() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER project_currency_guard BEFORE UPDATE OF currency ON public.projects FOR EACH ROW EXECUTE FUNCTION app.guard_project_currency();
CREATE FUNCTION app.guard_approved_material_fields() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF OLD.status IN ('approved','ordered','delivered') AND
 (to_jsonb(NEW)-'supplier'-'estimated_unit_price'-'needed_by'-'notes'-'status'-'status_changed_at'-'updated_at')
 IS DISTINCT FROM (to_jsonb(OLD)-'supplier'-'estimated_unit_price'-'needed_by'-'notes'-'status'-'status_changed_at'-'updated_at') THEN
 RAISE EXCEPTION 'Согласованный объём менять нельзя. Создайте новую заявку' USING ERRCODE='42501'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER material_approved_guard BEFORE UPDATE ON public.material_requests FOR EACH ROW EXECUTE FUNCTION app.guard_approved_material_fields();
ALTER TABLE public.commercial_proposals ADD CONSTRAINT proposal_amounts_valid CHECK(total_area_m2>0 AND price_per_m2>=0 AND total_price>=0 AND final_price>=0 AND COALESCE(discount_amount,0)>=0);
COMMIT;
