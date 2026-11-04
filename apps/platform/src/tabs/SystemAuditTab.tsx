import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, Card, EmptyState, Spinner, Table, Td } from '@/components/ui';
import { errorMessage } from '@/lib/format';

export default function SystemAuditTab() {
  const [items, setItems] = useState<
    {
      id: number;
      actor_id: string | null;
      company_id: string | null;
      action: string;
      target_type: string;
      target_id: string | null;
      details: Record<string, unknown>;
      created_at: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: qErr } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (qErr) {
        setError(errorMessage(qErr));
      } else {
        setItems(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-sky-400" />
          Журнал аудита действий платформы
        </h2>
        <p className="mt-1 text-xs text-slate-300">
          Фиксация всех критических операций: создание компаний, изменение смет, утверждение заявок и управление ролями.
        </p>
      </div>

      {loading ? (
        <Card className="p-8 text-center"><Spinner label="Загружаем аудит..." /></Card>
      ) : error ? (
        <Alert tone="error">{error}</Alert>
      ) : items.length === 0 ? (
        <Card><EmptyState title="Записей аудита пока нет" /></Card>
      ) : (
        <Card className="overflow-hidden border-slate-800">
          <Table head={['Время', 'Действие', 'Объект', 'ID объекта', 'Детали события']}>
            {items.map((l) => (
              <tr key={l.id} className="hover:bg-slate-900/40 transition">
                <Td className="font-mono text-xs text-slate-400">
                  {new Date(l.created_at).toLocaleString('ru-RU')}
                </Td>
                <Td>
                  <span className="rounded bg-sky-950/80 px-2 py-0.5 font-mono text-xs font-semibold text-sky-300 border border-sky-800/60">
                    {l.action}
                  </span>
                </Td>
                <Td className="text-xs text-slate-300 font-medium">{l.target_type}</Td>
                <Td className="font-mono text-xs text-slate-500">
                  {l.target_id ? l.target_id.slice(0, 8) + '…' : '—'}
                </Td>
                <Td className="font-mono text-xs text-slate-400 max-w-xs truncate">
                  {JSON.stringify(l.details)}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
