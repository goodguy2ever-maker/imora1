BEGIN;
-- Cover tenant and author references used in policies and joins.
CREATE INDEX IF NOT EXISTS commercial_proposals_company_id_cover_idx ON public.commercial_proposals(company_id);
CREATE INDEX IF NOT EXISTS daily_reports_created_by_cover_idx ON public.daily_reports(created_by);
CREATE INDEX IF NOT EXISTS daily_reports_project_id_company_id_cover_idx ON public.daily_reports(project_id,company_id);
CREATE INDEX IF NOT EXISTS drawings_company_id_cover_idx ON public.drawings(company_id);
CREATE INDEX IF NOT EXISTS drawings_created_by_cover_idx ON public.drawings(created_by);
CREATE INDEX IF NOT EXISTS drawings_project_id_company_id_cover_idx ON public.drawings(project_id,company_id);
CREATE INDEX IF NOT EXISTS estimate_lines_version_id_company_id_cover_idx ON public.estimate_lines(version_id,company_id);
CREATE INDEX IF NOT EXISTS estimate_versions_approved_by_cover_idx ON public.estimate_versions(approved_by);
CREATE INDEX IF NOT EXISTS estimate_versions_created_by_cover_idx ON public.estimate_versions(created_by);
CREATE INDEX IF NOT EXISTS estimate_versions_project_id_company_id_cover_idx ON public.estimate_versions(project_id,company_id);
CREATE INDEX IF NOT EXISTS expenses_created_by_cover_idx ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS expenses_project_id_company_id_cover_idx ON public.expenses(project_id,company_id);
CREATE INDEX IF NOT EXISTS lead_activities_company_id_cover_idx ON public.lead_activities(company_id);
CREATE INDEX IF NOT EXISTS material_requests_approved_by_cover_idx ON public.material_requests(approved_by);
CREATE INDEX IF NOT EXISTS material_requests_created_by_cover_idx ON public.material_requests(created_by);
CREATE INDEX IF NOT EXISTS material_requests_project_id_company_id_cover_idx ON public.material_requests(project_id,company_id);
CREATE INDEX IF NOT EXISTS payment_schedules_company_id_cover_idx ON public.payment_schedules(company_id);
CREATE INDEX IF NOT EXISTS projects_created_by_cover_idx ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_cover_idx ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_created_by_cover_idx ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS tasks_project_id_company_id_cover_idx ON public.tasks(project_id,company_id);
DROP POLICY profiles_select_visible ON public.profiles;
CREATE POLICY profiles_select_visible ON public.profiles FOR SELECT TO authenticated
 USING (id=(select auth.uid()) OR (select app.is_super_admin()) OR company_id=(select app.my_company_any()));
COMMIT;
