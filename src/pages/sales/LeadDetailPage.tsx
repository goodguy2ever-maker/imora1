import { useState, useEffect } from 'react';
import { useAuth } from '@/context/useAuth';
import { navigate } from '@/lib/router';
import { canAccessSalesCRM } from '@/lib/types';
import { DEAL_STAGE_LABELS } from '@/lib/labels';
import {
  ArrowLeft, Phone, Mail, MessageSquare, ArrowRight, Home,
  FileText, User, Plus, Check, ChevronDown
} from 'lucide-react';

type DealStage = 'new' | 'qualification' | 'showing' | 'negotiation' | 'reservation' | 'contract' | 'payment' | 'lost';
type ActivityType = 'call' | 'note' | 'email' | 'meeting' | 'stage_change';

interface Activity {
  id: string;
  type: ActivityType;
  text: string;
  author: string;
  createdAt: string;
}

interface PaymentItem {
  id: string;
  dueDate: string;
  amount: number;
  label: string;
  paid: boolean;
}

interface LeadDetail {
  id: string;
  clientName: string;
  phone: string;
  email?: string;
  interestedUnit?: string;
  unitArea?: number;
  unitPrice?: number;
  stage: DealStage;
  manager: string;
  source: string;
  purchaseMethod: string;
  budget?: number;
  agreedPrice?: number;
  notes?: string;
  activities: Activity[];
  paymentSchedule: PaymentItem[];
}

// TODO: fetch from leads + lead_activities Supabase tables
const MOCK_LEAD: LeadDetail = {
  id: '3',
  clientName: 'Рустам Каримов',
  phone: '+7 702 999 8877',
  email: 'rustam.karimov@mail.ru',
  interestedUnit: 'A0108',
  unitArea: 68,
  unitPrice: 420_000,
  stage: 'negotiation',
  manager: 'М. Иванова',
  source: 'Рекомендация',
  purchaseMethod: 'Рассрочка',
  budget: 65_000_000,
  agreedPrice: 28_560_000,
  notes: 'Клиент рассматривает 2 варианта — A0108 и B0205. Приоритет — угловая квартира с видом.',
  activities: [
    { id: 'a1', type: 'call', text: 'Первичный звонок. Интерес к 2-комн, бюджет до 65 млн. Назначили показ.', author: 'М. Иванова', createdAt: '2026-10-20 09:30' },
    { id: 'a2', type: 'meeting', text: 'Показ квартиры A0108. Понравилась планировка, беспокоит вид с нижних этажей.', author: 'М. Иванова', createdAt: '2026-10-22 14:00' },
    { id: 'a3', type: 'note', text: 'Клиент просит дополнительную скидку 3%. Уточняем у руководства.', author: 'М. Иванова', createdAt: '2026-10-24 11:15' },
    { id: 'a4', type: 'stage_change', text: 'Статус изменён: Показ → Переговоры', author: 'Система', createdAt: '2026-10-25 10:00' },
    { id: 'a5', type: 'call', text: 'Обсуждение графика рассрочки. Первоначальный взнос 30%, остаток — 12 мес.', author: 'М. Иванова', createdAt: '2026-10-28 16:00' },
  ],
  paymentSchedule: [
    { id: 'p1', dueDate: '2026-11-10', amount: 8_568_000, label: 'Первоначальный взнос (30%)', paid: true },
    { id: 'p2', dueDate: '2026-12-10', amount: 1_664_000, label: 'Ежемесячный платёж #1', paid: false },
    { id: 'p3', dueDate: '2027-01-10', amount: 1_664_000, label: 'Ежемесячный платёж #2', paid: false },
    { id: 'p4', dueDate: '2027-02-10', amount: 1_664_000, label: 'Ежемесячный платёж #3', paid: false },
    { id: 'p5', dueDate: '2027-03-10', amount: 1_664_000, label: 'Ежемесячный платёж #4', paid: false },
  ],
};

const STAGES: DealStage[] = ['new','qualification','showing','negotiation','reservation','contract','payment','lost'];

