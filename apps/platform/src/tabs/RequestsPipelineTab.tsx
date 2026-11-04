import { useEffect, useState } from 'react';
import {
  Users,
  Building,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Key,
  Copy,
  Check,
  Send,
  ExternalLink,
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { callManageUsers } from '@/lib/manageUsers';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Table, Td } from '@/components/ui';
import { formatDate, errorMessage } from '@/lib/format';
import { sendDirectorAccessEmail } from '@/lib/emailService';
import type { DemoRequest, DemoRequestStatus } from '../types';

export default function RequestsPipelineTab() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Activation modal state
  const [activeRequest, setActiveRequest] = useState<DemoRequest | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'business' | 'enterprise'>('business');
  const [userLimit, setUserLimit] = useState('10');
  const [accessDays, setAccessDays] = useState('14');
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState('');

  // Generated credential card
  const [credentialCard, setCredentialCard] = useState<{
    companyName: string;
    login: string;
    tempPass: string;
    loginUrl: string;
    plan: string;
    emailSent?: boolean;
    mailtoUrl?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadRequests() {
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (qErr) {
      setError(errorMessage(qErr));
    } else {
      setRequests((data as DemoRequest[]) ?? []);
      setError('');
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function updateStatus(id: string, newStatus: DemoRequestStatus) {
    const { error: updErr } = await supabase
      .from('demo_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (!updErr) {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    }
  }

  function openActivationModal(req: DemoRequest) {
    setActiveRequest(req);
    setCompanyName(req.company_name);
    setAdminName(req.full_name);

    // If contact is email, prefill it; else leave blank
    const isEmail = req.contact.includes('@');
    setAdminEmail(isEmail ? req.contact.trim() : '');

    // Generate strong temporary password
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setAdminPassword(`Imora#${randomSuffix}`);

    setSelectedPlan('business');
    setUserLimit('10');
    setAccessDays('14');
    setActivationError('');
  }

  async function handleActivateCompany() {
    if (!activeRequest) return;
    setActivating(true);
    setActivationError('');

    try {
      // Calculate access_until date
      const days = parseInt(accessDays, 10) || 14;
      const untilDate = new Date();
      untilDate.setDate(untilDate.getDate() + days);
      const accessUntilIso = untilDate.toISOString().slice(0, 10);

      // Create company and admin through the authenticated edge function.
      await callManageUsers<{ company_id: string }>({
        action: 'create_company',
        company_name: companyName.trim(),
        city: 'Город не указан',
        contact_email: adminEmail.trim(),
        contact_phone: !activeRequest.contact.includes('@') ? activeRequest.contact : null,
        status: 'trial',
        access_until: accessUntilIso,
        user_limit: parseInt(userLimit, 10) || 10,
        admin_email: adminEmail.trim(),
        admin_password: adminPassword.trim(),
        admin_full_name: adminName.trim(),
        admin_position: activeRequest.position || 'Руководитель',
      });

      // Mark request as approved in database
      await updateStatus(activeRequest.id, 'approved');

      // Send access email to the director
      const loginUrl = `${window.location.origin}/login`;
      const emailResult = await sendDirectorAccessEmail({
        to: adminEmail.trim(),
        directorName: adminName.trim(),
        companyName: companyName.trim(),
        loginUrl,
        tempPassword: adminPassword.trim(),
        plan: selectedPlan === 'starter' ? 'Старт (до 5 польз.)' : selectedPlan === 'business' ? 'Бизнес (до 25 польз.)' : 'Корпорация',
        accessUntil: accessUntilIso,
      });

      // Present the credential card for the superadmin
      setCredentialCard({
        companyName: companyName.trim(),
        login: adminEmail.trim(),
        tempPass: adminPassword.trim(),
        loginUrl,
        plan: selectedPlan === 'starter' ? 'Старт (до 5 польз.)' : selectedPlan === 'business' ? 'Бизнес (до 25 польз.)' : 'Корпорация',
        emailSent: emailResult.success,
        mailtoUrl: emailResult.mailtoUrl,
      });

      setActiveRequest(null);
    } catch (err) {
      setActivationError(errorMessage(err));
    } finally {
      setActivating(false);
    }
  }

  function copyCredentialText() {
    if (!credentialCard) return;
    const text = `Здравствуйте! Для вашей компании ${credentialCard.companyName} открыт доступ в IMORA 2.0.

Адрес входа: ${credentialCard.loginUrl}
Логин: ${credentialCard.login}
Временный пароль: ${credentialCard.tempPass}
Тариф: ${credentialCard.plan}

Рекомендуем сменить пароль при первом входе в систему.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const filtered = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.company_name.toLowerCase().includes(q) ||
        r.contact.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-900/60 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-950 p-5 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-400" />
            Пайплайн входящих заявок (Воронка подключений)
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Клиент оставляет заявку на лендинге → вы связываетесь и согласовываете условия → активируете доступ в 1 клик.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadRequests()} loading={loading}>
            Обновить заявки
          </Button>
        </div>
      </div>

      {/* Success Card Modal after activation */}
      {credentialCard && (
        <div className="rounded-xl border border-emerald-500/50 bg-gradient-to-b from-emerald-950/40 to-slate-950 p-6 shadow-2xl ring-1 ring-emerald-500/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Доступ успешно открыт! Воркспейс создан</h3>
                <p className="text-xs text-slate-300">
                  Компания <strong>{credentialCard.companyName}</strong> активирована в системе.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCredentialCard(null)}
              className="rounded-lg p-1 text-slate-400 hover:text-white"
            >
              Закрыть
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 space-y-1.5">
            <div><span className="text-slate-400">Ссылка для входа:</span> <strong className="text-sky-400">{credentialCard.loginUrl}</strong></div>
            <div><span className="text-slate-400">Логин администратора:</span> <strong className="text-white">{credentialCard.login}</strong></div>
            <div><span className="text-slate-400">Временный пароль:</span> <strong className="text-emerald-400">{credentialCard.tempPass}</strong></div>
            <div><span className="text-slate-400">Тарифный план:</span> <strong className="text-white">{credentialCard.plan}</strong></div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={copyCredentialText} className="shadow-emerald-600/30">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Скопировано в буфер!' : 'Скопировать карточку доступа для клиента'}
            </Button>
            {credentialCard.mailtoUrl && (
              <a
                href={credentialCard.mailtoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-900/50 hover:text-white transition"
              >
                <Mail className="h-4 w-4 text-sky-400" />
                Открыть в почтовой программе
              </a>
            )}
            <Button variant="secondary" onClick={() => setCredentialCard(null)}>
              Готово
            </Button>
            <span className="text-xs text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Уведомление с реквизитами отправлено директору
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-48 py-1.5 text-xs"
          >
            <option value="all">Все статусы заявок</option>
            <option value="new">Новые (требуют созвона)</option>
            <option value="contacted">Связались / В работе</option>
            <option value="negotiation">Переговоры по тарифу</option>
            <option value="approved">Доступ открыт (Активированы)</option>
            <option value="rejected">Отклонены</option>
          </Select>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Поиск по имени, компании, контакту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <Card className="p-8 text-center"><Spinner label="Загружаем заявки..." /></Card>
      ) : error ? (
        <Alert tone="error">{error}</Alert>
      ) : filtered.length === 0 ? (
        <Card><EmptyState title="Заявок с выбранными фильтрами не найдено" /></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const isApproved = r.status === 'approved';

            return (
              <Card key={r.id} className="p-5 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">{r.company_name}</h4>
                      <Badge
                        tone={
                          r.status === 'new'
                            ? 'amber'
                            : r.status === 'approved'
                            ? 'emerald'
                            : r.status === 'contacted'
                            ? 'sky'
                            : 'slate'
                        }
                      >
                        {r.status === 'new'
                          ? 'Новая'
                          : r.status === 'contacted'
                          ? 'Связались'
                          : r.status === 'negotiation'
                          ? 'Переговоры'
                          : r.status === 'approved'
                          ? 'Доступ открыт'
                          : 'Отклонена'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      <span className="font-semibold text-white">{r.full_name}</span>
                      <span>•</span>
                      <span className="text-slate-400">{r.position}</span>
                      <span>•</span>
                      <span className="font-mono text-sky-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {r.contact}
                      </span>
                    </div>

                    {r.message && (
                      <div className="mt-2 rounded-lg bg-slate-950/80 p-2.5 text-xs text-slate-300 border border-slate-800">
                        <span className="text-slate-500">Комментарий: </span>
                        {r.message}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 pt-1">
                      Поступила: {formatDate(r.created_at)}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    <Select
                      value={r.status}
                      onChange={(e) => void updateStatus(r.id, e.target.value as DemoRequestStatus)}
                      className="w-36 py-1 text-xs"
                    >
                      <option value="new">Новая</option>
                      <option value="contacted">Связались</option>
                      <option value="negotiation">Переговоры</option>
                      <option value="approved">Доступ открыт</option>
                      <option value="rejected">Отклонена</option>
                    </Select>

                    {!isApproved && (
                      <Button
                        variant="primary"
                        onClick={() => openActivationModal(r)}
                        className="py-1 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 font-semibold"
                      >
                        <Key className="h-3.5 w-3.5" /> Открыть доступ
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Activation Modal */}
      <Modal
        open={!!activeRequest}
        title="Активация доступа и создание компании"
        onClose={() => setActiveRequest(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveRequest(null)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleActivateCompany}
              loading={activating}
              className="bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
            >
              Создать воркспейс и выдать доступ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            После подтверждения будет создана изолированная база компании, сгенерирован администратор
            и подготовлена карточка с данными для клиента.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Название компании *">
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </Field>

            <Field label="Тарифный план">
              <Select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as any)}
              >
                <option value="starter">Старт (до 5 польз., 14 900 ₽/мес)</option>
                <option value="business">Бизнес (до 25 польз., 39 900 ₽/мес)</option>
                <option value="enterprise">Корпорация (Индивидуально)</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Срок доступа (дней)">
              <Input
                type="number"
                min="1"
                max="365"
                value={accessDays}
                onChange={(e) => setAccessDays(e.target.value)}
                hint="14 дней для триала, 30 или 365 для оплаченных"
              />
            </Field>

            <Field label="Лимит пользователей">
              <Input
                type="number"
                min="1"
                max="500"
                value={userLimit}
                onChange={(e) => setUserLimit(e.target.value)}
              />
            </Field>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Данные первого администратора компании
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ФИО администратора *">
                <Input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
              </Field>

              <Field label="Email для входа (Логин) *">
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="director@company.ru"
                />
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Временный пароль *" hint="Сгенерирован автоматически, можно изменить">
                <Input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>

          {activationError && <Alert tone="error">{activationError}</Alert>}
        </div>
      </Modal>
    </div>
  );
}
