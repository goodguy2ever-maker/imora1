import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Plus, Calendar, ShieldCheck, AlertTriangle, Users, Search, RefreshCw, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { callManageUsers } from '@/lib/manageUsers';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td } from '@/components/ui';
import { COMPANY_STATUS_LABELS } from '@/lib/labels';
import { formatDate, errorMessage } from '@/lib/format';
import type { PlatformCompany } from '../types';

function statusTone(s: string) {
  return s === 'active' ? 'emerald' : s === 'trial' ? 'amber' : s === 'suspended' ? 'rose' : 'slate';
}

export default function CompaniesManagementTab() {
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<PlatformCompany | null>(null);
  const [accessCompany, setAccessCompany] = useState<PlatformCompany | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick action state
  const [quickActingId, setQuickActingId] = useState<string | null>(null);

  // Create form state
  const [cName, setCName] = useState('');
  const [cCity, setCCity] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cStatus, setCStatus] = useState<'trial' | 'active' | 'suspended'>('trial');
  const [cAccessUntil, setCAccessUntil] = useState('');
  const [cLimit, setCLimit] = useState('10');
  const [aEmail, setAEmail] = useState('');
  const [aPassword, setAPassword] = useState('');
  const [aName, setAName] = useState('');
  const [aPosition, setAPosition] = useState('');

  // Access modal state
  const [aStatus, setAStatus] = useState<string>('trial');
  const [aAccessUntil, setAAccessUntil] = useState('');
  const [aLimit, setALimit] = useState('10');

  async function load() {
    setLoading(true);
    const { data, error: rpcErr } = await supabase.rpc('platform_companies_overview');
    if (rpcErr) {
      setError(errorMessage(rpcErr));
    } else {
      setCompanies((data as PlatformCompany[]) ?? []);
      setError('');
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCompany(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await callManageUsers<{ company_id: string }>({
        action: 'create_company',
        company_name: cName.trim(),
        city: cCity.trim() || null,
        contact_email: cEmail.trim() || null,
        contact_phone: cPhone.trim() || null,
        status: cStatus,
        access_until: cAccessUntil,
        user_limit: parseInt(cLimit, 10),
        admin_email: aEmail.trim(),
        admin_password: aPassword,
        admin_full_name: aName.trim(),
        admin_position: aPosition.trim() || null,
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openAccess(c: PlatformCompany) {
    setAccessCompany(c);
    setAStatus(c.status);
    setAAccessUntil(c.access_until ? c.access_until.slice(0, 10) : '');
    setALimit(String(c.user_limit));
    setFormError('');
  }

  async function saveAccess(event: FormEvent) {
    event.preventDefault();
    if (!accessCompany) return;
    setFormError('');
    setSaving(true);
    const { error: rpcErr } = await supabase.rpc('platform_set_company_access', {
      p_company_id: accessCompany.id,
      p_status: aStatus,
      p_access_until: aAccessUntil,
      p_user_limit: parseInt(aLimit, 10),
    });
    setSaving(false);
    if (rpcErr) {
      setFormError(errorMessage(rpcErr));
      return;
    }
    setAccessCompany(null);
    void load();
  }

  async function quickExtendDays(company: PlatformCompany, addDays: number) {
    setQuickActingId(company.id);
    const current = company.access_until ? new Date(company.access_until) : new Date();
    const target = current > new Date() ? current : new Date();
    target.setDate(target.getDate() + addDays);
    const targetIso = target.toISOString().slice(0, 10);

    await supabase.rpc('platform_set_company_access', {
      p_company_id: company.id,
      p_status: 'active',
      p_access_until: targetIso,
      p_user_limit: company.user_limit,
    });
    setQuickActingId(null);
    void load();
  }

  async function toggleSuspend(company: PlatformCompany) {
    setQuickActingId(company.id);
    const newStatus = company.status === 'suspended' ? 'active' : 'suspended';
    await supabase.rpc('platform_set_company_access', {
      p_company_id: company.id,
      p_status: newStatus,
      p_access_until: company.access_until.slice(0, 10),
      p_user_limit: company.user_limit,
    });
    setQuickActingId(null);
    void load();
  }

  const filtered = companies.filter((c) => {
    if (statusFilter !== 'all' && c.effective_status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-400" />
            Компании и Воркспейсы платформы
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Управление организациями, лимитами пользователей, подпиской и ручная заморозка/разморозка.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() + 14);
            setCAccessUntil(d.toISOString().slice(0, 10));
            setCreateOpen(true);
          }}
          className="shadow-sky-600/30 font-semibold"
        >
          <Plus className="h-4 w-4" /> Добавить компанию вручную
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-44 py-1.5 text-xs"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="trial">Пробный период</option>
            <option value="suspended">Приостановленные</option>
            <option value="expired">Истёкшие</option>
          </Select>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Поиск по названию или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Companies Table */}
      {loading ? (
        <Card className="p-8 text-center"><Spinner label="Загружаем компании..." /></Card>
      ) : error ? (
        <Alert tone="error">{error}</Alert>
      ) : filtered.length === 0 ? (
        <Card><EmptyState title="Компаний не найдено" /></Card>
      ) : (
        <Card className="overflow-hidden border-slate-800">
          <Table head={['Компания', 'Статус', 'Доступ до', 'Пользователи', 'Проекты', 'Действия']}>
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-900/40 transition">
                <Td>
                  <div>
                    <span className="font-semibold text-white">{c.name}</span>
                    {c.city && <span className="text-xs text-slate-500 block">{c.city}</span>}
                    {c.contact_email && <span className="text-xs text-sky-400 block font-mono">{c.contact_email}</span>}
                  </div>
                </Td>
                <Td>
                  <Badge tone={statusTone(c.effective_status)}>
                    {COMPANY_STATUS_LABELS[c.effective_status] ?? c.effective_status}
                  </Badge>
                </Td>
                <Td>
                  <span className="font-mono text-xs">{formatDate(c.access_until)}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs">
                    {c.active_users} / {c.user_limit}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-xs">{c.projects_count}</span>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => openAccess(c)}
                      className="rounded-md bg-sky-950 px-2 py-1 text-xs font-semibold text-sky-300 border border-sky-800 hover:bg-sky-900 transition"
                    >
                      Настроить
                    </button>
                    <button
                      onClick={() => void quickExtendDays(c, 30)}
                      disabled={quickActingId === c.id}
                      className="rounded-md bg-emerald-950 px-2 py-1 text-xs font-semibold text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition"
                      title="Продлить на 30 дней"
                    >
                      +30 дн.
                    </button>
                    <button
                      onClick={() => void toggleSuspend(c)}
                      disabled={quickActingId === c.id}
                      className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                        c.status === 'suspended'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900'
                          : 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                      }`}
                    >
                      {c.status === 'suspended' ? 'Разморозить' : 'Заморозить'}
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Manual Create Company Modal */}
      <Modal
        open={createOpen}
        title="Создать компанию вручную"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={createCompany} loading={saving}>Создать</Button>
          </>
        }
      >
        <form onSubmit={createCompany} className="space-y-4">
          <Field label="Название компании *">
            <Input value={cName} onChange={(e) => setCName(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Город"><Input value={cCity} onChange={(e) => setCCity(e.target.value)} /></Field>
            <Field label="Статус">
              <Select value={cStatus} onChange={(e) => setCStatus(e.target.value as any)}>
                <option value="trial">Пробный период (trial)</option>
                <option value="active">Активна (active)</option>
                <option value="suspended">Приостановлена (suspended)</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Доступ до *"><Input type="date" value={cAccessUntil} onChange={(e) => setCAccessUntil(e.target.value)} required /></Field>
            <Field label="Лимит пользователей *"><Input type="number" value={cLimit} onChange={(e) => setCLimit(e.target.value)} min={1} required /></Field>
          </div>
          <div className="border-t border-slate-800 pt-3">
            <div className="text-xs font-semibold text-slate-400 mb-2">Администратор</div>
            <Field label="Имя администратора *"><Input value={aName} onChange={(e) => setAName(e.target.value)} required /></Field>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Field label="Email *"><Input type="email" value={aEmail} onChange={(e) => setAEmail(e.target.value)} required /></Field>
              <Field label="Пароль *"><Input type="password" value={aPassword} onChange={(e) => setAPassword(e.target.value)} required minLength={8} /></Field>
            </div>
          </div>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>

      {/* Access Settings Modal */}
      <Modal
        open={!!accessCompany}
        title={`Настройка доступа: ${accessCompany?.name}`}
        onClose={() => setAccessCompany(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAccessCompany(null)}>Отмена</Button>
            <Button onClick={saveAccess} loading={saving}>Сохранить</Button>
          </>
        }
      >
        <form onSubmit={saveAccess} className="space-y-4">
          <Field label="Статус компании">
            <Select value={aStatus} onChange={(e) => setAStatus(e.target.value)}>
              <option value="trial">Пробный период (trial)</option>
              <option value="active">Активная платная подписка (active)</option>
              <option value="suspended">Приостановлена вручную (suspended)</option>
              <option value="expired">Срок истёк (expired)</option>
            </Select>
          </Field>
          <Field label="Дата окончания доступа">
            <Input type="date" value={aAccessUntil} onChange={(e) => setAAccessUntil(e.target.value)} required />
          </Field>
          <Field label="Лимит активных пользователей">
            <Input type="number" min={1} max={500} value={aLimit} onChange={(e) => setALimit(e.target.value)} required />
          </Field>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
