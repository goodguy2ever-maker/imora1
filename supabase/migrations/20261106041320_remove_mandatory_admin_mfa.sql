-- Owner requested password-based admin access without mandatory MFA.
-- Role/status checks remain server-side; this does not grant any new role.
CREATE OR REPLACE FUNCTION app.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN' AND p.status = 'active'
  )
$$;
-- Keep the existing RPC compatible; no production flow requires it now.
CREATE OR REPLACE FUNCTION public.admin_mfa_verified()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT coalesce(auth.jwt()->>'aal', '') = 'aal2' AND app.is_super_admin() $$;
