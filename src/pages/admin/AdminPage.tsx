import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { callManageUsers } from '@/lib/manageUsers';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td } from '@/components/ui';
import { COMPANY_STATUS_LABELS } from '@/lib/labels';
import { formatDate, errorMessage } from '@/lib/format';
import type { Company } from '@/lib/types';

function statusTone(s: string) {
  return s === 'active' ? 'emerald' : s === 'trial' ? 'amber' : s === 'suspended' ? 'rose' : 'slate';
}

function CompaniesTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [accessCompany, setAccessCompany] = useState<Company | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // create form state
  const [cName, setCName] = useState('');
  const [cCity, setCCity] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cStatus, setCStatus] = useState('trial');
  const [cAccessUntil, setCAccessUntil] = useState('');
  const [cLimit, setCLimit] = useState('5');
  const [aEmail, setAEmail] = useState('');
  const [aPassword, setAPassword] = useState('');
  const [aName, setAName] = useState('');
  const [aPosition, setAPosition] = useState('');

  // edit form state
  const [eName, setEName] = useState('');
  const [eCity, setECity] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePhone, setEPhone] = useState('');

  // access form state
  const [aStatus, setAStatus] = useState('trial');
  const [aAccessUntil, setAAccessUntil] = useState('');
  const [aLimit, setALimit] = useState('5');

  async function load() {
    setLoading(true);
    const { data, error: rpcErr } = await supabase.rpc('platform_companies_overview');
    if (rpcErr) setError(errorMessage(rpcErr));
    else { setCompanies((data as Company[]) ?? []); setError(''); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createCompany(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await callManageUsers({
        action: 'create_company',
        name: cName.trim(),
        city: cCity.trim() || undefined,
        contact_email: cEmail.trim() || undefined,
        contact_phone: cPhone.trim() || undefined,
        status: cStatus,
        access_until: cAccessUntil,
        user_limit: parseInt(cLimit, 10),
        admin_email: aEmail.trim(),
        admin_password: aPassword,
        admin_name: aName.trim(),
        admin_position: aPosition.trim() || undefined,
      });
      setCreateOpen(false);
      setCName(''); setCCity(''); setCEmail(''); setCPhone(''); setCStatus('trial'); setCAccessUntil(''); setCLimit('5');
      setAEmail(''); setAPassword(''); setAName(''); setAPosition('');
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editCompany) return;
    setFormError('');
    setSaving(true);
    try {
      const { error: rpcErr } = await supabase.rpc('platform_update_company', {
        p_company_id: editCompany.id,
        p_name: eName.trim(),
        p_city: eCity.trim(),
        p_contact_email: eEmail.trim(),
        p_contact_phone: ePhone.trim(),
      });
      if (rpcErr) throw rpcErr;
      setEditCompany(null);
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveAccess(event: FormEvent) {
    event.preventDefault();
    if (!accessCompany) return;
    setFormError('');
    setSaving(true);
    try {
      const { error: rpcErr } = await supabase.rpc('platform_set_access', {
        p_company_id: accessCompany.id,
        p_status: aStatus,
        p_access_until: aAccessUntil,
        p_user_limit: parseInt(aLimit, 10),
      });
      if (rpcErr) throw rpcErr;
      setAccessCompany(null);
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(c: Company) {
    setEditCompany(c);
    setEName(c.name); setECity(c.city ?? ''); setEEmail(c.contact_email ?? ''); setEPhone(c.contact_phone ?? '');
    setFormError('');
  }

  function openAccess(c: Company) {
    setAccessCompany(c);
    setAStatus(c.effective_status);
    setAAccessUntil(c.access_until.slice(0, 10));
    setALimit(String(c.user_limit));
    setFormError('');
  }

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.effective_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Компании и доступ"
        description="Управление компаниями, статусами и лимитами"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Создать компанию</Button>}
      />

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      <div className="mb-4 flex flex-wrap gap-3">
        <Input placeholder="Поиск по названию" value={search} onChange={(e) => setSearch(e.target.value)} className="w-auto" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="all">Все статусы</option>
          {Object.entries(COMPANY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card><EmptyState title="Компаний не найдено" /></Card>
      ) : (
        <Card>
          <Table head={['Компания', 'Город', 'Статус', 'Доступ до', 'Лимит', 'Польз.', 'Проекты', 'Действия']}>
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-800/60">
                <Td className="font-medium">{c.name}</Td>
                <Td>{c.city || '—'}</Td>
                <Td><Badge tone={statusTone(c.effective_status)}>{COMPANY_STATUS_LABELS[c.effective_status]}</Badge></Td>
                <Td>{formatDate(c.access_until)}</Td>
                <Td>{c.user_limit}</Td>
                <Td>{c.active_users}</Td>
                <Td>{c.projects_count}</Td>
                <Td>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(c)} className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700">Изменить</button>
                    <button onClick={() => openAccess(c)} className="rounded-md bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-200">Доступ</button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Create company modal */}
      <Modal open={createOpen} title="Создать компанию" onClose={() => setCreateOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button><Button onClick={createCompany} loading={saving}>Создать</Button></>}>
        <form onSubmit={createCompany} className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">Данные компании</h3>
          <Field label="Название"><Input value={cName} onChange={(e) => setCName(e.target.value)} required maxLength={160} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Город"><Input value={cCity} onChange={(e) => setCCity(e.target.value)} maxLength={120} /></Field>
            <Field label="Статус">
              <Select value={cStatus} onChange={(e) => setCStatus(e.target.value)}>
                {Object.entries(COMPANY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Доступ до"><Input type="date" value={cAccessUntil} onChange={(e) => setCAccessUntil(e.target.value)} required /></Field>
            <Field label="Лимит польз."><Input type="number" value={cLimit} onChange={(e) => setCLimit(e.target.value)} min={1} max={500} required /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Контактный email"><Input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} /></Field>
            <Field label="Контактный телефон"><Input value={cPhone} onChange={(e) => setCPhone(e.target.value)} /></Field>
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Администратор компании</h3>
          <Field label="Имя администратора"><Input value={aName} onChange={(e) => setAName(e.target.value)} required maxLength={120} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email"><Input type="email" value={aEmail} onChange={(e) => setAEmail(e.target.value)} required /></Field>
            <Field label="Пароль" hint="Мин. 8 символов"><Input type="password" value={aPassword} onChange={(e) => setAPassword(e.target.value)} required minLength={8} /></Field>
          </div>
          <Field label="Должность"><Input value={aPosition} onChange={(e) => setAPosition(e.target.value)} maxLength={120} /></Field>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>

      {/* Edit company modal */}
      <Modal open={!!editCompany} title="Изменить компанию" onClose={() => setEditCompany(null)}
        footer={<><Button variant="secondary" onClick={() => setEditCompany(null)}>Отмена</Button><Button onClick={saveEdit} loading={saving}>Сохранить</Button></>}>
        <form onSubmit={saveEdit} className="space-y-4">
          <Field label="Название"><Input value={eName} onChange={(e) => setEName(e.target.value)} required maxLength={160} /></Field>
          <Field label="Город"><Input value={eCity} onChange={(e) => setECity(e.target.value)} maxLength={120} /></Field>
          <Field label="Контактный email"><Input type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} /></Field>
          <Field label="Контактный телефон"><Input value={ePhone} onChange={(e) => setEPhone(e.target.value)} /></Field>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>

      {/* Access modal */}
      <Modal open={!!accessCompany} title="Управление доступом" onClose={() => setAccessCompany(null)}
        footer={<><Button variant="secondary" onClick={() => setAccessCompany(null)}>Отмена</Button><Button onClick={saveAccess} loading={saving}>Сохранить</Button></>}>
        <form onSubmit={saveAccess} className="space-y-4">
          <p className="text-sm text-slate-400">Компания: <strong>{accessCompany?.name}</strong></p>
          <Field label="Статус">
            <Select value={aStatus} onChange={(e) => setAStatus(e.target.value)}>
              {Object.entries(COMPANY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Доступ до"><Input type="date" value={aAccessUntil} onChange={(e) => setAAccessUntil(e.target.value)} required /></Field>
          <Field label="Лимит пользователей"><Input type="number" value={aLimit} onChange={(e) => setALimit(e.target.value)} min={1} max={500} required /></Field>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>
    </div>
  );
}

function RequestsTab() {
  const [items, setItems] = useState<{ id: string; full_name: string; company_name: string; position: string; contact: string; message: string | null; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data, error: qErr } = await supabase.from('demo_requests').select('*').order('created_at', { ascending: false });
    if (qErr) setError(errorMessage(qErr));
    else { setItems(data ?? []); setError(''); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function updateStatus(id: string, status: string) {
    const { error: updErr } = await supabase.from('demo_requests').update({ status }).eq('id', id);
    if (updErr) setError(errorMessage(updErr));
    else await load();
  }

  if (loading) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <div>
      <PageHeader title="Заявки на демо" description="Обращения с лендинга" />
      {items.length === 0 ? (
        <Card><EmptyState title="Заявок пока нет" /></Card>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{r.full_name}</p>
                  <p className="text-sm text-slate-400">{r.position} · {r.company_name}</p>
                  <p className="mt-1 text-sm text-sky-700">{r.contact}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.status === 'new' ? 'amber' : r.status === 'contacted' ? 'sky' : 'slate'}>
                    {r.status === 'new' ? 'Новая' : r.status === 'contacted' ? 'Связались' : 'Закрыта'}
                  </Badge>
                  <Select value={r.status} onChange={(e) => void updateStatus(r.id, e.target.value)} className="w-auto py-1 text-xs">
                    <option value="new">Новая</option>
                    <option value="contacted">Связались</option>
                    <option value="closed">Закрыта</option>
                  </Select>
                </div>
              </div>
              {r.message && <p className="mt-3 text-sm text-slate-400">{r.message}</p>}
              <p className="mt-2 text-xs text-slate-400">{formatDate(r.created_at)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditTab() {
  const [items, setItems] = useState<{ id: number; actor_id: string | null; company_id: string | null; action: string; target_type: string; target_id: string | null; details: Record<string, unknown>; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: qErr } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (qErr) setError(errorMessage(qErr));
      else setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <div>
      <PageHeader title="Журнал действий" description="Последние 100 записей" />
      {items.length === 0 ? (
        <Card><EmptyState title="Записей пока нет" /></Card>
      ) : (
        <Card>
          <Table head={['Дата', 'Действие', 'Объект', 'ID', 'Детали']}>
            {items.map((l) => (
              <tr key={l.id}>
                <Td>{new Date(l.created_at).toLocaleString('ru-RU')}</Td>
                <Td className="font-mono text-xs">{l.action}</Td>
                <Td>{l.target_type}</Td>
                <Td className="font-mono text-xs text-slate-500">{l.target_id ? l.target_id.slice(0, 8) : '—'}</Td>
                <Td className="font-mono text-xs text-slate-500">{JSON.stringify(l.details)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}

export default function AdminPage({ path }: { path: string }) {
  if (path === '/admin/requests') return <RequestsTab />;
  if (path === '/admin/audit') return <AuditTab />;
  return <CompaniesTab />;
}
