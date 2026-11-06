-- Serialize membership mutations with plan changes on the company row.
CREATE OR REPLACE FUNCTION app.guard_company_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_company uuid; cap integer; used integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN old_company := OLD.company_id; END IF;
  PERFORM id FROM public.companies WHERE id IN (NEW.company_id, old_company) ORDER BY id FOR UPDATE;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'COMPANY_ADMIN' AND OLD.status = 'active' AND old_company IS NOT NULL
       AND (NEW.role <> 'COMPANY_ADMIN' OR NEW.status <> 'active' OR NEW.company_id IS DISTINCT FROM old_company) THEN
      IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE company_id=old_company
        AND role='COMPANY_ADMIN' AND status='active' AND id<>OLD.id) THEN
        RAISE EXCEPTION 'Нельзя отключить последнего администратора компании' USING ERRCODE='23514';
      END IF;
    END IF;
    -- Existing active seats do not consume another seat on profile edits.
    IF OLD.status='active' AND NEW.company_id IS NOT DISTINCT FROM old_company THEN RETURN NEW; END IF;
  END IF;
  IF NEW.company_id IS NULL OR NEW.status <> 'active' THEN RETURN NEW; END IF;
  SELECT user_limit INTO cap FROM public.companies WHERE id=NEW.company_id;
  SELECT count(*) INTO used FROM public.profiles WHERE company_id=NEW.company_id AND status='active' AND id<>NEW.id;
  IF used >= cap THEN
    RAISE EXCEPTION 'Достигнут лимит активных пользователей компании' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.guard_company_membership() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_company_membership BEFORE INSERT OR UPDATE OF company_id, status, role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION app.guard_company_membership();

CREATE OR REPLACE FUNCTION app.guard_company_seat_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.user_limit < (SELECT count(*) FROM public.profiles WHERE company_id=NEW.id AND status='active') THEN
    RAISE EXCEPTION 'Сначала заблокируйте лишних сотрудников, затем уменьшите лимит' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.guard_company_seat_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_company_seat_limit BEFORE UPDATE OF user_limit ON public.companies
FOR EACH ROW EXECUTE FUNCTION app.guard_company_seat_limit();
