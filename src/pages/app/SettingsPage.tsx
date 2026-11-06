import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { Alert, Badge, Button, Card, Field, Input, PageHeader } from '@/components/ui';
import { COMPANY_STATUS_LABELS } from '@/lib/labels';
import { formatDate, errorMessage } from '@/lib/format';

export default function SettingsPage() {
  const { access, loadAccess } = useAuth();
  const [name, setName] = useState(access?.company_name ?? '');
  const [city, setCity] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [reload, setReload] = useState(0);


  const isAdmin = access?.role === 'COMPANY_ADMIN';

  useEffect(() => {
    let active = true;
    setReady(false); setError('');
    if (!access?.company_id) return;
    void supabase.from('companies').select('name,city,contact_email,contact_phone')
      .eq('id', access.company_id).maybeSingle().then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) { setError('Не удалось загрузить настройки компании. Обновите страницу.'); return; }
        if (data) {
          setName(data.name); setCity(data.city ?? '');
          setContactEmail(data.contact_email ?? ''); setContactPhone(data.contact_phone ?? '');
          setReady(true);
        } else { setError('Компания не найдена.'); }
      });
    return () => { active = false; };
  }, [access?.company_id, reload]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!ready || saving || !isAdmin || !access?.company_id) return;
    if (name.trim().length < 2) { setError('Название должно содержать минимум 2 символа.'); return; }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { error: updErr } = await supabase.from('companies').update({
        name: name.trim(),
        city: city.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
      }).eq('id', access?.company_id);
      if (updErr) throw updErr;
      await loadAccess();
      setSuccess('Настройки сохранены.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Настройки" description="Информация о компании" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-semibold text-white">Профиль компании</h2>
          {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
          {success && <div className="mt-4"><Alert tone="success">{success}</Alert></div>}
          {!ready && <Button variant="secondary" onClick={() => setReload(n => n + 1)}>Загрузить настройки</Button>}
          <form onSubmit={save} className="mt-4 space-y-4">
            <Field label="Название компании"><Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} disabled={!isAdmin || !ready} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Город"><Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} disabled={!isAdmin || !ready} /></Field>
              <Field label="Контактный email"><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={254} disabled={!isAdmin || !ready} /></Field>
            </div>
            <Field label="Контактный телефон"><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={40} disabled={!isAdmin || !ready} /></Field>
            {isAdmin && <Button type="submit" disabled={!ready} loading={saving}>Сохранить</Button>}
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-white">Доступ</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Статус</dt>
              <dd className="mt-0.5"><Badge tone={access?.company_status === 'active' ? 'emerald' : access?.company_status === 'trial' ? 'amber' : 'rose'}>{COMPANY_STATUS_LABELS[access?.company_status ?? 'trial']}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Доступ до</dt>
              <dd className="mt-0.5 text-slate-200">{formatDate(access?.access_until)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Лимит пользователей</dt>
              <dd className="mt-0.5 text-slate-200">{access?.user_limit}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Ваша роль</dt>
              <dd className="mt-0.5 text-slate-200">{access?.role === 'COMPANY_ADMIN' ? 'Администратор компании' : 'Сотрудник'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