const ACTIVITY_ICON: Record<ActivityType, { icon: React.ElementType; color: string }> = {
  call:         { icon: Phone, color: 'text-sky-400' },
  note:         { icon: MessageSquare, color: 'text-violet-400' },
  email:        { icon: Mail, color: 'text-amber-400' },
  meeting:      { icon: User, color: 'text-emerald-400' },
  stage_change: { icon: ArrowRight, color: 'text-rose-400' },
};

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' ₸'; }

const STAGE_COLORS: Record<DealStage, string> = {
  new:          'bg-slate-600 text-slate-200',
  qualification:'bg-sky-600 text-white',
  showing:      'bg-violet-600 text-white',
  negotiation:  'bg-amber-600 text-white',
  reservation:  'bg-orange-600 text-white',
  contract:     'bg-emerald-600 text-white',
  payment:      'bg-teal-600 text-white',
  lost:         'bg-rose-700 text-white',
};

export default function LeadDetailPage() {
  const { access } = useAuth();
  const role = access?.role;
  const [lead, setLead] = useState<LeadDetail>(MOCK_LEAD);
  const [newActivity, setNewActivity] = useState('');
  const [actType, setActType] = useState<ActivityType>('note');
  const [stageOpen, setStageOpen] = useState(false);

  // Get lead ID from URL — /sales/leads/:id
  // For now load mock data; TODO: fetch by ID from Supabase
  useEffect(() => {
    if (role && !canAccessSalesCRM(role)) navigate('/app');
  }, [role]);

  if (!role || !canAccessSalesCRM(role)) return null;

  function addActivity() {
    if (!newActivity.trim()) return;
    const act: Activity = {
      id: Date.now().toString(),
      type: actType,
      text: newActivity.trim(),
      author: access?.full_name ?? 'Менеджер',
      createdAt: new Date().toLocaleString('ru-RU'),
    };
    setLead(l => ({ ...l, activities: [...l.activities, act] }));
    setNewActivity('');
  }

  function changeStage(s: DealStage) {
    const stageAct: Activity = {
      id: Date.now().toString(),
      type: 'stage_change',
      text: `Статус изменён: ${DEAL_STAGE_LABELS[lead.stage]} → ${DEAL_STAGE_LABELS[s]}`,
      author: access?.full_name ?? 'Менеджер',
      createdAt: new Date().toLocaleString('ru-RU'),
    };
    setLead(l => ({ ...l, stage: s, activities: [...l.activities, stageAct] }));
    setStageOpen(false);
  }

  const totalPrice = (lead.unitArea ?? 0) * (lead.unitPrice ?? 0);
  const paidSum = lead.paymentSchedule.filter(p => p.paid).reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/sales/pipeline')} className="text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{lead.clientName}</h1>
          <p className="text-sm text-slate-400 mt-0.5">Лид #{lead.id} · {lead.source} · {lead.manager}</p>
        </div>
        {/* Stage badge + changer */}
        <div className="relative">
          <button
            onClick={() => setStageOpen(!stageOpen)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${STAGE_COLORS[lead.stage]}`}
          >
            {DEAL_STAGE_LABELS[lead.stage]}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </button>
          {stageOpen && (
            <div className="absolute right-0 top-10 z-20 min-w-[180px] rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-1">
              {STAGES.filter(s => s !== lead.stage).map(s => (
                <button key={s} onClick={() => changeStage(s)} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white">
                  {DEAL_STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Client info + Unit */}
        <div className="space-y-4">
          {/* Client */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Клиент</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-white">
                <Phone className="h-4 w-4 text-slate-400" />{lead.phone}
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-white">
                  <Mail className="h-4 w-4 text-slate-400" />{lead.email}
                </div>
              )}
              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-700">
                <span>Менеджер</span><span className="text-white">{lead.manager}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Источник</span><span className="text-white">{lead.source}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Покупка</span><span className="text-white">{lead.purchaseMethod}</span>
              </div>
            </div>
          </div>

          {/* Unit preview */}
          {lead.interestedUnit && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Home className="h-4 w-4 text-sky-400" /> Квартира
              </h2>
              <div className="rounded-lg bg-sky-900/30 border border-sky-500/20 p-4">
                <div className="text-2xl font-bold text-sky-300">№{lead.interestedUnit}</div>
                {lead.unitArea && <div className="text-sm text-slate-400">{lead.unitArea} м² · 2-комн</div>}
                {lead.unitPrice && lead.unitArea && (
                  <div className="text-sm text-white mt-2 font-medium">{fmt(lead.unitArea * lead.unitPrice)}</div>
                )}
              </div>
              <button
                onClick={() => navigate('/sales/chessboard')}
                className="w-full text-xs text-sky-400 hover:text-sky-300 text-center"
              >
                Открыть в шахматке →
              </button>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">Заметка</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* CENTER: Activity timeline */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Активность</h2>

          {/* Timeline */}
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-1 mb-4">
            {lead.activities.map((a, i) => {
              const { icon: Icon, color } = ACTIVITY_ICON[a.type];
              return (
                <div key={a.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {i < lead.activities.length - 1 && <div className="flex-1 w-px bg-slate-700 mt-1" />}
                  </div>
                  <div className="pb-3 flex-1">
                    <p className="text-sm text-white leading-relaxed">{a.text}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.author} · {a.createdAt}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add activity */}
          <div className="border-t border-slate-700 pt-4 space-y-3">
            <div className="flex gap-2">
              {(['call','note','email','meeting'] as ActivityType[]).map(t => {
                const { icon: Icon, color } = ACTIVITY_ICON[t];
                return (
                  <button key={t} onClick={() => setActType(t)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition border ${actType === t ? 'bg-slate-700 border-sky-500 text-white' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                    <Icon className={`h-3.5 w-3.5 ${actType === t ? color : ''}`} />
                    {t === 'call' ? 'Звонок' : t === 'note' ? 'Заметка' : t === 'email' ? 'Email' : 'Встреча'}
                  </button>
                );
              })}
            </div>
            <textarea
              value={newActivity}
              onChange={e => setNewActivity(e.target.value)}
              rows={2}
              placeholder="Добавить запись…"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
            />
            <button onClick={addActivity} disabled={!newActivity.trim()} className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 py-2 text-sm font-medium text-white transition">
              <Plus className="h-4 w-4" /> Сохранить
            </button>
          </div>
        </div>

        {/* RIGHT: Financials + payment schedule */}
        <div className="space-y-4">
          {/* Deal summary */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Финансы сделки</h2>
            <div className="space-y-2 text-sm">
              {lead.budget && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Бюджет клиента</span>
                  <span className="text-white">{fmt(lead.budget)}</span>
                </div>
              )}
              {totalPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Прайс-лист</span>
                  <span className="text-white">{fmt(totalPrice)}</span>
                </div>
              )}
              {lead.agreedPrice && (
                <div className="flex justify-between border-t border-slate-700 pt-2">
                  <span className="text-slate-400 font-medium">Согласованная цена</span>
                  <span className="text-sky-400 font-bold">{fmt(lead.agreedPrice)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 hover:bg-slate-700 py-2 text-xs text-slate-300 transition">
                <FileText className="h-3.5 w-3.5" /> Создать КП
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 hover:bg-slate-700 py-2 text-xs text-slate-300 transition">
                <User className="h-3.5 w-3.5" /> Назначить
              </button>
            </div>
          </div>

          {/* Payment schedule */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">График оплат</h2>
              <span className="text-xs text-slate-400">Оплачено: {fmt(paidSum)}</span>
            </div>
            <div className="space-y-2">
              {lead.paymentSchedule.map(p => (
                <div key={p.id} className={`flex items-center gap-3 rounded-lg p-3 ${p.paid ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-slate-700/40 border border-slate-600/40'}`}>
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${p.paid ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                    {p.paid && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{p.label}</p>
                    <p className="text-xs text-slate-500">{p.dueDate}</p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${p.paid ? 'text-emerald-400' : 'text-white'}`}>
                    {fmt(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
