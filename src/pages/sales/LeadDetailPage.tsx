import { useState, type FormEvent } from 'react';
import { useSalesData, STAGES, type DealStage } from '@/lib/sales';
import { supabase } from '@/lib/supabase';
import { DEAL_STAGE_LABELS } from '@/lib/labels';
import { formatMoney, formatDate, errorMessage, todayIso } from '@/lib/format';
import { navigate } from '@/lib/router';
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner, Textarea } from '@/components/ui';
export default function LeadDetailPage({ leadId }: { leadId: string }) {
  const { data, loading, error, reload, access } = useSalesData();
  const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState('');
  const [text, setText] = useState(''); const [activityType, setActivityType] = useState('note');
  const [amount, setAmount] = useState(''); const [due, setDue] = useState(todayIso()); const [description, setDescription] = useState('Плановый платёж');
  const lead = data.leads.find(l => l.id === leadId);
  const canRecordPayment = access?.role === 'COMPANY_ADMIN' || access?.role === 'SALES_LEAD';
  async function act(work: () => Promise<void>) {
    setBusy(true); setActionError('');
    try { await work(); await reload(); } catch (err) { setActionError(errorMessage(err)); } finally { setBusy(false); }
  }
  async function stage(value: DealStage) {
    await act(async () => {
      const { error: failure } = await supabase.from('leads').update({ stage: value }).eq('id', leadId).select('id').single();
      if (failure) throw failure;
    });
  }
  async function addActivity(e: FormEvent) {
    e.preventDefault();
    await act(async () => {
      const { error: failure } = await supabase.from('lead_activities').insert({ lead_id: leadId, activity_type: activityType, text: text.trim() }).select('id').single();
      if (failure) throw failure; setText('');
    });
  }
  async function addPayment(e: FormEvent) {
    e.preventDefault(); if (!lead) return;
    await act(async () => {
      const number = Math.max(0, ...data.payments.filter(p => p.lead_id === leadId).map(p => p.payment_number)) + 1;
      const { error: failure } = await supabase.from('payment_schedules').insert({ lead_id: leadId, payment_number: number, due_date: due, amount: Number(amount), currency: lead.currency, description: description.trim() }).select('id').single();
      if (failure) throw failure; setAmount('');
    });
  }
  async function recordPayment(id: string, value: number) {
    await act(async () => {
      const { error: failure } = await supabase.from('payment_schedules').update({ status: 'paid', paid_amount: value, paid_at: new Date().toISOString() }).eq('id', id).select('id').single();
      if (failure) throw failure;
    });
  }
  async function saveDeal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fields = new FormData(e.currentTarget);
    await act(async () => {
      const value = String(fields.get('agreed_price') ?? '');
      const { error: failure } = await supabase.from('leads').update({ agreed_price: value ? Number(value) : null, notes: String(fields.get('notes') ?? '').trim() || null }).eq('id', leadId).select('id').single();
      if (failure) throw failure;
    });
  }
  async function proposal() {
    if (!lead) return;
    const unit = data.units.find(u => u.id === lead.interested_unit_id);
    if (!unit) return;
    await act(async () => {
      const { error: failure } = await supabase.from('commercial_proposals').insert({ lead_id: leadId, unit_id: unit.id, unit_number: unit.unit_number, section: unit.section, floor: unit.floor, total_area_m2: unit.total_area_m2, price_per_m2: unit.price_per_m2, total_price: unit.total_price, discount_amount: 0, final_price: lead.agreed_price ?? unit.total_price, currency: lead.currency }).select('id').single();
      if (failure) throw failure;
    });
  }
  if (loading) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!lead) return <EmptyState title="Лид не найден или недоступен" action={<Button onClick={() => navigate('/sales/leads')}>К воронке</Button>} />;
  const payments = data.payments.filter(p => p.lead_id === leadId).sort((a,b) => a.payment_number-b.payment_number);
  const unit = data.units.find(u => u.id === lead.interested_unit_id);
  return <div className="space-y-5">
    <PageHeader title={lead.client_name} description={`${lead.phone}${lead.email ? ` · ${lead.email}` : ''}`} actions={<Button variant="secondary" onClick={() => navigate('/sales/leads')}>К воронке</Button>} />
    {actionError && <Alert tone="error">{actionError}</Alert>}
    <Card className="space-y-3 p-5"><Field label="Стадия"><Select value={lead.stage} disabled={busy} onChange={e => void stage(e.target.value as DealStage)}>{STAGES.map(s => <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>)}</Select></Field><p>Менеджер: {data.members.find(m => m.id === lead.manager_id)?.full_name ?? 'Не назначен'}</p><p>Бюджет: {lead.budget == null ? 'Не указан' : formatMoney(lead.budget, lead.currency)}</p><p>Объект: {unit ? `${unit.section} / ${unit.unit_number}` : 'Не выбран'}</p>
      <form key={`${lead.id}-${lead.agreed_price}-${lead.notes}`} onSubmit={saveDeal} className="space-y-3"><Field label={`Согласованная цена (${lead.currency})`}><Input name="agreed_price" type="number" min="0" step="0.01" defaultValue={lead.agreed_price ?? ''} /></Field><Field label="Примечание"><Textarea name="notes" defaultValue={lead.notes ?? ''} /></Field><Button type="submit" loading={busy}>Сохранить условия</Button></form>
    </Card>
    <Card className="space-y-3 p-5"><h2 className="font-semibold">Контакты и история</h2>{data.activities.filter(a => a.lead_id === leadId).sort((a,b) => b.created_at.localeCompare(a.created_at)).map(a => <article key={a.id} className="border-b border-slate-700 pb-3"><p className="text-xs text-slate-400">{formatDate(a.created_at)} · {a.activity_type} · {data.members.find(m => m.id === a.author_id)?.full_name ?? 'Система'}</p><p className="whitespace-pre-wrap">{a.text}</p></article>)}<form onSubmit={addActivity} className="space-y-3"><Field label="Тип контакта"><Select value={activityType} onChange={e => setActivityType(e.target.value)}>{['call','meeting','message','email','note'].map(t => <option key={t}>{t}</option>)}</Select></Field><Field label="Описание"><Textarea required value={text} onChange={e => setText(e.target.value)} /></Field><Button type="submit" loading={busy}>Добавить запись</Button></form></Card>
    <Card className="space-y-3 p-5"><h2 className="font-semibold">График платежей</h2><p className="text-sm text-slate-400">Ручной учёт плановых и полученных сумм. Платёжный сервис здесь не подключён.</p>{payments.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 py-2"><p>{formatDate(p.due_date)} · {p.description} · {formatMoney(p.amount, p.currency)} · {p.status === 'paid' ? 'Получен' : p.due_date < todayIso() ? 'Просрочен' : 'Ожидается'}</p>{canRecordPayment && p.status !== 'paid' && <Button disabled={busy} onClick={() => void recordPayment(p.id, p.amount)}>Отметить полученным</Button>}</div>)}{canRecordPayment && <form onSubmit={addPayment} className="space-y-3"><Field label="Дата"><Input required type="date" value={due} onChange={e => setDue(e.target.value)} /></Field><Field label={`Сумма (${lead.currency})`}><Input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field><Field label="Назначение"><Input required value={description} onChange={e => setDescription(e.target.value)} /></Field><Button loading={busy} type="submit">Добавить платёж в график</Button></form>}</Card>
    <Card className="space-y-3 p-5"><h2 className="font-semibold">Коммерческие предложения</h2>{unit && <Button loading={busy} onClick={() => void proposal()}>Сохранить предложение по выбранному объекту</Button>}{data.proposals.filter(p => p.lead_id === leadId).map(p => <p key={p.id}>Объект {p.unit_number} · {formatMoney(p.final_price, p.currency)} · до {formatDate(p.valid_until)}</p>)}</Card>
  </div>;
}
