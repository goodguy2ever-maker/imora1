import { useState, type FormEvent } from 'react';
import { useSalesData, UNIT_STATUSES, type SalesUnit, type UnitStatus } from '@/lib/sales';
import { supabase } from '@/lib/supabase';
import { formatMoney, errorMessage } from '@/lib/format';
import { Alert, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner } from '@/components/ui';
export default function ChessboardPage() {
  const { data, loading, error, reload, access } = useSalesData();
  const [projectId, setProjectId] = useState(''); const [section, setSection] = useState(''); const [floor, setFloor] = useState('1');
  const [number, setNumber] = useState(''); const [area, setArea] = useState(''); const [price, setPrice] = useState(''); const [rooms, setRooms] = useState('1');
  const [kind, setKind] = useState('apartment'); const [open, setOpen] = useState(false); const [selected, setSelected] = useState<SalesUnit | null>(null);
  const [status, setStatus] = useState<UnitStatus>('free'); const [client, setClient] = useState(''); const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState(''); const [filter, setFilter] = useState('');
  const canWrite = access?.role === 'COMPANY_ADMIN' || access?.role === 'SALES_LEAD';
  async function create(e: FormEvent) {
    e.preventDefault(); setBusy(true); setActionError('');
    try {
      const project = data.projects.find(p => p.id === projectId);
      if (!project) throw new Error('Выберите проект');
      const { error: failure } = await supabase.from('real_estate_units').insert({ project_id: projectId, section: section.trim(), floor: Number(floor), unit_number: number.trim(), unit_type: kind, rooms: Number(rooms), total_area_m2: Number(area), price_per_m2: Number(price), total_price: Number(area) * Number(price), currency: project.currency }).select('id').single();
      if (failure) throw failure; setOpen(false); await reload();
    } catch (err) { setActionError(errorMessage(err)); } finally { setBusy(false); }
  }
  async function save(e: FormEvent) {
    e.preventDefault(); if (!selected) return; setBusy(true); setActionError('');
    try {
      const { error: failure } = await supabase.from('real_estate_units').update({ status, reserved_client_name: status === 'reserved' ? client.trim() || null : null, reserved_until: status === 'reserved' ? until || null : null }).eq('id', selected.id).select('id').single();
      if (failure) throw failure; setSelected(null); await reload();
    } catch (err) { setActionError(errorMessage(err)); } finally { setBusy(false); }
  }
  const units = data.units.filter(u => !filter || u.project_id === filter);
  return <div className="space-y-5"><PageHeader title="Шахматка недвижимости" description="Сохранённые объекты компании" actions={canWrite && <Button onClick={() => { setActionError(''); setOpen(true); }}>Добавить объект</Button>} />
    {(error || actionError) && <Alert tone="error">{error || actionError}</Alert>}
    <Field label="Проект"><Select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Все проекты</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
    {loading ? <Spinner /> : !units.length ? <EmptyState title="Объекты ещё не добавлены" /> : <div className="space-y-5">{[...new Set(units.map(u => `${u.project_id}/${u.section}`))].map(key => {
      const group = units.filter(u => `${u.project_id}/${u.section}` === key);
      return <Card key={key} className="space-y-3 p-4"><h2 className="font-semibold">{data.projects.find(p => p.id === group[0].project_id)?.name} · Секция {group[0].section}</h2>{[...new Set(group.map(u => u.floor))].sort((a,b) => b-a).map(f => <div key={f} className="flex flex-wrap gap-2"><span className="w-16 text-sm text-slate-400">Этаж {f}</span>{group.filter(u => u.floor === f).map(u => <button key={u.id} onClick={() => { setSelected(u); setStatus(u.status); setClient(u.reserved_client_name ?? ''); setUntil(u.reserved_until ?? ''); setActionError(''); }} className={`rounded-lg border p-3 text-left ${u.status === 'free' ? 'border-emerald-600' : u.status === 'reserved' ? 'border-amber-500' : 'border-slate-600'}`}><strong>{u.unit_number}</strong><p className="text-xs">{u.total_area_m2} м² · {UNIT_STATUSES[u.status]}</p><p className="text-xs">{formatMoney(u.total_price, u.currency)}</p></button>)}</div>)}</Card>;
    })}</div>}
    <Modal open={open} title="Объект недвижимости" onClose={() => { if (!busy) setOpen(false); }} footer={<Button form="create-unit" type="submit" loading={busy}>Сохранить</Button>}><form id="create-unit" onSubmit={create} className="space-y-3">
      {actionError && <Alert tone="error">{actionError}</Alert>}
      <Field label="Проект"><Select required value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">Выберите</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}</Select></Field>
      <Field label="Секция"><Input required maxLength={40} value={section} onChange={e => setSection(e.target.value)} /></Field><Field label="Этаж"><Input type="number" min="-5" max="120" required value={floor} onChange={e => setFloor(e.target.value)} /></Field>
      <Field label="Номер"><Input required maxLength={30} value={number} onChange={e => setNumber(e.target.value)} /></Field>
      <Field label="Тип"><Select value={kind} onChange={e => setKind(e.target.value)}>{['apartment','commercial','cottage','parking','storage'].map(k => <option key={k}>{k}</option>)}</Select></Field>
      <Field label="Комнат"><Input type="number" min="0" max="20" value={rooms} onChange={e => setRooms(e.target.value)} /></Field>
      <Field label="Площадь, м²"><Input required type="number" min="0.01" step="0.01" value={area} onChange={e => setArea(e.target.value)} /></Field>
      <Field label="Цена за м² в валюте проекта"><Input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></Field>
    </form></Modal>
    <Modal open={!!selected} title={`Объект ${selected?.unit_number ?? ''}`} onClose={() => { if (!busy) setSelected(null); }} footer={canWrite && <Button type="submit" form="unit-status" loading={busy}>Сохранить статус</Button>}>
      <form id="unit-status" onSubmit={save} className="space-y-3">{actionError && <Alert tone="error">{actionError}</Alert>}<Field label="Статус"><Select disabled={!canWrite} value={status} onChange={e => setStatus(e.target.value as UnitStatus)}>{Object.entries(UNIT_STATUSES).map(([s,label]) => <option key={s} value={s}>{label}</option>)}</Select></Field>{status === 'reserved' && <><Field label="Клиент"><Input disabled={!canWrite} value={client} onChange={e => setClient(e.target.value)} /></Field><Field label="Резерв до"><Input disabled={!canWrite} type="date" value={until} onChange={e => setUntil(e.target.value)} /></Field></>}</form>
    </Modal>
  </div>;
}
