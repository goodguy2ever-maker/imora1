/*
# BuildAI 02: projects, estimates, tasks, material requests, expenses, daily reports

Plain-English summary
This migration adds the working data of a construction company. Every row belongs to exactly one company, and database rules make sure that a row can only point to projects of the same company.

1. New Tables
- `projects`: name, description, address, client, currency, status (planning, active, on_hold, completed, archived), start and end dates. Projects are archived by status and never deleted.
- `estimate_versions`: numbered versions of a project estimate. Status is draft, approved or archived. At most one version per project can be approved at a time.
- `estimate_lines`: rows of an estimate with name, unit, quantity and unit price. `line_total` is calculated by the database as quantity x unit price.
- `tasks`: title, description, project, assignee, due date, priority (low, normal, high, urgent) and status (todo, in_progress, blocked, done, cancelled).
- `material_requests`: material name, quantity, unit, estimated unit price, currency, supplier, needed-by date, status (draft, submitted, approved, rejected, ordered, delivered, cancelled), approver and approval time.
- `expenses`: actual spending with date, category, description, amount and currency. Expenses never change the approved budget.
- `daily_reports`: daily site report with work done, issues and risks, next steps and author.

2. Modified Tables
- None.

3. Security changes
- RLS enabled on every new table. Every policy is limited to the user's own company (via the access helper, so suspended or expired companies are locked out while data is kept).
- Members can create tasks, material requests, expenses and daily reports. They can edit their own draft requests, expenses and reports. Company admins manage projects and estimates and can edit any expense, report or pending request.
- Approved estimate versions and their lines cannot be changed by anyone: the database rejects any change to lines of a version that is not a draft.
- Column-level grants prevent changing the company, the author or the workflow status directly. Status changes for material requests happen only through a server function that checks transitions and roles.
- Composite foreign keys guarantee that a project, version or assignee referenced by a row belongs to the same company.
- No client role can delete projects, tasks, material requests or estimate versions.

4. Important notes
- Money columns use numeric types with non-negative checks.
- Multi-currency totals are never added together in the database; the dashboard groups them by currency.
*/

CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL DEFAULT app.my_company_id() REFERENCES public.companies(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  address text CHECK (address IS NULL OR char_length(address) <= 240),
  client_name text CHECK (client_name IS NULL OR char_length(client_name) <= 160),
  currency text NOT NULL DEFAULT 'RUB' CHECK (currency IN ('RUB', 'USD', 'EUR', 'KZT')),
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
  start_date date,
  end_date date,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_dates_chk CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT projects_id_company_key UNIQUE (id, company_id)
);
CREATE INDEX IF NOT EXISTS projects_company_status_idx ON public.projects (company_id, status);

