import { useState, type FormEvent } from 'react';
import { useSalesData, STAGES, type DealStage } from '@/lib/sales';
import { supabase } from '@/lib/supabase';
import { DEAL_STAGE_LABELS } from '@/lib/labels';
import { formatMoney, errorMessage } from '@/lib/format';
import { navigate } from '@/lib/router';
import { Alert, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from '@/components/ui';

export default function LeadsPipelinePage({ initialCreate = false }: { initialCreate?: boolean }) {
  const { data, loading, error, reload, access, session } = useSalesData();
  const [open, setOpen] = useState(initialCreate);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState('');
  const [unitId, setUnitId] = useState(''); const [projectId, setProjectId] = useState(''); const [budget, setBudget] = useState('');
  const [managerId, setManagerId] = useState(''); const [currency, setCurrency] = useState('RUB'); const [source, setSource] = useState('site');
  const [method, setMethod] = useState('cash'); const [notes, setNotes] = useState('');
  const managers = data.members.filter(m => m.status === 'active' && ['COMPANY_ADMIN','SALES_MANAGER','SALES_LEAD'].includes(m.role));
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setActionError('');
    try {
      const unit = data.units.find(u => u.id === unitId);
      const project = data.projects.find(p => p.id === projectId);
      const { error: failure } = await supabase.from('leads').insert({
        client_name: name.trim(), phone: phone.trim(), email: email.trim() || null,
        project_id: unit?.project_id ?? (projectId || null), interested_unit_id: unitId || null,
        budget: budget ? Number(budget) : null, currency: unit?.currency ?? project?.currency ?? currency,
        manager_id: access?.role === 'SALES_MANAGER' ? session?.user.id : managerId || session?.user.id,
        source: source.trim(), purchase_method: method, notes: notes.trim() || null,
      }).select('id').single();
      if (failure) throw failure;
      setOpen(false); setName(''); setPhone(''); setEmail(''); setBudget(''); setNotes('');
      await reload();
    } catch (err) { setActionError(errorMessage(err)); } finally { setBusy(false); }
  }
  async function move(id: string, stage: DealStage) {
    setBusy(true); setActionError('');
    try {
      const { error: failure } = await supabase.from('leads').update({ stage }).eq('id', id).select('id').single();
      if (failure) throw failure; await reload();
    } catch (err) { setActionError(errorMessage(err)); } finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <PageHeader title="Воронка продаж" description="Лиды и стадии из базы компании" actions={<Button onClick={() => { setActionError(''); setOpen(true); }}>Новый лид</Button>} />
    {(error || actionError) && <Alert tone="error">{error || actionError}</Alert>}
    <Field label="Менеджер"><Select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}><option value="all">Все доступные</option>{managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</Select></Field>
    {loading ? <Spinner /> : <div className="flex gap-3 overflow-x-auto pb-4">{STAGES.map(stage => <section key={stage} className="w-64 shrink-0 space-y-3"><h2 className="font-semibold text-slate-200">{DEAL_STAGE_LABELS[stage]}</h2>{data.leads.filter(l => l.stage === stage && (managerFilter === 'all' || l.manager_id === managerFilter)).map(l => <Card key={l.id} className="space-y-3 p-4"><button className="text-left font-semibold text-sky-300" onClick={() => navigate(`/sales/leads/${l.id}`)}>{l.client_name}</button><p className="text-sm text-slate-400">{l.phone}</p><p className="text-sm">{l.budget == null ? 'Бюджет не указан' : formatMoney(l.budget, l.currency)}</p><Field label="Стадия"><Select value={l.stage} disabled={busy} onChange={e => void move(l.id, e.target.value as DealStage)}>{STAGES.map(s => <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>)}</Select></Field></Card>)}</section>)}</div>}
    {!loading && !data.leads.length && <EmptyState title="Лидов пока нет" description="Добавьте первого клиента. Данные будут сохранены в базе." />}
    <Modal open={open} title="Новый лид" onClose={() => { if (!busy) setOpen(false); }} footer={<Button type="submit" form="create-lead" loading={busy}>Сохранить</Button>}>
      <form id="create-lead" onSubmit={create} className="space-y-3">
        {actionError && <Alert tone="error">{actionError}</Alert>}
        <Field label="Имя клиента"><Input required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Телефон"><Input required minLength={5} maxLength={40} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Проект"><Select value={projectId} onChange={e => { setProjectId(e.target.value); setUnitId(''); }}><option value="">Не выбран</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}</Select></Field>
        <Field label="Объект недвижимости"><Select value={unitId} onChange={e => setUnitId(e.target.value)}><option value="">Не выбран</option>{data.units.filter(u => !projectId || u.project_id === projectId).map(u => <option key={u.id} value={u.id}>{u.section} / {u.unit_number} ({u.currency})</option>)}</Select></Field>
        <Field label="Бюджет"><Input type="number" min="0" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} /></Field>
        {!projectId && !unitId && <Field label="Валюта"><Select value={currency} onChange={e => setCurrency(e.target.value)}>{['RUB','KZT','USD','EUR'].map(c => <option key={c}>{c}</option>)}</Select></Field>}
        {access?.role !== 'SALES_MANAGER' && <Field label="Ответственный"><Select value={managerId} onChange={e => setManagerId(e.target.value)}><option value="">Я</option>{managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</Select></Field>}
        <Field label="Источник"><Input required value={source} onChange={e => setSource(e.target.value)} /></Field>
        <Field label="Способ покупки"><Select value={method} onChange={e => setMethod(e.target.value)}>{['cash','mortgage','installment','exchange','subsidy','other'].map(m => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Примечание"><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      </form>
    </Modal>
  </div>;
}
