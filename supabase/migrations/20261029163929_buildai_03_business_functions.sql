/*
# BuildAI 03: server-side business functions and dashboard totals

Plain-English summary
This migration adds the functions that perform privileged business actions on the server. The browser calls them, and each one checks who is calling before changing anything. Every critical action is written to the audit journal.

1. New functions
- `platform_update_company`: super admins edit company name, city and contact details.
- `platform_set_access`: super admins set status (trial, active, suspended, expired), the access end date and the user limit. Activating a company with a past end date is rejected.
- `platform_companies_overview`: list of all companies with active user count and project count (super admins only).
- `create_company_with_admin`: creates a company and its first company admin profile in one transaction. Called only by the server-side user function after the login account is created.
- `create_estimate_version`: creates a new draft estimate version for a project, optionally copying lines from an existing version.
- `approve_estimate_version`: approves a draft version (must contain at least one line). The previously approved version is archived but kept with all its lines.
- `set_material_request_status`: enforces the material request workflow and who may perform each transition.
- `company_dashboard`: calculates dashboard figures from real data, grouped by currency. Percent of budget used is null when the approved budget is zero.

2. Modified objects
- `estimate_versions` approval rule: an approved version must have an approval time. Archived versions keep their approval time for history. No data is removed.

3. Security
- Each function checks the caller's role and company on the server. Browser-provided company, role or status values are never trusted.
- Functions that change data are marked as definer functions with a fixed search path.
- Execute permission is granted only to signed-in users (and to the server role for the company-creation function). Anonymous visitors cannot call any of them.
- `write_audit` is internal only and is not callable by clients.

4. Important notes
- Expenses never modify the approved budget; the dashboard only compares them.
- Totals in different currencies are never summed together.
*/

ALTER TABLE public.estimate_versions DROP CONSTRAINT IF EXISTS estimate_versions_approval_chk;
ALTER TABLE public.estimate_versions ADD CONSTRAINT estimate_versions_approval_chk
  CHECK (status <> 'approved' OR approved_at IS NOT NULL);

