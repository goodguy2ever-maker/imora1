import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProjects } from '@/lib/hooks';
import { Alert, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from '@/components/ui';
import { formatDate, errorMessage, todayIso } from '@/lib/format';
import type { DailyReport } from '@/lib/types';

export default function ReportsPage() {
  const { projects, loading: projLoading } = useProjects();
  const [items, setItems] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [reportDate, setReportDate] = useState(todayIso());
  const [workDone, setWorkDone] = useState('');
  const [issues, setIssues] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('daily_reports')
      .select('id,project_id,report_date,work_done,issues,next_steps,created_by')
      .order('report_date', { ascending: false });
    if (filterProject !== 'all') query = query.eq('project_id', filterProject);
    const { data, error: qErr } = await query;
    if (qErr) setError(errorMessage(qErr));
    else { setItems((data as DailyReport[]) ?? []); setError(''); }
    setLoading(false);
  }, [filterProject]);

  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const { error: insErr } = await supabase.from('daily_reports').insert({
        project_id: projectId,
        report_date: reportDate,
        work_done: workDone.trim(),
        issues: issues.trim() || null,
        next_steps: nextSteps.trim() || null,
      });
      if (insErr) throw insErr;
      setOpen(false);
      setProjectId(''); setReportDate(todayIso()); setWorkDone(''); setIssues(''); setNextSteps('');
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const { error: delErr } = await supabase.from('daily_reports').delete().eq('id', id);
    if (delErr) setError(errorMessage(delErr));
    else await load();
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div>
      <PageHeader
        title="Ежедневные отчёты"
        description="Что сделано на объекте за день"
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новый отчёт</Button>}
      />

      <div className="mb-4">
        <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-auto">
          <option value="all">Все проекты</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {projLoading || loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><EmptyState title="Отчётов нет" description="Создайте первый ежедневный отчёт." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новый отчёт</Button>} /></Card>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-semibold text-white">{projectMap.get(r.project_id)?.name ?? 'Проект'}</span>
                  <span className="ml-2 text-xs text-slate-400">{formatDate(r.report_date)}</span>
                </div>
                <button onClick={() => void remove(r.id)} className="text-slate-400 hover:text-rose-600" aria-label="Удалить">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div><span className="font-medium text-slate-300">Выполнено: </span><span className="text-slate-400">{r.work_done}</span></div>
                {r.issues && <div><span className="font-medium text-slate-300">Проблемы: </span><span className="text-slate-400">{r.issues}</span></div>}
                {r.next_steps && <div><span className="font-medium text-slate-300">Дальнейшие шаги: </span><span className="text-slate-400">{r.next_steps}</span></div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} title="Новый отчёт" onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Отмена</Button><Button onClick={create} loading={saving}>Создать</Button></>}>
        <form onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Проект">
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                <option value="">Выберите проект</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Дата"><Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required /></Field>
          </div>
          <Field label="Выполненные работы"><Textarea value={workDone} onChange={(e) => setWorkDone(e.target.value)} required maxLength={4000} rows={4} /></Field>
          <Field label="Проблемы и риски"><Textarea value={issues} onChange={(e) => setIssues(e.target.value)} maxLength={4000} rows={2} /></Field>
          <Field label="Дальнейшие шаги"><Textarea value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} maxLength={4000} rows={2} /></Field>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
