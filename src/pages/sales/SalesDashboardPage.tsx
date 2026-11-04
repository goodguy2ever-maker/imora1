import { useState, useEffect } from 'react';
import { useAuth } from '@/context/useAuth';
import { navigate } from '@/lib/router';
import { canAccessSalesCRM } from '@/lib/types';
import {
  Building2, TrendingUp, Users, Target, ChevronRight,
  Phone, MessageSquare, Plus, ArrowRight, BarChart2
} from 'lucide-react';

// Mock data — TODO: заменить на Supabase queries
const MOCK_KPI = {
  totalUnits: 120,
  freeUnits: 48,
  reservedUnits: 22,
  soldUnits: 50,
  planRevenue: 850_000_000,
  factRevenue: 412_500_000,
  leadsTotal: 87,
  leadsNew: 12,
};

const MOCK_ACTIVITIES = [
  { id: '1', time: '15:42', client: 'Алибек Сейтов', type: 'call', text: 'Звонок по квартире №304, секция A', manager: 'М. Иванова' },
  { id: '2', time: '14:15', client: 'Дана Нурова', type: 'note', text: 'Перенос показа на завтра, 11:00', manager: 'К. Асанов' },
  { id: '3', time: '13:00', client: 'Рустам Каримов', type: 'stage', text: 'Сделка перешла → Переговоры', manager: 'М. Иванова' },
  { id: '4', time: '11:30', client: 'Айгерим Бекова', type: 'call', text: 'Первичный контакт. Интерес: 2-комн, бюджет 45 млн', manager: 'К. Асанов' },
  { id: '5', time: '10:05', client: 'Сергей Попов', type: 'stage', text: 'Договор подписан — Оплата', manager: 'М. Иванова' },
];

// Mini chessboard: секция A, 5 этажей × 4 квартиры
const MINI_UNITS = Array.from({ length: 20 }, (_, i) => ({
  id: `A${i + 1}`,
  floor: Math.floor(i / 4) + 1,
  num: (i % 4) + 1,
  status: ['free', 'free', 'reserved', 'sold'][Math.floor(Math.random() * 4)] as string,
}));

const STATUS_COLOR: Record<string, string> = {
  free: 'bg-emerald-500',
  reserved: 'bg-amber-400',
  sold: 'bg-rose-500',
  not_for_sale: 'bg-slate-600',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс`;
  return String(n);
}

function ActivityIcon({ type }: { type: string }) {
  if (type === 'call') return <Phone className="h-3.5 w-3.5 text-sky-400" />;
  if (type === 'note') return <MessageSquare className="h-3.5 w-3.5 text-violet-400" />;
  return <ArrowRight className="h-3.5 w-3.5 text-amber-400" />;
}

export default function SalesDashboardPage() {
  const { access } = useAuth();
  const role = access?.role;

  useEffect(() => {
    if (role && !canAccessSalesCRM(role)) navigate('/app');
  }, [role]);

  if (!role || !canAccessSalesCRM(role)) return null;

  const pct = Math.round((MOCK_KPI.factRevenue / MOCK_KPI.planRevenue) * 100);

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Продажи — обзор</h1>
          <p className="text-sm text-slate-400 mt-0.5">Жилой комплекс IMORA 2.0 · Актуально на сегодня</p>
        </div>
        <button
          onClick={() => navigate('/sales/leads/new')}
          className="flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-white transition"
        >
          <Plus className="h-4 w-4" /> Новый лид
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Свободных квартир', value: MOCK_KPI.freeUnits, of: MOCK_KPI.totalUnits, icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'В резерве', value: MOCK_KPI.reservedUnits, of: MOCK_KPI.totalUnits, icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Продано', value: MOCK_KPI.soldUnits, of: MOCK_KPI.totalUnits, icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Активных лидов', value: MOCK_KPI.leadsTotal, sub: `+${MOCK_KPI.leadsNew} новых сегодня`, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map(({ label, value, of, sub, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
            <div className={`inline-flex rounded-lg p-2 ${bg} mb-3`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="text-3xl font-bold text-white">{value}</div>
            {of && <div className="text-xs text-slate-500">из {of} всего</div>}
            {sub && <div className="text-xs text-emerald-400">{sub}</div>}
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Revenue plan */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-sky-400" /> Выручка: план vs факт
          </h2>
          <span className="text-sm text-slate-400">{pct}% выполнения</span>
        </div>
        <div className="flex gap-4 text-sm mb-3">
          <span className="text-slate-400">План: <strong className="text-white">{fmt(MOCK_KPI.planRevenue)} ₸</strong></span>
          <span className="text-slate-400">Факт: <strong className="text-sky-400">{fmt(MOCK_KPI.factRevenue)} ₸</strong></span>
        </div>
        <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mini Chessboard */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Шахматка — Секция A</h2>
            <button
              onClick={() => navigate('/sales/chessboard')}
              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
            >
              Полная шахматка <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {/* Legend */}
          <div className="flex gap-4 mb-3 text-xs text-slate-400">
            {[['free','Свободна'],['reserved','Резерв'],['sold','Продана']].map(([s,l]) => (
              <span key={s} className="flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-sm ${STATUS_COLOR[s]}`} />{l}
              </span>
            ))}
          </div>
          {/* Grid: floors top→bottom */}
          <div className="space-y-1">
            {[5,4,3,2,1].map(floor => (
              <div key={floor} className="flex items-center gap-1">
                <span className="text-xs text-slate-500 w-6 text-right">{floor}Э</span>
                {MINI_UNITS.filter(u => u.floor === floor).map(u => (
                  <div
                    key={u.id}
                    title={`${u.id} — ${u.status}`}
                    className={`h-8 flex-1 rounded cursor-pointer opacity-80 hover:opacity-100 transition ${STATUS_COLOR[u.status] ?? 'bg-slate-600'}`}
                    onClick={() => navigate('/sales/chessboard')}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Активность сегодня</h2>
            <button
              onClick={() => navigate('/sales/pipeline')}
              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
            >
              Воронка <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-3">
            {MOCK_ACTIVITIES.map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 mt-0.5">
                  <ActivityIcon type={a.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.client}</p>
                  <p className="text-xs text-slate-400 truncate">{a.text}</p>
                  <p className="text-xs text-slate-500">{a.manager} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
