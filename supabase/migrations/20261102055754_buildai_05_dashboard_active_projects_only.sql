/*
# BuildAI 05: dashboard spending counts only active projects

Plain-English summary
The dashboard compares approved budgets with recorded spending. Archived projects were already excluded from budgets, but their expenses were still counted as spending, which inflated the percentage of budget used. Now archived projects are excluded from both sides.

1. Modified object
- `company_dashboard`: spending totals only include expenses from projects that are not archived. Nothing else changes, and no data is removed.

2. Security
- Same access rules as before: only signed-in users of a company see their own company's figures.

3. Important notes
- Individual expense records are untouched. They still appear in the recent expenses list.
*/

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
