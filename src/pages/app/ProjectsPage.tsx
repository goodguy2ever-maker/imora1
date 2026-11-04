import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProjects } from '@/lib/hooks';
import { useAuth } from '@/context/useAuth';
import Link from '@/components/Link';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td, Alert } from '@/components/ui';
import { PROJECT_STATUS_LABELS, CURRENCIES } from '@/lib/labels';
import { formatDate, errorMessage } from '@/lib/format';

function statusTone(status: string) {
  return status === 'active' ? 'sky' : status === 'completed' ? 'emerald' : status === 'archived' ? 'slate' : 'amber';
}

export default function ProjectsPage() {
  const { access } = useAuth();
  const { projects, loading, error, reload } = useProjects();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [currency, setCurrency] = useState('RUB');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isAdmin = access?.role === 'COMPANY_ADMIN';

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('projects').insert({
        name: name.trim(),
        address: address.trim() || null,
        client_name: clientName.trim() || null,
        currency,
        status: 'planning',
        start_date: startDate || null,
        end_date: endDate || null,
      });
      if (insertError) throw insertError;
      setOpen(false);
      setName('');
      setAddress('');
      setClientName('');
      setCurrency('RUB');
      setStartDate('');
      setEndDate('');
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Проекты"
        description="Строительные объекты вашей компании"
        actions={isAdmin && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новый проект</Button>}
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <Alert tone="error">{error}</Alert>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            title="Проектов пока нет"
            description={isAdmin ? 'Создайте первый проект, чтобы начать работу.' : 'Администратор компании создаст проекты.'}
            action={isAdmin && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новый проект</Button>}
          />
        </Card>
      ) : (
        <Card>
          <Table head={['Название', 'Клиент', 'Статус', 'Валюта', 'Начало', '']}>
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/60">
                <Td>
                  <Link to={`/app/projects/${p.id}`} className="font-medium text-sky-700 hover:text-sky-900">
                    {p.name}
                  </Link>
                  {p.address && <p className="text-xs text-slate-400">{p.address}</p>}
                </Td>
                <Td>{p.client_name || '—'}</Td>
                <Td><Badge tone={statusTone(p.status)}>{PROJECT_STATUS_LABELS[p.status] ?? p.status}</Badge></Td>
                <Td>{p.currency}</Td>
                <Td>{formatDate(p.start_date)}</Td>
                <Td><Link to={`/app/projects/${p.id}`} className="text-sm text-sky-700 hover:underline">Открыть</Link></Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal
        open={open}
        title="Новый проект"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={create} loading={saving} form="create-project-form" type="submit">Создать</Button>
          </>
        }
      >
        <form id="create-project-form" onSubmit={create} className="space-y-4">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} placeholder="ЖК Северный, корпус 3" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Клиент">
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={160} />
            </Field>
            <Field label="Валюта">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Адрес">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={240} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Дата начала"><Input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} /></Field>
            <Field label="Дата окончания"><Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} /></Field>
          </div>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
