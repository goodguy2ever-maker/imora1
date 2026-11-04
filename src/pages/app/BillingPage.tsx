import { useAuth } from '@/context/useAuth';
import { useTeam } from '@/lib/hooks';
import { formatDate } from '@/lib/format';
import { Alert, Card, PageHeader, Spinner } from '@/components/ui';
export default function BillingPage() {
  const { access } = useAuth(); const { team, loading, error } = useTeam();
  return <div className="space-y-5"><PageHeader title="Доступ компании" description="Срок действия и лимит сотрудников" />
    <Card className="space-y-3 p-5"><p>Компания: {access?.company_name}</p><p>Статус: {access?.company_status}</p><p>Доступ до: {formatDate(access?.access_until)}</p>{loading ? <Spinner /> : <p>Активные сотрудники: {team.filter(m => m.status === 'active').length} из {access?.user_limit}</p>}{error && <Alert tone="error">{error}</Alert>}</Card>
    <Alert tone="info">Онлайн-оплата пока не подключена. Для продления доступа и изменения лимита обратитесь к администратору платформы. Реквизиты банковской карты в приложении не запрашиваются.</Alert>
  </div>;
}
