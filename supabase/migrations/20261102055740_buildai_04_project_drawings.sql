/*
# BuildAI 04: architectural drawings per project

Plain-English summary
Each project can now hold architectural drawings. A drawing is a floor plan made of walls and text labels, stored as a single data object. Everyone in the company can view drawings; company admins create and edit them.

1. New table
- `drawings`: name, project, the drawing content (walls and labels on a grid), who created it and when it was last changed.

2. Security
- Row level security is enabled.
- Members can read drawings of their own company only.
- Only active company admins can create or change drawings, and only within their company.
- The project link is enforced by a composite foreign key, so a drawing can never point at another company's project.
- Drawings cannot be deleted from the browser, matching the other workspace records.

3. Important notes
- The drawing content is limited to a JSON object so it can be extended later without a schema change.
*/

CREATE TABLE IF NOT EXISTS public.drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  project_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  data jsonb NOT NULL DEFAULT '{"walls": [], "labels": []}'::jsonb CHECK (jsonb_typeof(data) = 'object'),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drawings_project_fk FOREIGN KEY (project_id, company_id)
    REFERENCES public.projects (id, company_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS drawings_project_idx ON public.drawings (project_id);

DROP TRIGGER IF EXISTS drawings_touch ON public.drawings;
CREATE TRIGGER drawings_touch BEFORE UPDATE ON public.drawings FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.drawings TO authenticated;
GRANT INSERT (company_id, project_id, name, data) ON public.drawings TO authenticated;
GRANT UPDATE (name, data) ON public.drawings TO authenticated;

DROP POLICY IF EXISTS "select_company_drawings" ON public.drawings;
CREATE POLICY "select_company_drawings" ON public.drawings FOR SELECT
  TO authenticated USING (company_id = app.my_company_id());

DROP POLICY IF EXISTS "insert_admin_drawings" ON public.drawings;
CREATE POLICY "insert_admin_drawings" ON public.drawings FOR INSERT
  TO authenticated WITH CHECK (company_id = app.my_company_id() AND app.is_company_admin());

DROP POLICY IF EXISTS "update_admin_drawings" ON public.drawings;
CREATE POLICY "update_admin_drawings" ON public.drawings FOR UPDATE
  TO authenticated
  USING (company_id = app.my_company_id() AND app.is_company_admin())
  WITH CHECK (company_id = app.my_company_id() AND app.is_company_admin());
