/*
# IMORA 2.0 — Migration 07: Expanded 7-Role Architecture & Sales CRM Module

Summary:
1. Extends `profiles.role` constraint to support all 7 enterprise roles:
   - 'SUPER_ADMIN'
   - 'COMPANY_ADMIN'
   - 'ENGINEER'
   - 'FOREMAN'
   - 'SUPPLY_MANAGER'
   - 'SALES_MANAGER'
   - 'SALES_LEAD'
   - 'MEMBER'

2. Creates Sales CRM & Real Estate Tables:
   - `real_estate_units`: Chessboard apartments, commercial spaces, cottages
   - `leads`: CRM sales pipeline (leads, stages, budgets, purchase method)
   - `lead_activities`: Calls, notes, meetings, and stage changes timeline
   - `payment_schedules`: Installment payments and schedules per deal
   - `commercial_proposals`: Generated commercial offers (KP) snapshot

3. RLS Policies:
   - Data is strictly partitioned by `company_id = app.my_company_id()`
   - Sales roles (`SALES_MANAGER`, `SALES_LEAD`) can only read/write CRM tables
   - Construction managers can see apartments for coordination
*/

-- ─── 1. UPDATE PROFILES.ROLE CHECK CONSTRAINT ──────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_chk;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    'SUPER_ADMIN',
    'COMPANY_ADMIN',
    'ENGINEER',
    'FOREMAN',
    'SUPPLY_MANAGER',
    'SALES_MANAGER',
    'SALES_LEAD',
    'MEMBER'
  )
);

-- ─── 2. HELPER FUNCTIONS FOR ROLES ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION app.can_access_sales_crm()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT app.is_super_admin() OR (
    app.my_company_id() IS NOT NULL AND
    app.my_role() IN ('COMPANY_ADMIN', 'SALES_MANAGER', 'SALES_LEAD')
  )
$$;

GRANT EXECUTE ON FUNCTION app.can_access_sales_crm() TO authenticated;

