import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { errorMessage } from '@/lib/format';
import type { Role } from '@/lib/types';

export const STAGES = ['new','qualification','showing','negotiation','reservation','contract','payment','lost'] as const;
export type DealStage = typeof STAGES[number];
export const UNIT_STATUSES = { free: 'Свободна', reserved: 'Резерв', sold: 'Продана', not_for_sale: 'Не в продаже' } as const;
export type UnitStatus = keyof typeof UNIT_STATUSES;
export interface SalesLead { id: string; project_id: string | null; client_name: string; phone: string; email: string | null; interested_unit_id: string | null; budget: number | null; agreed_price: number | null; currency: string; stage: DealStage; manager_id: string | null; source: string; purchase_method: string; notes: string | null; created_at: string; }
export interface SalesUnit { id: string; project_id: string; section: string; floor: number; unit_number: string; unit_type: string; rooms: number | null; total_area_m2: number; price_per_m2: number; total_price: number; currency: string; status: UnitStatus; reserved_until: string | null; reserved_client_name: string | null; }
export interface SalesActivity { id: string; lead_id: string; activity_type: string; text: string; author_id: string | null; created_at: string; }
export interface SalesPayment { id: string; lead_id: string; payment_number: number; due_date: string; amount: number; currency: string; description: string; status: string; paid_amount: number | null; paid_at: string | null; }
export interface SalesMember { id: string; full_name: string; role: Role; status: string; }
export interface SalesProject { id: string; name: string; currency: string; }
export interface SalesProposal { id: string; lead_id: string; unit_number: string; final_price: number; currency: string; valid_until: string; }
export interface SalesData { leads: SalesLead[]; units: SalesUnit[]; activities: SalesActivity[]; payments: SalesPayment[]; members: SalesMember[]; projects: SalesProject[]; proposals: SalesProposal[]; }
const empty: SalesData = { leads: [], units: [], activities: [], payments: [], members: [], projects: [], proposals: [] };
// Page through every result; do not silently truncate totals at the API's row limit.
async function rows<T>(table: string): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select('*').order('id').range(offset, offset + 499);
    if (error) throw error;
    const page = (data ?? []) as T[];
    all.push(...page);
    if (page.length < 500) return all;
  }
}
export function useSalesData() {
  const { access, session } = useAuth();
  const [data, setData] = useState<SalesData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const reload = useCallback(async () => {
    const request = ++revision.current;
    setLoading(true); setError('');
    try {
      const [leads, units, activities, payments, members, projects, proposals] = await Promise.all([
        rows<SalesLead>('leads'), rows<SalesUnit>('real_estate_units'), rows<SalesActivity>('lead_activities'),
        rows<SalesPayment>('payment_schedules'), rows<SalesMember>('profiles'), rows<SalesProject>('projects'), rows<SalesProposal>('commercial_proposals'),
      ]);
      if (request === revision.current) setData({ leads, units, activities, payments, members, projects, proposals });
    } catch (err) { if (request === revision.current) { setData(empty); setError(errorMessage(err)); } }
    finally { if (request === revision.current) setLoading(false); }
  }, []);
  useEffect(() => { function cancel() { revision.current++; } void reload(); return cancel; }, [reload]);
  return { data, loading, error, reload, access, session };
}
export function salesTotals(data: SalesData) {
  const totals = new Map<string, { agreed: number; scheduled: number; received: number }>();
  function total(currency: string) { if (!totals.has(currency)) totals.set(currency, { agreed: 0, scheduled: 0, received: 0 }); return totals.get(currency)!; }
  for (const lead of data.leads) if (['contract','payment'].includes(lead.stage)) total(lead.currency).agreed += Number(lead.agreed_price ?? 0);
  for (const payment of data.payments) {
    const row = total(payment.currency);
    row.scheduled += Number(payment.amount);
    row.received += payment.status === 'paid' ? Number(payment.paid_amount ?? payment.amount) : Number(payment.paid_amount ?? 0);
  }
  return [...totals].map(([currency, values]) => ({ currency, ...values }));
}
