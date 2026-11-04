/*
# BuildAI 01: companies, user profiles, access rules and audit log

Plain-English summary
This migration creates the foundation of the BuildAI workspace. Each construction company gets its own record with a subscription status and an access end date. Every signed-in person gets a profile that links them to a company and a role (platform super admin, company admin or regular member). Access checks are implemented in the database so the browser can never decide them.

1. New Tables
- `companies`: name, city, contact details, status (trial, active, suspended, expired), access_until, user_limit (default 5).
- `profiles`: one row per Supabase Auth user. Holds company_id, role (SUPER_ADMIN, COMPANY_ADMIN, MEMBER), full name, position, email copy for display, and status (active or blocked).
- `audit_logs`: journal of critical administrative actions.
- `demo_requests`: landing page demo requests submitted by visitors.

2. Helper functions (schema `app`)
- `app.my_company_id()`: company of the current user, only when the profile is active AND the company is open (trial/active and not past access_until). Every company-data policy uses this, so suspended or expired companies lose access while their data is preserved.
- `app.my_company_any()`: company of the current user regardless of access state (used to show a clear blocking message).
- `app.my_role()`, `app.is_super_admin()`, `app.is_company_admin()`.

3. Security
- RLS enabled on every table.
- Clients cannot insert or update profiles at all. Role, company and status changes go through server functions only.
- Company admins may update only the name, city and contact fields of their own company. Status, limits and access dates are protected.
- `demo_requests` accept public inserts with server-side length checks; only super admins can read them.
- Helper functions are not callable by anonymous visitors.

4. Important notes
- Access dates are required. A company is considered expired when access_until is in the past, even if its stored status is still trial or active.
- Deleting companies or profiles is not exposed to any client role, so company data is never removed by the app.
*/

CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO authenticated;

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  city text CHECK (city IS NULL OR char_length(city) <= 120),
  contact_email text CHECK (contact_email IS NULL OR char_length(contact_email) <= 254),
  contact_phone text CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 40),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'expired')),
  access_until timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  user_limit integer NOT NULL DEFAULT 5 CHECK (user_limit BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MEMBER')),
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  position text CHECK (position IS NULL OR char_length(position) <= 120),
  email text NOT NULL CHECK (char_length(email) <= 254),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_company_chk CHECK (
    (role = 'SUPER_ADMIN' AND company_id IS NULL) OR (role <> 'SUPER_ADMIN' AND company_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS profiles_company_id_idx ON public.profiles (company_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(action) <= 80),
  target_type text NOT NULL CHECK (char_length(target_type) <= 40),
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_company_idx ON public.audit_logs (company_id);

CREATE TABLE IF NOT EXISTS public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  company_name text NOT NULL CHECK (char_length(btrim(company_name)) BETWEEN 2 AND 160),
  position text NOT NULL CHECK (char_length(btrim(position)) BETWEEN 2 AND 120),
  contact text NOT NULL CHECK (char_length(btrim(contact)) BETWEEN 5 AND 200),
  message text CHECK (message IS NULL OR char_length(message) <= 2000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS demo_requests_created_idx ON public.demo_requests (created_at DESC);

CREATE OR REPLACE FUNCTION app.my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.company_id
  FROM public.profiles p
  JOIN public.companies c ON c.id = p.company_id
  WHERE p.id = auth.uid()
    AND p.status = 'active'
    AND c.status IN ('trial', 'active')
    AND c.access_until > now()
$$;

CREATE OR REPLACE FUNCTION app.my_company_any()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.company_id FROM public.profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
$$;

CREATE OR REPLACE FUNCTION app.my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.role FROM public.profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
$$;

CREATE OR REPLACE FUNCTION app.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN' AND p.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION app.is_company_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT app.my_role() = 'COMPANY_ADMIN' AND app.my_company_id() IS NOT NULL
$$;

REVOKE EXECUTE ON FUNCTION app.my_company_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app.my_company_any() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app.my_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app.is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app.is_company_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app.my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION app.my_company_any() TO authenticated;
GRANT EXECUTE ON FUNCTION app.my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION app.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION app.is_company_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_access()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
    'role', p.role,
    'profile_status', p.status,
    'full_name', p.full_name,
    'company_id', c.id,
    'company_name', c.name,
    'company_status', CASE
      WHEN c.id IS NULL THEN NULL
      WHEN c.status IN ('trial', 'active') AND c.access_until <= now() THEN 'expired'
      ELSE c.status END,
    'access_until', c.access_until,
    'user_limit', c.user_limit
  ) END
  FROM (SELECT 1) AS s
  LEFT JOIN public.profiles p ON p.id = auth.uid()
  LEFT JOIN public.companies c ON c.id = p.company_id
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access() TO authenticated;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.companies TO authenticated;
GRANT UPDATE (name, city, contact_email, contact_phone) ON public.companies TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.demo_requests TO anon, authenticated;
GRANT SELECT, UPDATE (status) ON public.demo_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies, public.profiles, public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_requests TO service_role;

DROP POLICY IF EXISTS "companies_select_visible" ON public.companies;
CREATE POLICY "companies_select_visible" ON public.companies FOR SELECT
  TO authenticated
  USING (app.is_super_admin() OR id = app.my_company_any());

DROP POLICY IF EXISTS "companies_update_own_admin" ON public.companies;
CREATE POLICY "companies_update_own_admin" ON public.companies FOR UPDATE
  TO authenticated
  USING (id = app.my_company_id() AND app.my_role() = 'COMPANY_ADMIN')
  WITH CHECK (id = app.my_company_id() AND app.my_role() = 'COMPANY_ADMIN');

DROP POLICY IF EXISTS "profiles_select_visible" ON public.profiles;
CREATE POLICY "profiles_select_visible" ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR app.is_super_admin() OR company_id = app.my_company_any());

DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_super_admin" ON public.audit_logs FOR SELECT
  TO authenticated
  USING (app.is_super_admin());

DROP POLICY IF EXISTS "demo_requests_insert_public" ON public.demo_requests;
CREATE POLICY "demo_requests_insert_public" ON public.demo_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'new');

DROP POLICY IF EXISTS "demo_requests_select_super_admin" ON public.demo_requests;
CREATE POLICY "demo_requests_select_super_admin" ON public.demo_requests FOR SELECT
  TO authenticated
  USING (app.is_super_admin());

DROP POLICY IF EXISTS "demo_requests_update_super_admin" ON public.demo_requests;
CREATE POLICY "demo_requests_update_super_admin" ON public.demo_requests FOR UPDATE
  TO authenticated
  USING (app.is_super_admin())
  WITH CHECK (app.is_super_admin());