CREATE OR REPLACE FUNCTION app.write_audit(
  p_actor uuid, p_company uuid, p_action text, p_target_type text, p_target_id text, p_details jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.audit_logs (actor_id, company_id, action, target_type, target_id, details)
  VALUES (p_actor, p_company, p_action, p_target_type, p_target_id, COALESCE(p_details, '{}'::jsonb))
$$;
REVOKE EXECUTE ON FUNCTION app.write_audit(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.platform_update_company(
  p_company_id uuid, p_name text, p_city text, p_contact_email text, p_contact_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT app.is_super_admin() THEN
    RAISE EXCEPTION 'Недостаточно прав' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(coalesce(p_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Укажите название компании';
  END IF;
  UPDATE public.companies
  SET name = btrim(p_name),
      city = NULLIF(btrim(coalesce(p_city, '')), ''),
      contact_email = NULLIF(btrim(coalesce(p_contact_email, '')), ''),
      contact_phone = NULLIF(btrim(coalesce(p_contact_phone, '')), '')
  WHERE id = p_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Компания не найдена';
  END IF;
  PERFORM app.write_audit(auth.uid(), p_company_id, 'company.updated', 'company', p_company_id::text,
    jsonb_build_object('name', btrim(p_name)));
END
$$;

CREATE OR REPLACE FUNCTION public.platform_set_access(
  p_company_id uuid, p_status text, p_access_until timestamptz, p_user_limit integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_row public.companies%ROWTYPE;
BEGIN
  IF NOT app.is_super_admin() THEN
    RAISE EXCEPTION 'Недостаточно прав' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('trial', 'active', 'suspended', 'expired') THEN
    RAISE EXCEPTION 'Неизвестный статус компании';
  END IF;
  IF p_user_limit IS NULL OR p_user_limit < 1 OR p_user_limit > 500 THEN
    RAISE EXCEPTION 'Лимит пользователей должен быть от 1 до 500';
  END IF;
  IF p_access_until IS NULL THEN
    RAISE EXCEPTION 'Укажите дату окончания доступа';
  END IF;
  IF p_status IN ('trial', 'active') AND p_access_until <= now() THEN
    RAISE EXCEPTION 'Дата окончания доступа уже прошла. Укажите более позднюю дату или выберите статус "Истёк"';
  END IF;
  SELECT * INTO old_row FROM public.companies WHERE id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Компания не найдена';
  END IF;
  UPDATE public.companies
  SET status = p_status, access_until = p_access_until, user_limit = p_user_limit, updated_at = now()
  WHERE id = p_company_id;
  PERFORM app.write_audit(auth.uid(), p_company_id, 'company.access_changed', 'company', p_company_id::text,
    jsonb_build_object(
      'old_status', old_row.status, 'new_status', p_status,
      'old_access_until', old_row.access_until, 'new_access_until', p_access_until,
      'old_user_limit', old_row.user_limit, 'new_user_limit', p_user_limit));
END
$$;

CREATE OR REPLACE FUNCTION public.platform_companies_overview()
RETURNS TABLE (
  id uuid, name text, city text, contact_email text, contact_phone text,
  status text, effective_status text, access_until timestamptz, user_limit integer,
  active_users bigint, projects_count bigint, created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT app.is_super_admin() THEN
    RAISE EXCEPTION 'Недостаточно прав' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT c.id, c.name, c.city, c.contact_email, c.contact_phone, c.status,
    CASE WHEN c.status IN ('trial', 'active') AND c.access_until <= now() THEN 'expired'::text ELSE c.status END,
    c.access_until, c.user_limit,
    (SELECT count(*) FROM public.profiles pr WHERE pr.company_id = c.id AND pr.status = 'active'),
    (SELECT count(*) FROM public.projects pj WHERE pj.company_id = c.id),
    c.created_at
  FROM public.companies c
  ORDER BY c.created_at DESC;
END
$$;

CREATE OR REPLACE FUNCTION public.create_company_with_admin(
  p_actor uuid, p_name text, p_city text, p_contact_email text, p_contact_phone text,
  p_status text, p_access_until timestamptz, p_user_limit integer,
  p_admin_id uuid, p_admin_email text, p_admin_name text, p_admin_position text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_company uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor AND role = 'SUPER_ADMIN' AND status = 'active') THEN
    RAISE EXCEPTION 'Недостаточно прав' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('trial', 'active', 'suspended', 'expired') THEN
    RAISE EXCEPTION 'Неизвестный статус компании';
  END IF;
  INSERT INTO public.companies (name, city, contact_email, contact_phone, status, access_until, user_limit)
  VALUES (btrim(p_name), NULLIF(btrim(coalesce(p_city, '')), ''), NULLIF(btrim(coalesce(p_contact_email, '')), ''),
    NULLIF(btrim(coalesce(p_contact_phone, '')), ''), p_status, p_access_until, p_user_limit)
  RETURNING id INTO new_company;

  INSERT INTO public.profiles (id, company_id, role, full_name, position, email, status)
  VALUES (p_admin_id, new_company, 'COMPANY_ADMIN', btrim(p_admin_name), NULLIF(btrim(coalesce(p_admin_position, '')), ''),
    lower(btrim(p_admin_email)), 'active');

  PERFORM app.write_audit(p_actor, new_company, 'company.created', 'company', new_company::text,
    jsonb_build_object('name', btrim(p_name), 'admin_email', lower(btrim(p_admin_email))));
  RETURN new_company;
END
$$;

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
  IF cid IS NULL OR NOT app.is_company_admin() THEN
    RAISE EXCEPTION 'Недостаточно прав' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.projects WHERE id = p_project_id AND company_id = cid;
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
  IF cid IS NULL THEN
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
    allowed := is_admin;
  ELSIF r.status = 'ordered' AND p_status = 'delivered' THEN
    allowed := is_admin;
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
SECURITY DEFINER
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
  IF cid IS NULL THEN
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
    WHERE e.company_id = cid
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

REVOKE EXECUTE ON FUNCTION public.platform_update_company(uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.platform_set_access(uuid, text, timestamptz, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.platform_companies_overview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_company_with_admin(uuid, text, text, text, text, text, timestamptz, integer, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_estimate_version(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_estimate_version(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_material_request_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.company_dashboard() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.platform_update_company(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_set_access(uuid, text, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_companies_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_with_admin(uuid, text, text, text, text, text, timestamptz, integer, uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_estimate_version(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_estimate_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_material_request_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_dashboard() TO authenticated;
