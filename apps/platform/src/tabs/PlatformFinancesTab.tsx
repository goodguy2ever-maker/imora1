import { useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, Receipt, FileText, CheckCircle2, Clock, Plus, ShieldCheck } from 'lucide-react';
import { Card, Button, Badge, Modal, Field, Input, Select, Table, Td } from '@/components/ui';
import type { PlatformTransaction } from '../types';

const INITIAL_TRANSACTIONS: PlatformTransaction[] = [
  {
    id: 'tx_101',
    company_name: 'СК «МонолитСтрой»',
    amount: 478800,
    plan: 'Бизнес (1 год)',
    period: 'year',
    status: 'succeeded',
    payment_method: 'invoice',
    date: '02.11.2026',
    invoice_number: 'INV-2026-089',
  },
  {
    id: 'tx_102',
    company_name: 'ООО «Архитектура и Дизайн»',
    amount: 14900,
    plan: 'Старт (1 месяц)',
    period: 'month',
    status: 'succeeded',
    payment_method: 'card',
    date: '31.10.2026',
    invoice_number: 'INV-2026-088',
  },
  {
    id: 'tx_103',
    company_name: 'Девелопмент Групп «Север»',
    amount: 1200000,
    plan: 'Корпорация (Custom)',
    period: 'year',
    status: 'succeeded',
    payment_method: 'invoice',
    date: '28.10.2026',
    invoice_number: 'INV-2026-087',
  },
  {
    id: 'tx_104',
    company_name: 'СтройКомплект Юг',
    amount: 39900,
    plan: 'Бизнес (1 месяц)',
    period: 'month',
    status: 'succeeded',
    payment_method: 'card',
    date: '24.10.2026',
    invoice_number: 'INV-2026-086',
  },
];

export default function PlatformFinancesTab() {
  const [transactions, setTransactions] = useState<PlatformTransaction[]>(INITIAL_TRANSACTIONS);
  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
  const [pCompany, setPCompany] = useState('');
  const [pAmount, setPAmount] = useState('39900');
  const [pPlan, setPPlan] = useState('Бизнес');
  const [pMethod, setPMethod] = useState<'card' | 'invoice'>('invoice');

  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const mrrEstimate = 328000;

  function handleRegisterPayment() {
    if (!pCompany.trim()) return;
    const newTx: PlatformTransaction = {
      id: `tx_${Date.now()}`,
      company_name: pCompany.trim(),
      amount: parseInt(pAmount, 10) || 39900,
      plan: pPlan,
      period: 'month',
      status: 'succeeded',
      payment_method: pMethod,
      date: new Date().toLocaleDateString('ru-RU'),
      invoice_number: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
    };
    setTransactions([newTx, ...transactions]);
    setNewPaymentOpen(false);
    setPCompany('');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            Биллинг и Финансовая аналитика платформы
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Мониторинг выручки, продления подписок компаний и выставление безналичных счетов.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setNewPaymentOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 font-semibold"
        >
          <Plus className="h-4 w-4" /> Зафиксировать платёж / Счёт
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              MRR (Ежемесячный доход)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {mrrEstimate.toLocaleString('ru-RU')} ₽
          </div>
          <p className="mt-1 text-[11px] text-emerald-400">+18% за последний месяц</p>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Совокупная выручка
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {totalRevenue.toLocaleString('ru-RU')} ₽
          </div>
          <p className="mt-1 text-[11px] text-slate-400">С учётом годовых контрактов</p>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Платные клиенты
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {transactions.length} организаций
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Конверсия из триала в оплату: 68%</p>
        </Card>
      </div>

      {/* Plan Distribution Visual */}
      <Card className="p-5 border-slate-800 bg-slate-900/60">
        <h3 className="text-sm font-bold text-white mb-3">Распределение активных тарифов</h3>
        <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
          <div style={{ width: '25%' }} className="bg-sky-500" title="Старт (25%)" />
          <div style={{ width: '55%' }} className="bg-emerald-500" title="Бизнес (55%)" />
          <div style={{ width: '20%' }} className="bg-purple-500" title="Корпорация (20%)" />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span className="text-slate-300">Старт: 25%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Бизнес: 55%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-300">Корпорация: 20%</span>
          </div>
        </div>
      </Card>

      {/* Transactions History */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">История финансовых транзакций и счетов</h3>
        <Card className="overflow-hidden border-slate-800">
          <Table head={['Счёт', 'Компания', 'Тариф', 'Сумма', 'Способ', 'Дата', 'Статус']}>
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                <Td className="font-mono text-xs text-sky-400 font-semibold">{tx.invoice_number}</Td>
                <Td className="font-semibold text-white">{tx.company_name}</Td>
                <Td className="text-xs text-slate-300">{tx.plan}</Td>
                <Td className="font-mono text-sm font-bold text-emerald-400">
                  {tx.amount.toLocaleString('ru-RU')} ₽
                </Td>
                <Td>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                    {tx.payment_method === 'card' ? 'Карта онлайн' : 'Безнал (р/счет)'}
                  </span>
                </Td>
                <Td className="text-xs text-slate-400 font-mono">{tx.date}</Td>
                <Td>
                  <Badge tone="emerald">Оплачено</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Modal
        open={newPaymentOpen}
        title="Зафиксировать платёж / Провести безналичный счёт"
        onClose={() => setNewPaymentOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewPaymentOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleRegisterPayment} className="bg-emerald-600 hover:bg-emerald-500">
              Провести оплату
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Компания *">
            <Input
              value={pCompany}
              onChange={(e) => setPCompany(e.target.value)}
              placeholder="ООО «Строитель»"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Тариф">
              <Select value={pPlan} onChange={(e) => setPPlan(e.target.value)}>
                <option value="Старт">Старт (14 900 ₽)</option>
                <option value="Бизнес">Бизнес (39 900 ₽)</option>
                <option value="Бизнес (1 год)">Бизнес (Годовой со скидкой)</option>
                <option value="Корпорация">Корпорация</option>
              </Select>
            </Field>
            <Field label="Сумма (₽)">
              <Input
                type="number"
                value={pAmount}
                onChange={(e) => setPAmount(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Способ оплаты">
            <Select value={pMethod} onChange={(e) => setPMethod(e.target.value as any)}>
              <option value="invoice">Безналичный платёж по счёту (Банковский перевод)</option>
              <option value="card">Банковская карта онлайн</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
