import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Ruler } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { navigate } from '@/lib/router';
import Link from '@/components/Link';
import { Alert, Button, Card, EmptyState, Field, Input, Modal, Spinner } from '@/components/ui';
import { errorMessage, formatDate } from '@/lib/format';
import type { DrawingSummary } from '@/lib/types';

export default function ProjectDrawings({ projectId, isAdmin }: { projectId: string; isAdmin: boolean }) {
  const { access } = useAuth();
  const [drawings, setDrawings] = useState<DrawingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error: qErr } = await supabase
        .from('drawings')
        .select('id,name,updated_at')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });
      if (!active) return;
      if (qErr) setError(errorMessage(qErr));
      else { setDrawings((data as DrawingSummary[]) ?? []); setError(''); }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [projectId]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!access?.company_id) return;
    setFormError('');
    setSaving(true);
    try {
      const { data, error: insErr } = await supabase
        .from('drawings')
        .insert({ company_id: access.company_id, project_id: projectId, name: name.trim() })
        .select('id')
        .single();
      if (insErr) throw insErr;
      navigate(`/app/drawings/${(data as { id: string }).id}`);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-sky-400" aria-hidden />
          <h2 className="font-semibold text-white">Архитектурные чертежи</h2>
        </div>
        {isAdmin && (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Новый чертёж
          </Button>
        )}
      </div>

      {error && <div className="p-5"><Alert tone="error">{error}</Alert></div>}

      {loading ? (
        <Spinner />
      ) : drawings.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Чертежей пока нет"
          description={isAdmin ? 'Создайте план этажа из стен и подписей прямо в системе.' : 'Администратор добавит чертежи проекта.'}
        />
      ) : (
        <ul className="divide-y divide-slate-700/40">
          {drawings.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium text-slate-100">{d.name}</p>
                <p className="text-xs text-slate-500">Обновлён {formatDate(d.updated_at)}</p>
              </div>
              <Link
                to={`/app/drawings/${d.id}`}
                className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-inset ring-slate-600 hover:bg-slate-700 hover:text-white"
              >
                Открыть
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        title="Новый чертёж"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" form="new-drawing-form" loading={saving}>Создать</Button>
          </>
        }
      >
        <form id="new-drawing-form" onSubmit={create} className="space-y-4">
          <Field label="Название чертежа">
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} placeholder="План первого этажа" />
          </Field>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>
    </Card>
  );
}
