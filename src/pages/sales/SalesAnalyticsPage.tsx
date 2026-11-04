import { useSalesData, salesTotals, STAGES } from '@/lib/sales';
import { DEAL_STAGE_LABELS } from '@/lib/labels';
import { formatMoney } from '@/lib/format';
import { Alert, Card, EmptyState, PageHeader, Spinner } from '@/components/ui';
export default function SalesAnalyticsPage() {
  const { data, loading, error, access } = useSalesData();
  if (access?.role !== 'COMPANY_ADMIN' && access?.role !== 'SALES_LEAD') return <Alert tone="info">Аналитика доступна руководителю продаж и администратору компании.</Alert>;
  if (loading) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  return <div className="space-y-5"><PageHeader title="Аналитика продаж" description="Текущее распределение сделок. План выручки не задан." />
    <div className="grid gap-3 sm:grid-cols-2">{salesTotals(data).map(t => <Card key={t.currency} className="space-y-2 p-5"><h2>{t.currency}</h2><p>Согласовано по договорам: {formatMoney(t.agreed,t.currency)}</p><p>Плановые платежи: {formatMoney(t.scheduled,t.currency)}</p><p>Полученные суммы: {formatMoney(t.received,t.currency)}</p><p>Остаток по графику: {formatMoney(t.scheduled-t.received,t.currency)}</p></Card>)}</div>
    <Card className="space-y-3 p-5"><h2 className="font-semibold">Сделки по текущей стадии</h2>{STAGES.map(s => <div key={s}><p>{DEAL_STAGE_LABELS[s]}: {data.leads.filter(l => l.stage === s).length}</p><progress className="w-full accent-sky-500" aria-label={DEAL_STAGE_LABELS[s]} max={Math.max(data.leads.length,1)} value={data.leads.filter(l => l.stage === s).length} /></div>)}</Card>
    <Card className="space-y-3 p-5"><h2 className="font-semibold">Менеджеры</h2>{data.members.filter(m => ['SALES_MANAGER','SALES_LEAD','COMPANY_ADMIN'].includes(m.role)).map(m => <div key={m.id}><strong>{m.full_name}</strong><p>Лидов: {data.leads.filter(l => l.manager_id === m.id).length} · На стадии оплаты: {data.leads.filter(l => l.manager_id === m.id && l.stage === 'payment').length}</p>{salesTotals({ ...data, leads: data.leads.filter(l => l.manager_id === m.id), payments: data.payments.filter(p => data.leads.some(l => l.id === p.lead_id && l.manager_id === m.id)) }).map(t => <p key={t.currency} className="text-sm text-slate-400">Получено: {formatMoney(t.received,t.currency)}</p>)}</div>)}</Card>
    {!data.leads.length && <EmptyState title="Данных для анализа пока нет" />}
  </div>;
}
