import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProjects } from '@/lib/hooks';
import { Alert, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from '@/components/ui';
import { EXPENSE_CATEGORY_LABELS, CURRENCIES } from '@/lib/labels';
import { formatMoney, formatDate, errorMessage, todayIso } from '@/lib/format';
import type { Expense } from '@/lib/types';

export default function ExpensesPage() {
  const { projects, loading: projLoading } = useProjects();
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [category, setCategory] = useState('materials');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RUB');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('expenses')
      .select('id,project_id,expense_date,category,description,amount,currency,created_by')
      .order('expense_date', { ascending: false });
    if (filterProject !== 'all') query = query.eq('project_id', filterProject);
    const { data, error: qErr } = await query;
    if (qErr) setError(errorMessage(qErr));
    else { setItems((data as Expense[]) ?? []); setError(''); }
    setLoading(false);
  }, [filterProject]);

  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const { error: insErr } = await supabase.from('expenses').insert({
        project_id: projectId,
        expense_date: expenseDate,
        category,
        description: description.trim(),
        amount: parseFloat(amount),
        currency,
      });
      if (insErr) throw insErr;
      setOpen(false);
      setProjectId(''); setExpenseDate(todayIso()); setCategory('materials'); setDescription(''); setAmount(''); setCurrency('RUB');
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const { error: delErr } = await supabase.from('expenses').delete().eq('id', id);
    if (delErr) setError(errorMessage(delErr));
    else await load();
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div>
      <PageHeader
        title="Расходы"
        description="Фактические затраты по проектам"
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новый расход</Button>}
      />

      <div className="mb-4">
        <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-auto">
          <option value="all">Все проекты</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {projLoading || loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><EmptyState title="Расходов нет" description="Добавьте первый расход." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новый расход</Button>} /></Card>
      ) : (
        <Card>
          <Table head={['Дата', 'Проект', 'Категория', 'Описание', 'Сумма', '']}>
            {items.map((e) => (
              <tr key={e.id} className="hover:bg-slate-800/60">
                <Td>{formatDate(e.expense_date)}</Td>
                <Td>{projectMap.get(e.project_id)?.name ?? '—'}</Td>
                <Td>{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</Td>
                <Td className="max-w-xs truncate">{e.description}</Td>
                <Td className="font-semibold">{formatMoney(e.amount, e.currency)}</Td>
                <Td>
                  <button onClick={() => void remove(e.id)} className="text-slate-400 hover:text-rose-600" aria-label="Удалить">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal open={open} title="Новый расход" onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Отмена</Button><Button onClick={create} loading={saving}>Добавить</Button></>}>
        <form onSubmit={create} className="space-y-4">
          <Field label="Проект">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
              <option value="">Выберите проект</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Дата"><Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required /></Field>
            <Field label="Категория">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Описание"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={500} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Сумма"><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
            <Field label="Валюта">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
