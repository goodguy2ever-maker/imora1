export type DemoRequestStatus = 'new' | 'contacted' | 'negotiation' | 'approved' | 'rejected' | 'closed';

export type DemoRequest = {
  id: string;
  full_name: string;
  company_name: string;
  position: string;
  contact: string;
  message: string | null;
  status: DemoRequestStatus;
  company_id: string | null;
  created_at: string;
  notes?: string;
  assigned_plan?: string;
};

export type PlatformCompany = {
  id: string;
  name: string;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'trial' | 'active' | 'suspended' | 'expired';
  effective_status: 'trial' | 'active' | 'suspended' | 'expired';
  access_until: string;
  user_limit: number;
  active_users: number;
  projects_count: number;
  created_at: string;
  plan?: 'starter' | 'business' | 'enterprise';
  mrr?: number;
};

export type PlatformTransaction = {
  id: string;
  company_name: string;
  amount: number;
  plan: string;
  period: 'month' | 'year';
  status: 'succeeded' | 'processing' | 'refunded';
  payment_method: 'card' | 'invoice';
  date: string;
  invoice_number: string;
};
