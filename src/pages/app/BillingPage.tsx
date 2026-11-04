import { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Calendar,
  Users,
  Building,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { useAuth } from '@/context/useAuth';
import { Button, Card, Badge, Modal, Field, Input, Select, Alert, PageHeader, Table, Td } from '@/components/ui';
import { formatDate } from '@/lib/format';

export default function BillingPage() {
  const { access } = useAuth();
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'business' | 'enterprise'>('business');
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('year');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'invoice'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [companyInn, setCompanyInn] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successPaid, setSuccessPaid] = useState(false);

  const PLANS = {
    starter: {
      name: 'Старт',
      monthly: 19900,
      annualMonthly: 14900,
      limits: 'До 5 сотрудников, 3 проекта',
    },
    business: {
      name: 'Бизнес',
      monthly: 49900,
      annualMonthly: 39900,
      limits: 'До 25 сотрудников, 15 проектов',
    },
    enterprise: {
      name: 'Корпорация',
      monthly: 120000,
      annualMonthly: 99000,
      limits: 'Безлимит пользователей и проектов',
    },
  };

  const currentPlanDetails = PLANS[selectedPlan];
  const unitPrice = billingCycle === 'year' ? currentPlanDetails.annualMonthly : currentPlanDetails.monthly;
  const totalPrice = billingCycle === 'year' ? unitPrice * 12 : unitPrice;

  const mockInvoices = [
    { id: 'INV-2026-089', date: '01.11.2026', amount: 39900, status: 'Оплачен', method: 'Карта МИР *4829' },
    { id: 'INV-2026-042', date: '01.10.2026', amount: 39900, status: 'Оплачен', method: 'Карта МИР *4829' },
  ];

  function handleProcessPayment() {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccessPaid(true);
      setTimeout(() => {
        setSuccessPaid(false);
        setCheckoutModalOpen(false);
      }, 2500);
    }, 1200);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Тарифный план и оплата"
        description="Управление подпиской компании, лимитами пользователей и финансовыми документами"
      />

      {/* Current Plan Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 border-sky-500/40 bg-gradient-to-br from-slate-900 to-slate-950 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                  Текущая подписка
                </span>
                <Badge tone={access?.company_status === 'active' ? 'emerald' : 'amber'}>
                  {access?.company_status === 'active' ? 'Активна' : 'Пробный период'}
                </Badge>
              </div>
              <h3 className="mt-1 text-2xl font-extrabold text-white">Тариф «Бизнес»</h3>
              <p className="mt-1 text-xs text-slate-300">
                Полный доступ: 2D-САПР чертежи, версионные сметы, закупки и ежедневные отчёты.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => setCheckoutModalOpen(true)}
              className="shadow-sky-600/30 font-semibold"
            >
              <CreditCard className="h-4 w-4" /> Продлить / Сменить тариф
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-slate-800 pt-6">
            <div className="rounded-lg bg-slate-950/80 p-3 border border-slate-800">
              <div className="text-xs text-slate-400">Срок доступа до:</div>
              <div className="mt-1 text-sm font-bold font-mono text-white">
                {formatDate(access?.access_until ?? '')}
              </div>
            </div>

            <div className="rounded-lg bg-slate-950/80 p-3 border border-slate-800">
              <div className="text-xs text-slate-400">Лимит пользователей:</div>
              <div className="mt-1 text-sm font-bold font-mono text-sky-400">
                До {access?.user_limit ?? 5} сотрудников
              </div>
            </div>

            <div className="rounded-lg bg-slate-950/80 p-3 border border-slate-800">
              <div className="text-xs text-slate-400">Поддержка:</div>
              <div className="mt-1 text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> 24/7 Приоритетная
              </div>
            </div>
          </div>
        </Card>

        {/* Quota Overview */}
        <Card className="p-6 border-slate-800 bg-slate-900/60 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">Использование квоты</h4>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Активные сотрудники:</span>
                  <span>4 из {access?.user_limit ?? 5}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: '80%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Строительные проекты:</span>
                  <span>3 из 15</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '20%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-sky-950/40 p-3 border border-sky-800/40 text-xs text-slate-300">
            Нужно больше мест для инженеров? Вы можете расширить лимит в любой момент.
          </div>
        </Card>
      </div>

      {/* Payment History and Invoices */}
      <div>
        <h3 className="text-base font-bold text-white mb-3">История платежей и бухгалтерские закрывающие документы</h3>
        <Card className="overflow-hidden border-slate-800">
          <Table head={['Номер счёта', 'Дата', 'Сумма', 'Способ оплаты', 'Статус', 'Документы']}>
            {mockInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-900/40 transition">
                <Td className="font-mono text-xs text-sky-400 font-semibold">{inv.id}</Td>
                <Td className="font-mono text-xs text-slate-300">{inv.date}</Td>
                <Td className="font-mono text-sm font-bold text-white">
                  {inv.amount.toLocaleString('ru-RU')} ₽
                </Td>
                <Td className="text-xs text-slate-400">{inv.method}</Td>
                <Td>
                  <Badge tone="emerald">{inv.status}</Badge>
                </Td>
                <Td>
                  <button
                    onClick={() => alert(`Скачивание электронного акта ${inv.id}.pdf`)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
                  >
                    <Download className="h-3.5 w-3.5" /> Акт (PDF)
                  </button>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      {/* Checkout / Upgrade Modal */}
      <Modal
        open={checkoutModalOpen}
        title="Оформление и продление подписки"
        onClose={() => setCheckoutModalOpen(false)}
        footer={
          successPaid ? (
            <Button variant="primary" disabled className="w-full bg-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Оплата успешно проведена!
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setCheckoutModalOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleProcessPayment}
                loading={processing}
                className="bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
              >
                Оплатить {totalPrice.toLocaleString('ru-RU')} ₽
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {/* Plan Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Выберите тариф:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['starter', 'business', 'enterprise'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPlan(p)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedPlan === p
                      ? 'border-sky-500 bg-sky-950/40 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm">{PLANS[p].name}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{PLANS[p].limits}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Billing Cycle */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Период оплаты:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBillingCycle('month')}
                className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition ${
                  billingCycle === 'month'
                    ? 'border-sky-500 bg-sky-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                1 месяц ({PLANS[selectedPlan].monthly.toLocaleString('ru-RU')} ₽)
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('year')}
                className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition ${
                  billingCycle === 'year'
                    ? 'border-sky-500 bg-sky-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                12 месяцев (Скидка 20%)
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t border-slate-800 pt-3">
            <label className="text-xs font-semibold text-slate-300 block mb-2">Способ оплаты:</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`rounded-lg border p-2 text-xs font-semibold transition ${
                  paymentMethod === 'card'
                    ? 'border-sky-500 bg-sky-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                💳 Банковская карта
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('invoice')}
                className={`rounded-lg border p-2 text-xs font-semibold transition ${
                  paymentMethod === 'invoice'
                    ? 'border-sky-500 bg-sky-950/40 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                📄 Счёт для юрлица (Безнал)
              </button>
            </div>

            {paymentMethod === 'card' ? (
              <div className="space-y-3 rounded-lg bg-slate-950 p-3 border border-slate-800">
                <Field label="Номер банковской карты">
                  <Input
                    placeholder="2200 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Срок (ММ/ГГ)">
                    <Input
                      placeholder="12/28"
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                    />
                  </Field>
                  <Field label="CVC / CVV">
                    <Input
                      type="password"
                      placeholder="•••"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg bg-slate-950 p-3 border border-slate-800">
                <Field label="ИНН вашей компании">
                  <Input
                    placeholder="7701234567"
                    value={companyInn}
                    onChange={(e) => setCompanyInn(e.target.value)}
                    hint="Реквизиты будут автоматически заполнены из ЕГРЮЛ"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Total summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs flex justify-between items-center">
            <span className="text-slate-400">Итого к оплате:</span>
            <span className="text-base font-bold text-emerald-400">
              {totalPrice.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
