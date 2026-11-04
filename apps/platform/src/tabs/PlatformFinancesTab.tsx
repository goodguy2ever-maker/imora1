import { Alert, Card, PageHeader } from '@/components/ui';
export default function PlatformFinancesTab() {
  return <div className="space-y-5"><PageHeader title="Финансы платформы" description="Подключение расчётов с клиентами" /><Card className="p-5"><Alert tone="info">Учёт подписок и платёжный провайдер ещё не подключены. Доступ компаний изменяется вручную в разделе «Компании». Фиктивные платежи и показатели выручки удалены.</Alert></Card></div>;
}
