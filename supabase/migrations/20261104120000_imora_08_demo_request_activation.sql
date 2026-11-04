BEGIN;

-- Keep legacy closed requests intact; add the statuses used by the platform UI.
ALTER TABLE public.demo_requests DROP CONSTRAINT IF EXISTS demo_requests_status_check;
ALTER TABLE public.demo_requests ADD CONSTRAINT demo_requests_status_check
  CHECK (status IN ('new', 'contacted', 'negotiation', 'approved', 'rejected', 'closed'));
ALTER TABLE public.demo_requests ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX demo_requests_company_key ON public.demo_requests(company_id) WHERE company_id IS NOT NULL;

-- Public forms can submit a new request, never assign a company or grant access.
REVOKE INSERT ON public.demo_requests FROM anon, authenticated;
GRANT INSERT (full_name, company_name, position, contact, message) ON public.demo_requests TO anon, authenticated;
DROP POLICY IF EXISTS "demo_requests_insert_public" ON public.demo_requests;
CREATE POLICY "demo_requests_insert_public" ON public.demo_requests FOR INSERT
  TO anon, authenticated WITH CHECK (status = 'new' AND company_id IS NULL);

-- The company, first admin profile and request status commit together.
-- The row lock serializes simultaneous activation attempts for the same request.
CREATE FUNCTION public.create_company_from_demo_request(
  p_request_id uuid,
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
  request_row public.demo_requests%ROWTYPE;
  new_company uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor AND role = 'SUPER_ADMIN' AND status = 'active') THEN
    RAISE EXCEPTION 'Недостаточно прав' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO request_row FROM public.demo_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;
  IF request_row.company_id IS NOT NULL OR request_row.status = 'approved' THEN
    RAISE EXCEPTION 'Доступ по этой заявке уже открыт';
  END IF;
  IF request_row.status IN ('rejected', 'closed') THEN
    RAISE EXCEPTION 'Сначала верните заявку в работу';
  END IF;

  new_company := public.create_company_with_admin(
    p_actor, p_name, p_city, p_contact_email, p_contact_phone,
    p_status, p_access_until, p_user_limit,
    p_admin_id, p_admin_email, p_admin_name, p_admin_position
  );
  UPDATE public.demo_requests SET status = 'approved', company_id = new_company WHERE id = p_request_id;
  RETURN new_company;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_company_from_demo_request(uuid, uuid, text, text, text, text, text, timestamptz, integer, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_from_demo_request(uuid, uuid, text, text, text, text, text, timestamptz, integer, uuid, text, text, text) TO service_role;

COMMIT;
