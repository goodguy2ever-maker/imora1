import { useSalesData, salesTotals, STAGES } from '@/lib/sales';
import { DEAL_STAGE_LABELS } from '@/lib/labels';
import { formatMoney, formatDate } from '@/lib/format';
import { navigate } from '@/lib/router';
import { Alert, Button, Card, EmptyState, PageHeader, Spinner } from '@/components/ui';
export default function SalesDashboardPage() {
  const { data, loading, error } = useSalesData();
  if (loading) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  return <div className="space-y-5"><PageHeader title="Продажи — обзор" description="Данные доступных вам сделок и объектов" actions={<Button onClick={() => navigate('/sales/leads/new')}>Новый лид</Button>} />
    <div className="grid gap-3 sm:grid-cols-4">{[['Свободные объекты',data.units.filter(u => u.status === 'free').length],['В резерве',data.units.filter(u => u.status === 'reserved').length],['Проданные объекты',data.units.filter(u => u.status === 'sold').length],['Активные лиды',data.leads.filter(l => l.stage !== 'lost' && l.stage !== 'payment').length]].map(([label,n]) => <Card key={label} className="p-5"><p className="text-2xl font-bold">{n}</p><p className="text-sm text-slate-400">{label}</p></Card>)}</div>
    <Card className="space-y-3 p-5"><h2 className="font-semibold">Суммы по валютам</h2>{salesTotals(data).map(t => <p key={t.currency}>{t.currency}: согласовано по договорам {formatMoney(t.agreed,t.currency)}, запланировано платежей {formatMoney(t.scheduled,t.currency)}, получено {formatMoney(t.received,t.currency)}</p>)}{!salesTotals(data).length && <p className="text-slate-400">Договоров и платежей пока нет.</p>}</Card>
    <Card className="flex flex-wrap gap-3 p-5">{STAGES.map(s => <Button key={s} variant="secondary" onClick={() => navigate('/sales/leads')}>{DEAL_STAGE_LABELS[s]}: {data.leads.filter(l => l.stage === s).length}</Button>)}</Card>
    <Card className="space-y-3 p-5"><h2 className="font-semibold">Последние контакты</h2>{[...data.activities].sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,10).map(a => <button key={a.id} className="block text-left text-sm text-sky-300" onClick={() => navigate(`/sales/leads/${a.lead_id}`)}>{formatDate(a.created_at)} · {data.leads.find(l => l.id === a.lead_id)?.client_name} · {a.text}</button>)}{!data.activities.length && <EmptyState title="Контактов пока нет" />}</Card>
  </div>;
}