CREATE TABLE IF NOT EXISTS public.estimate_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  version_number integer NOT NULL CHECK (version_number > 0),
  title text NOT NULL DEFAULT 'Версия сметы' CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  CONSTRAINT estimate_versions_project_fk FOREIGN KEY (project_id, company_id)
    REFERENCES public.projects (id, company_id) ON DELETE RESTRICT,
  CONSTRAINT estimate_versions_number_key UNIQUE (project_id, version_number),
  CONSTRAINT estimate_versions_id_company_key UNIQUE (id, company_id),
  CONSTRAINT estimate_versions_approval_chk CHECK ((status = 'approved') = (approved_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS estimate_versions_one_approved_idx
  ON public.estimate_versions (project_id) WHERE status = 'approved';

CREATE TABLE IF NOT EXISTS public.estimate_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  version_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 200),
  unit text NOT NULL CHECK (char_length(btrim(unit)) BETWEEN 1 AND 20),
  quantity numeric(14, 3) NOT NULL CHECK (quantity >= 0),
  unit_price numeric(14, 2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(18, 2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estimate_lines_version_fk FOREIGN KEY (version_id, company_id)
    REFERENCES public.estimate_versions (id, company_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS estimate_lines_version_idx ON public.estimate_lines (version_id, position);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL DEFAULT app.my_company_id() REFERENCES public.companies(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_project_fk FOREIGN KEY (project_id, company_id)
    REFERENCES public.projects (id, company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS tasks_company_status_idx ON public.tasks (company_id, status);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON public.tasks (project_id);

CREATE TABLE IF NOT EXISTS public.material_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL DEFAULT app.my_company_id() REFERENCES public.companies(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  quantity numeric(14, 3) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL CHECK (char_length(btrim(unit)) BETWEEN 1 AND 20),
  estimated_unit_price numeric(14, 2) CHECK (estimated_unit_price IS NULL OR estimated_unit_price >= 0),
  currency text NOT NULL DEFAULT 'RUB' CHECK (currency IN ('RUB', 'USD', 'EUR', 'KZT')),
  supplier text CHECK (supplier IS NULL OR char_length(supplier) <= 160),
  needed_by date,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'ordered', 'delivered', 'cancelled')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_requests_project_fk FOREIGN KEY (project_id, company_id)
    REFERENCES public.projects (id, company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS material_requests_company_status_idx ON public.material_requests (company_id, status);
CREATE INDEX IF NOT EXISTS material_requests_project_idx ON public.material_requests (project_id);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL DEFAULT app.my_company_id() REFERENCES public.companies(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL,
  expense_date date NOT NULL DEFAULT current_date,
  category text NOT NULL CHECK (category IN ('materials', 'labor', 'equipment', 'subcontractors', 'transport', 'overhead', 'other')),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 2 AND 500),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'RUB' CHECK (currency IN ('RUB', 'USD', 'EUR', 'KZT')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expenses_project_fk FOREIGN KEY (project_id, company_id)
    REFERENCES public.projects (id, company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS expenses_company_date_idx ON public.expenses (company_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_project_idx ON public.expenses (project_id);

CREATE TABLE IF NOT EXISTS public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL DEFAULT app.my_company_id() REFERENCES public.companies(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT current_date,
  work_done text NOT NULL CHECK (char_length(btrim(work_done)) BETWEEN 2 AND 4000),
  issues text CHECK (issues IS NULL OR char_length(issues) <= 4000),
  next_steps text CHECK (next_steps IS NULL OR char_length(next_steps) <= 4000),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_reports_project_fk FOREIGN KEY (project_id, company_id)
    REFERENCES public.projects (id, company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS daily_reports_company_date_idx ON public.daily_reports (company_id, report_date DESC);
CREATE INDEX IF NOT EXISTS daily_reports_project_idx ON public.daily_reports (project_id, report_date DESC);

DROP TRIGGER IF EXISTS projects_touch ON public.projects;
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
DROP TRIGGER IF EXISTS estimate_lines_touch ON public.estimate_lines;
CREATE TRIGGER estimate_lines_touch BEFORE UPDATE ON public.estimate_lines FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
DROP TRIGGER IF EXISTS tasks_touch ON public.tasks;
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
DROP TRIGGER IF EXISTS material_requests_touch ON public.material_requests;
CREATE TRIGGER material_requests_touch BEFORE UPDATE ON public.material_requests FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
DROP TRIGGER IF EXISTS expenses_touch ON public.expenses;
CREATE TRIGGER expenses_touch BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
DROP TRIGGER IF EXISTS daily_reports_touch ON public.daily_reports;
CREATE TRIGGER daily_reports_touch BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT (company_id, name, description, address, client_name, currency, status, start_date, end_date, created_by),
  UPDATE (name, description, address, client_name, currency, status, start_date, end_date) ON public.projects TO authenticated;
GRANT SELECT, UPDATE (title) ON public.estimate_versions TO authenticated;
GRANT SELECT, INSERT (company_id, version_id, position, name, unit, quantity, unit_price),
  UPDATE (position, name, unit, quantity, unit_price), DELETE ON public.estimate_lines TO authenticated;
GRANT SELECT, INSERT (company_id, project_id, title, description, assignee_id, due_date, priority, status, created_by),
  UPDATE (project_id, title, description, assignee_id, due_date, priority, status) ON public.tasks TO authenticated;
GRANT SELECT, INSERT (company_id, project_id, title, quantity, unit, estimated_unit_price, currency, supplier, needed_by, notes, status, created_by),
  UPDATE (project_id, title, quantity, unit, estimated_unit_price, currency, supplier, needed_by, notes) ON public.material_requests TO authenticated;
GRANT SELECT, INSERT (company_id, project_id, expense_date, category, description, amount, currency, created_by),
  UPDATE (project_id, expense_date, category, description, amount, currency), DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT (company_id, project_id, report_date, work_done, issues, next_steps, created_by),
  UPDATE (project_id, report_date, work_done, issues, next_steps), DELETE ON public.daily_reports TO authenticated;

DROP POLICY IF EXISTS "projects_select_company" ON public.projects;
CREATE POLICY "projects_select_company" ON public.projects FOR SELECT
  TO authenticated USING (company_id = app.my_company_id());
DROP POLICY IF EXISTS "projects_insert_admin" ON public.projects;
CREATE POLICY "projects_insert_admin" ON public.projects FOR INSERT
  TO authenticated WITH CHECK (company_id = app.my_company_id() AND app.is_company_admin() AND created_by = auth.uid());
DROP POLICY IF EXISTS "projects_update_admin" ON public.projects;
CREATE POLICY "projects_update_admin" ON public.projects FOR UPDATE
  TO authenticated USING (company_id = app.my_company_id() AND app.is_company_admin())
  WITH CHECK (company_id = app.my_company_id() AND app.is_company_admin());

DROP POLICY IF EXISTS "estimate_versions_select_company" ON public.estimate_versions;
CREATE POLICY "estimate_versions_select_company" ON public.estimate_versions FOR SELECT
  TO authenticated USING (company_id = app.my_company_id());
DROP POLICY IF EXISTS "estimate_versions_update_draft_admin" ON public.estimate_versions;
CREATE POLICY "estimate_versions_update_draft_admin" ON public.estimate_versions FOR UPDATE
  TO authenticated
  USING (company_id = app.my_company_id() AND app.is_company_admin() AND status = 'draft')
  WITH CHECK (company_id = app.my_company_id() AND app.is_company_admin() AND status = 'draft');

DROP POLICY IF EXISTS "estimate_lines_select_company" ON public.estimate_lines;
CREATE POLICY "estimate_lines_select_company" ON public.estimate_lines FOR SELECT
  TO authenticated USING (company_id = app.my_company_id());
DROP POLICY IF EXISTS "estimate_lines_insert_draft_admin" ON public.estimate_lines;
CREATE POLICY "estimate_lines_insert_draft_admin" ON public.estimate_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = app.my_company_id() AND app.is_company_admin()
    AND EXISTS (SELECT 1 FROM public.estimate_versions v WHERE v.id = version_id AND v.status = 'draft')
  );
DROP POLICY IF EXISTS "estimate_lines_update_draft_admin" ON public.estimate_lines;
CREATE POLICY "estimate_lines_update_draft_admin" ON public.estimate_lines FOR UPDATE
  TO authenticated
  USING (
    company_id = app.my_company_id() AND app.is_company_admin()
    AND EXISTS (SELECT 1 FROM public.estimate_versions v WHERE v.id = version_id AND v.status = 'draft')
  )
  WITH CHECK (
    company_id = app.my_company_id() AND app.is_company_admin()
    AND EXISTS (SELECT 1 FROM public.estimate_versions v WHERE v.id = version_id AND v.status = 'draft')
  );
DROP POLICY IF EXISTS "estimate_lines_delete_draft_admin" ON public.estimate_lines;
CREATE POLICY "estimate_lines_delete_draft_admin" ON public.estimate_lines FOR DELETE
  TO authenticated
  USING (
    company_id = app.my_company_id() AND app.is_company_admin()
    AND EXISTS (SELECT 1 FROM public.estimate_versions v WHERE v.id = version_id AND v.status = 'draft')
  );

DROP POLICY IF EXISTS "tasks_select_company" ON public.tasks;
CREATE POLICY "tasks_select_company" ON public.tasks FOR SELECT
  TO authenticated USING (company_id = app.my_company_id());
DROP POLICY IF EXISTS "tasks_insert_company" ON public.tasks;
CREATE POLICY "tasks_insert_company" ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = app.my_company_id() AND created_by = auth.uid()
    AND (assignee_id IS NULL OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assignee_id AND p.company_id = tasks.company_id))
  );
DROP POLICY IF EXISTS "tasks_update_company" ON public.tasks;
CREATE POLICY "tasks_update_company" ON public.tasks FOR UPDATE
  TO authenticated
  USING (company_id = app.my_company_id())
  WITH CHECK (
    company_id = app.my_company_id()
    AND (assignee_id IS NULL OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assignee_id AND p.company_id = tasks.company_id))
  );

DROP POLICY IF EXISTS "material_requests_select_company" ON public.material_requests;
CREATE POLICY "material_requests_select_company" ON public.material_requests FOR SELECT
  TO authenticated USING (company_id = app.my_company_id());
DROP POLICY IF EXISTS "material_requests_insert_draft" ON public.material_requests;
CREATE POLICY "material_requests_insert_draft" ON public.material_requests FOR INSERT
  TO authenticated
  WITH CHECK (company_id = app.my_company_id() AND created_by = auth.uid() AND status = 'draft');
DROP POLICY IF EXISTS "material_requests_update_editable" ON public.material_requests;
CREATE POLICY "material_requests_update_editable" ON public.material_requests FOR UPDATE
  TO authenticated
  USING (
    company_id = app.my_company_id()
    AND ((created_by = auth.uid() AND status = 'draft')
      OR (app.is_company_admin() AND status IN ('draft', 'submitted')))
  )
  WITH CHECK (
    company_id = app.my_company_id()
    AND ((created_by = auth.uid() AND status = 'draft')
      OR (app.is_company_admin() AND status IN ('draft', 'submitted')))
  );

DROP POLICY IF EXISTS "expenses_select_company" ON public.expenses;
CREATE POLICY "expenses_select_company" ON public.expenses FOR SELECT
  TO authenticated USING (company_id = app.my_company_id());
DROP POLICY IF EXISTS "expenses_insert_own" ON public.expenses;
CREATE POLICY "expenses_insert_own" ON public.expenses FOR INSERT
  TO authenticated WITH CHECK (company_id = app.my_company_id() AND created_by = auth.uid());
DROP POLICY IF EXISTS "expenses_update_own_or_admin" ON public.expenses;
CREATE POLICY "expenses_update_own_or_admin" ON public.expenses FOR UPDATE
  TO authenticated
  USING (company_id = app.my_company_id() AND (created_by = auth.uid() OR app.is_company_admin()))
  WITH CHECK (company_id = app.my_company_id() AND (created_by = auth.uid() OR app.is_company_admin()));
DROP POLICY IF EXISTS "expenses_delete_own_or_admin" ON public.expenses;
CREATE POLICY "expenses_delete_own_or_admin" ON public.expenses FOR DELETE
  TO authenticated
  USING (company_id = app.my_company_id() AND (created_by = auth.uid() OR app.is_company_admin()));

DROP POLICY IF EXISTS "daily_reports_select_company" ON public.daily_reports;
CREATE POLICY "daily_reports_select_company" ON public.daily_reports FOR SELECT
  TO authenticated USING (company_id = app.my_company_id());
DROP POLICY IF EXISTS "daily_reports_insert_own" ON public.daily_reports;
CREATE POLICY "daily_reports_insert_own" ON public.daily_reports FOR INSERT
  TO authenticated WITH CHECK (company_id = app.my_company_id() AND created_by = auth.uid());
DROP POLICY IF EXISTS "daily_reports_update_own_or_admin" ON public.daily_reports;
CREATE POLICY "daily_reports_update_own_or_admin" ON public.daily_reports FOR UPDATE
  TO authenticated
  USING (company_id = app.my_company_id() AND (created_by = auth.uid() OR app.is_company_admin()))
  WITH CHECK (company_id = app.my_company_id() AND (created_by = auth.uid() OR app.is_company_admin()));
DROP POLICY IF EXISTS "daily_reports_delete_own_or_admin" ON public.daily_reports;
CREATE POLICY "daily_reports_delete_own_or_admin" ON public.daily_reports FOR DELETE
  TO authenticated
  USING (company_id = app.my_company_id() AND (created_by = auth.uid() OR app.is_company_admin()));
