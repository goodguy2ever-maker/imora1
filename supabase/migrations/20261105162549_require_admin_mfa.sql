-- Deploy the MFA enrollment UI before applying this migration.
-- get_my_access remains available at AAL1 so an administrator can enroll.
CREATE OR REPLACE FUNCTION app.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(auth.jwt()->>'aal', '') = 'aal2' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN' AND p.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_mfa_verified()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT app.is_super_admin() $$;
REVOKE ALL ON FUNCTION public.admin_mfa_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mfa_verified() TO authenticated;
