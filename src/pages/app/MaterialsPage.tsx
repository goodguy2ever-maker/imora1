import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProjects } from '@/lib/hooks';
import { useAuth } from '@/context/useAuth';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from '@/components/ui';
import { MATERIAL_STATUS_LABELS, CURRENCIES, UNITS } from '@/lib/labels';
import { formatDate, errorMessage } from '@/lib/format';
import type { MaterialRequest } from '@/lib/types';

function statusTone(s: string) {
  return s === 'approved' ? 'emerald' : s === 'rejected' || s === 'cancelled' ? 'rose' : s === 'delivered' ? 'sky' : s === 'ordered' ? 'sky' : s === 'submitted' ? 'amber' : 'neutral';
}

const NEXT_ACTIONS: Record<string, { to: string; label: string; adminOnly?: boolean }[]> = {
  draft: [{ to: 'submitted', label: 'Отправить' }, { to: 'cancelled', label: 'Отменить' }],
  submitted: [{ to: 'approved', label: 'Согласовать', adminOnly: true }, { to: 'rejected', label: 'Отклонить', adminOnly: true }, { to: 'cancelled', label: 'Отменить' }],
  rejected: [{ to: 'draft', label: 'Вернуть в черновик' }, { to: 'cancelled', label: 'Отменить' }],
  approved: [{ to: 'ordered', label: 'Заказать', adminOnly: true }, { to: 'cancelled', label: 'Отменить', adminOnly: true }],
  ordered: [{ to: 'delivered', label: 'Доставлено', adminOnly: true }],
};

export default function MaterialsPage() {
  const { access, session } = useAuth();
  const { projects, loading: projLoading } = useProjects();
  const [items, setItems] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('шт');
  const [estPrice, setEstPrice] = useState('');
  const [currency, setCurrency] = useState('RUB');
  const [supplier, setSupplier] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState<MaterialRequest | null>(null);
  const [editSupplier, setEditSupplier] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const isAdmin = access?.role === 'COMPANY_ADMIN';

  async function load() {
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from('material_requests')
      .select('id,project_id,title,quantity,unit,estimated_unit_price,currency,supplier,needed_by,notes,status,created_by,approved_by,approved_at')
      .order('created_at', { ascending: false });
    if (qErr) setError(errorMessage(qErr));
    else { setItems((data as MaterialRequest[]) ?? []); setError(''); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const { error: insErr } = await supabase.from('material_requests').insert({
        project_id: projectId,
        title: title.trim(),
        quantity: parseFloat(quantity),
        unit,
        estimated_unit_price: estPrice ? parseFloat(estPrice) : null,
        currency,
        supplier: supplier.trim() || null,
        needed_by: neededBy || null,
        notes: notes.trim() || null,
        status: 'draft',
      });
      if (insErr) throw insErr;
      setOpen(false);
      setTitle(''); setProjectId(''); setQuantity('1'); setUnit('шт'); setEstPrice(''); setCurrency('RUB'); setSupplier(''); setNeededBy(''); setNotes('');
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    setError('');
    const { error: rpcErr } = await supabase.rpc('set_material_request_status', { p_id: id, p_status: status });
    if (rpcErr) setError(errorMessage(rpcErr));
    else await load();
  }

  async function saveSupplier(event: FormEvent) {
    event.preventDefault(); if (!editing) return;
    setSaving(true); setFormError('');
    try {
      const { error: failure } = await supabase.from('material_requests').update({ supplier: editSupplier.trim() || null, estimated_unit_price: editPrice ? Number(editPrice) : null }).eq('id', editing.id).select('id').single();
      if (failure) throw failure;
      setEditing(null); await load();
    } catch (err) { setFormError(errorMessage(err)); } finally { setSaving(false); }
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div>
      <PageHeader
        title="Заявки на материалы"
        description="Workflow: черновик → согласование → заказ → доставка"
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новая заявка</Button>}
      />

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {projLoading || loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><EmptyState title="Заявок нет" description="Создайте первую заявку на материал." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новая заявка</Button>} /></Card>
      ) : (
        <Card>
          <Table head={['Материал', 'Проект', 'Кол-во', 'Поставщик', 'Срок', 'Статус', 'Действия']}>
            {items.map((r) => {
              const actions = NEXT_ACTIONS[r.status] ?? [];
              const visibleActions = actions.filter(a => {
                if (['ordered','delivered'].includes(a.to)) return isAdmin || access?.role === 'SUPPLY_MANAGER';
                if (a.adminOnly) return isAdmin;
                return isAdmin || r.created_by === session?.user.id;
              });
              return (
                <tr key={r.id} className="hover:bg-slate-800/60">
                  <Td className="font-medium">{r.title}</Td>
                  <Td>{projectMap.get(r.project_id)?.name ?? '—'}</Td>
                  <Td>{r.quantity} {r.unit}</Td>
                  <Td>{r.supplier || '—'}</Td>
                  <Td>{formatDate(r.needed_by)}</Td>
                  <Td><Badge tone={statusTone(r.status)}>{MATERIAL_STATUS_LABELS[r.status]}</Badge></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {(isAdmin || access?.role === 'SUPPLY_MANAGER') && ['approved','ordered'].includes(r.status) && <Button variant="secondary" onClick={() => { setEditing(r); setEditSupplier(r.supplier ?? ''); setEditPrice(r.estimated_unit_price == null ? '' : String(r.estimated_unit_price)); setFormError(''); }}>Поставщик и цена</Button>}
                      {visibleActions.map((a) => (
                        <button key={a.to} onClick={() => void changeStatus(r.id, a.to)}
                          className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700">
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}

      <Modal open={open} title="Новая заявка на материал" onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Отмена</Button><Button type="submit" form="material-request-form" loading={saving}>Создать черновик</Button></>}>
        <form id="material-request-form" onSubmit={create} className="space-y-4">
          <Field label="Проект">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
              <option value="">Выберите проект</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Материал"><Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="Бетон М300" /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Количество"><Input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} required /></Field>
            <Field label="Единица">
              <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
            <Field label="Валюта">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Оценочная цена за ед."><Input type="number" step="0.01" value={estPrice} onChange={(e) => setEstPrice(e.target.value)} /></Field>
            <Field label="Поставщик"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={160} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Нужно до"><Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} /></Field>
          </div>
          <Field label="Примечание"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></Field>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>
      <Modal open={!!editing} title="Поставщик и цена" onClose={() => { if (!saving) setEditing(null); }} footer={<Button type="submit" form="material-supplier" loading={saving}>Сохранить</Button>}>
        <form id="material-supplier" onSubmit={saveSupplier} className="space-y-3">
          {formError && <Alert tone="error">{formError}</Alert>}
          <Field label="Поставщик"><Input maxLength={160} value={editSupplier} onChange={e => setEditSupplier(e.target.value)} /></Field>
          <Field label={`Цена за единицу (${editing?.currency ?? ''})`}><Input type="number" min="0" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} /></Field>
        </form>
      </Modal>
    </div>
  );
}
