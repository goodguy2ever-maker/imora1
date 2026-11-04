import { useEffect } from 'react';
import { useAuth } from '@/context/useAuth';
import { navigate } from '@/lib/router';
import { canAccessSalesCRM } from '@/lib/types';
import { BarChart2, TrendingUp, Users, ArrowDown, Award } from 'lucide-react';

// TODO: fetch from Supabase analytics queries
const MONTHS = ['Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя'];
const PLAN = [60, 65, 70, 75, 80, 85];   // млн ₸
const FACT = [52, 61, 68, 70, 72, 41];   // млн ₸ (ноябрь — неполный)

const FUNNEL = [
  { stage: 'Новые лиды',  count: 87, color: 'bg-sky-500' },
  { stage: 'Квалификация',count: 61, color: 'bg-violet-500' },
  { stage: 'Показ',       count: 43, color: 'bg-amber-500' },
  { stage: 'Переговоры',  count: 28, color: 'bg-orange-500' },
  { stage: 'Резерв',      count: 18, color: 'bg-teal-500' },
  { stage: 'Договор',     count: 12, color: 'bg-emerald-500' },
  { stage: 'Оплата',      count: 8,  color: 'bg-green-500' },
];

const MANAGERS = [
  { name: 'М. Иванова',      sold: 28, revenue: 182_000_000, calls: 156, conversion: 34 },
  { name: 'К. Асанов',       sold: 16, revenue: 104_000_000, calls: 128, conversion: 28 },
  { name: 'Б. Жаксыбеков',   sold: 6,  revenue: 36_000_000,  calls: 95,  conversion: 18 },
];

const UNIT_TYPES = [
  { label: 'Студия',  pct: 12, color: 'bg-sky-500' },
  { label: '1-комн',  pct: 28, color: 'bg-violet-500' },
  { label: '2-комн',  pct: 38, color: 'bg-amber-500' },
  { label: '3-комн',  pct: 22, color: 'bg-emerald-500' },
];

function fmt(n: number) { return `${(n / 1_000_000).toFixed(1)} млн`; }

export default function SalesAnalyticsPage() {
  const { access } = useAuth();
  const role = access?.role;

  useEffect(() => {
    if (role) {
      if (!canAccessSalesCRM(role)) { navigate('/app'); return; }
      if (role === 'SALES_MANAGER') { navigate('/sales'); return; } // Managers see summary, not analytics
    }
  }, [role]);

  if (!role || !canAccessSalesCRM(role) || role === 'SALES_MANAGER') return null;

  const maxBar = Math.max(...PLAN, ...FACT);
  const funnelMax = FUNNEL[0].count;
  const totalRevenue = FACT.reduce((a,b) => a+b, 0);
  const totalPlan = PLAN.reduce((a,b) => a+b, 0);

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-sky-400" /> Аналитика продаж
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">ЖК IMORA 2.0 · Июнь–Ноябрь 2026</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Выручка (факт)', value: `${fmt(totalRevenue * 1_000_000)} ₸`, sub: `план ${fmt(totalPlan * 1_000_000)} ₸`, color: 'text-sky-400' },
          { label: 'Выполнение', value: `${Math.round((totalRevenue/totalPlan)*100)}%`, sub: 'от годового плана', color: 'text-emerald-400' },
          { label: 'Продано квартир', value: '50', sub: 'из 120 всего', color: 'text-violet-400' },
          { label: 'Конверсия', value: '9.2%', sub: 'лид → продажа', color: 'text-amber-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1">{sub}</div>
            <div className="text-xs text-slate-400 mt-2">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart: Plan vs Fact */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
          <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-sky-400" /> Выручка: план vs факт (млн ₸)
          </h2>
          <div className="flex gap-4 text-xs text-slate-400 mb-5">
            <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-sky-500/40 inline-block" /> План</span>
            <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-sky-500 inline-block" /> Факт</span>
          </div>
          <div className="flex items-end gap-3 h-40">
            {MONTHS.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-1 h-32">
                  <div
                    className="flex-1 rounded-t bg-sky-500/30"
                    style={{ height: `${(PLAN[i] / maxBar) * 100}%` }}
                    title={`План: ${PLAN[i]} млн`}
                  />
                  <div
                    className="flex-1 rounded-t bg-sky-500"
                    style={{ height: `${(FACT[i] / maxBar) * 100}%` }}
                    title={`Факт: ${FACT[i]} млн`}
                  />
                </div>
                <span className="text-xs text-slate-500">{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-violet-400" /> Воронка конверсии
          </h2>
          <div className="space-y-2">
            {FUNNEL.map((f, i) => {
              const pct = Math.round((f.count / funnelMax) * 100);
              const conv = i > 0 ? Math.round((f.count / FUNNEL[i-1].count) * 100) : 100;
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-xs text-slate-400 text-right">{f.stage}</div>
                  <div className="flex-1 h-6 rounded bg-slate-700 overflow-hidden">
                    <div className={`h-full rounded ${f.color} transition-all flex items-center px-2`} style={{ width: `${pct}%` }}>
                      <span className="text-xs font-bold text-white">{f.count}</span>
                    </div>
                  </div>
                  {i > 0 && <span className="text-xs text-slate-500 w-10 shrink-0">{conv}%</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manager leaderboard */}
        <div className="lg:col-span-2 rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" /> Рейтинг менеджеров
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Менеджер</th>
                  <th className="pb-2 font-medium text-right">Продано</th>
                  <th className="pb-2 font-medium text-right">Выручка</th>
                  <th className="pb-2 font-medium text-right">Звонки</th>
                  <th className="pb-2 font-medium text-right">Конверсия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {MANAGERS.map((m, i) => (
                  <tr key={m.name} className="hover:bg-slate-700/30 transition">
                    <td className="py-3 pr-3">
                      <span className={`text-sm font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : 'text-amber-700'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-white">{m.name}</td>
                    <td className="py-3 text-right text-slate-300">{m.sold} кв.</td>
                    <td className="py-3 text-right text-sky-400 font-medium">{fmt(m.revenue)} ₸</td>
                    <td className="py-3 text-right text-slate-400">{m.calls}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${m.conversion >= 30 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {m.conversion}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unit types donut (CSS-based) */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" /> Продажи по типам
          </h2>
          <div className="space-y-3">
            {UNIT_TYPES.map(t => (
              <div key={t.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{t.label}</span>
                  <span className="text-slate-400">{t.pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full ${t.color}`} style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 text-xs text-slate-500">
            <p>Самый продаваемый тип: <strong className="text-amber-400">2-комн (38%)</strong></p>
            <p>Средняя цена продажи: <strong className="text-white">28.4 млн ₸</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
