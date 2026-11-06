import { useEffect, useState } from 'react';
import { FolderKanban, CheckSquare, Package, Wallet, ClipboardList, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { Card, Spinner, PageHeader } from '@/components/ui';
import { formatMoney, formatDate, formatPercent, errorMessage } from '@/lib/format';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/labels';
import { canSeeConstructionFinance } from '@/lib/types';
import type { DashboardData } from '@/lib/types';

export default function DashboardPage() {
  const { access } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: raw, error: rpcError } = await supabase.rpc('company_dashboard');
      if (rpcError) {
        setError(errorMessage(rpcError));
      } else {
        setData(raw as DashboardData);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error || 'Не удалось загрузить данные дашборда.'}
      </div>
    );
  }

  const stats = [
    { icon: FolderKanban, label: 'Активные проекты', value: data.active_projects, tone: 'bg-sky-100 text-sky-700' },
    { icon: CheckSquare, label: 'Открытые задачи', value: data.open_tasks, tone: 'bg-amber-100 text-amber-700' },
    { icon: Package, label: 'Заявки на согласовании', value: data.pending_requests, tone: 'bg-violet-100 text-violet-700' },
  ];

  const canSeeFinance = access?.role ? canSeeConstructionFinance(access.role) : false;

  return (
    <div className="workspace-dashboard">
      <PageHeader title={`Здравствуйте, ${access?.full_name ?? ''}`} description="Сводка по компании на сегодня" />

      <div className="dashboard-stats grid gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="dashboard-stat p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tone}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className={`dashboard-overview mt-6 grid gap-6 ${canSeeFinance ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {canSeeFinance && (
          <Card className="dashboard-budget p-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-sky-700" aria-hidden />
              <h2 className="font-semibold text-white">Бюджет и расходы</h2>
            </div>
            {data.by_currency.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">Утверждённых смет и расходов пока нет.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {data.by_currency.map((row) => (
                  <div key={row.currency}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-slate-300">{row.currency}</span>
                      <span className="text-xs text-slate-400">Использовано {formatPercent(row.used_percent)}</span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between text-sm">
                      <span className="text-slate-400">Бюджет: {formatMoney(row.approved_budget, row.currency)}</span>
                      <span className="text-slate-400">Факт: {formatMoney(row.actual_expenses, row.currency)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          row.used_percent !== null && row.used_percent >= 100 ? 'bg-rose-500' : 'bg-sky-600'
                        }`}
                        style={{ width: `${Math.min(row.used_percent ?? 0, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Остаток: {formatMoney(row.remaining, row.currency)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card className="dashboard-reports p-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-700" aria-hidden />
            <h2 className="font-semibold text-white">Последние отчёты со стройплощадки</h2>
          </div>
          {data.recent_reports.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Отчётов пока нет.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.recent_reports.map((r) => (
                <li key={r.id} className="border-b border-slate-700/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">{r.project_name}</span>
                    <span className="text-xs text-slate-400">{formatDate(r.report_date)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{r.work_done}</p>
                  {r.author_name && <p className="mt-0.5 text-xs text-slate-400">{r.author_name}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {canSeeFinance && (
        <Card className="dashboard-expenses mt-6 p-6">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-sky-400" aria-hidden />
            <h2 className="font-semibold text-white">Последние расходы</h2>
          </div>
          {data.recent_expenses.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Расходов пока нет.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-slate-400">
                  <tr>
                    <th className="pb-2 pr-4 font-medium">Дата</th>
                    <th className="pb-2 pr-4 font-medium">Проект</th>
                    <th className="pb-2 pr-4 font-medium">Описание</th>
                    <th className="pb-2 pr-4 font-medium">Категория</th>
                    <th className="pb-2 text-right font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {data.recent_expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 pr-4 text-slate-400">{formatDate(e.expense_date)}</td>
                      <td className="py-2 pr-4 text-slate-300">{e.project_name}</td>
                      <td className="py-2 pr-4 text-slate-400">{e.description}</td>
                      <td className="py-2 pr-4 text-slate-400">{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</td>
                      <td className="py-2 text-right font-medium text-white">{formatMoney(e.amount, e.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