-- ─── 3. REAL ESTATE UNITS (ШАХМАТКА КВАРТИР) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.real_estate_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (char_length(btrim(section)) BETWEEN 1 AND 40),
  floor integer NOT NULL CHECK (floor BETWEEN -5 AND 120),
  unit_number text NOT NULL CHECK (char_length(btrim(unit_number)) BETWEEN 1 AND 30),
  unit_type text NOT NULL DEFAULT 'apartment' CHECK (
    unit_type IN ('apartment', 'commercial', 'cottage', 'parking', 'storage')
  ),
  rooms integer CHECK (rooms IS NULL OR rooms BETWEEN 0 AND 20),
  total_area_m2 numeric(8, 2) NOT NULL CHECK (total_area_m2 > 0),
  living_area_m2 numeric(8, 2) CHECK (living_area_m2 IS NULL OR living_area_m2 > 0),
  kitchen_area_m2 numeric(8, 2) CHECK (kitchen_area_m2 IS NULL OR kitchen_area_m2 > 0),
  price_per_m2 numeric(14, 2) NOT NULL CHECK (price_per_m2 >= 0),
  total_price numeric(16, 2) NOT NULL CHECK (total_price >= 0),
  currency text NOT NULL DEFAULT 'KZT' CHECK (char_length(currency) BETWEEN 3 AND 10),
  status text NOT NULL DEFAULT 'free' CHECK (
    status IN ('free', 'reserved', 'sold', 'not_for_sale')
  ),
  reserved_until date,
  reserved_client_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_company_project_section_number UNIQUE (company_id, project_id, section, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_units_company_proj ON public.real_estate_units (company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.real_estate_units (status);

-- ─── 4. LEADS & DEALS (ВОРОНКА СДЕЛОК CRM) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_name text NOT NULL CHECK (char_length(btrim(client_name)) BETWEEN 2 AND 160),
  phone text NOT NULL CHECK (char_length(btrim(phone)) BETWEEN 5 AND 40),
  email text CHECK (email IS NULL OR char_length(email) <= 254),
  interested_unit_id uuid REFERENCES public.real_estate_units(id) ON DELETE SET NULL,
  budget numeric(16, 2) CHECK (budget IS NULL OR budget >= 0),
  agreed_price numeric(16, 2) CHECK (agreed_price IS NULL OR agreed_price >= 0),
  currency text NOT NULL DEFAULT 'KZT',
  stage text NOT NULL DEFAULT 'new' CHECK (
    stage IN ('new', 'qualification', 'showing', 'negotiation', 'reservation', 'contract', 'payment', 'lost')
  ),
  manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'site',
  purchase_method text NOT NULL DEFAULT 'cash' CHECK (
    purchase_method IN ('cash', 'mortgage', 'installment', 'exchange', 'subsidy', 'other')
  ),
  lost_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_company_stage ON public.leads (company_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_manager ON public.leads (manager_id);

-- ─── 5. LEAD ACTIVITIES (ТАЙМЛАЙН КОНТАКТОВ) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (
    activity_type IN ('call', 'meeting', 'message', 'email', 'note', 'stage_change')
  ),
  text text NOT NULL CHECK (char_length(btrim(text)) > 0),
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities (lead_id, created_at DESC);

-- ─── 6. PAYMENT SCHEDULES (ГРАФИК ОПЛАТ И РАССРОЧКИ) ───────────────────────
CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_number integer NOT NULL CHECK (payment_number >= 1),
  due_date date NOT NULL,
  amount numeric(16, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'KZT',
  description text NOT NULL DEFAULT 'Плановый платёж',
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'overdue')
  ),
  paid_at timestamptz,
  paid_amount numeric(16, 2) CHECK (paid_amount IS NULL OR paid_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_lead ON public.payment_schedules (lead_id, payment_number);

-- ─── 7. COMMERCIAL PROPOSALS (КП) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.real_estate_units(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  unit_number text NOT NULL,
  section text NOT NULL,
  floor integer NOT NULL,
  total_area_m2 numeric(8, 2) NOT NULL,
  price_per_m2 numeric(14, 2) NOT NULL,
  total_price numeric(16, 2) NOT NULL,
  discount_amount numeric(16, 2) DEFAULT 0,
  final_price numeric(16, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'KZT',
  valid_until date NOT NULL DEFAULT (current_date + interval '7 days'),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_lead ON public.commercial_proposals (lead_id);

-- ─── 8. ROW LEVEL SECURITY (RLS) ───────────────────────────────────────────
ALTER TABLE public.real_estate_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.real_estate_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_proposals TO authenticated;

-- Units policies
DROP POLICY IF EXISTS "units_company_select" ON public.real_estate_units;
CREATE POLICY "units_company_select" ON public.real_estate_units FOR SELECT
  TO authenticated
  USING (company_id = app.my_company_id());

DROP POLICY IF EXISTS "units_company_modify" ON public.real_estate_units;
CREATE POLICY "units_company_modify" ON public.real_estate_units FOR ALL
  TO authenticated
  USING (company_id = app.my_company_id())
  WITH CHECK (company_id = app.my_company_id());

-- Leads policies
DROP POLICY IF EXISTS "leads_company_select" ON public.leads;
CREATE POLICY "leads_company_select" ON public.leads FOR SELECT
  TO authenticated
  USING (company_id = app.my_company_id() AND app.can_access_sales_crm());

DROP POLICY IF EXISTS "leads_company_modify" ON public.leads;
CREATE POLICY "leads_company_modify" ON public.leads FOR ALL
  TO authenticated
  USING (company_id = app.my_company_id() AND app.can_access_sales_crm())
  WITH CHECK (company_id = app.my_company_id() AND app.can_access_sales_crm());

-- Activities policies
DROP POLICY IF EXISTS "activities_company_select" ON public.lead_activities;
CREATE POLICY "activities_company_select" ON public.lead_activities FOR SELECT
  TO authenticated
  USING (company_id = app.my_company_id() AND app.can_access_sales_crm());

DROP POLICY IF EXISTS "activities_company_insert" ON public.lead_activities;
CREATE POLICY "activities_company_insert" ON public.lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (company_id = app.my_company_id() AND app.can_access_sales_crm());

-- Payment schedules policies
DROP POLICY IF EXISTS "payment_schedules_company_all" ON public.payment_schedules;
CREATE POLICY "payment_schedules_company_all" ON public.payment_schedules FOR ALL
  TO authenticated
  USING (company_id = app.my_company_id() AND app.can_access_sales_crm())
  WITH CHECK (company_id = app.my_company_id() AND app.can_access_sales_crm());

-- Proposals policies
DROP POLICY IF EXISTS "proposals_company_all" ON public.commercial_proposals;
CREATE POLICY "proposals_company_all" ON public.commercial_proposals FOR ALL
  TO authenticated
  USING (company_id = app.my_company_id() AND app.can_access_sales_crm())
  WITH CHECK (company_id = app.my_company_id() AND app.can_access_sales_crm());
