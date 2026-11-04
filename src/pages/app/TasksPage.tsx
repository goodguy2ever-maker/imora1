import { useAuth } from '@/context/useAuth';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProjects, useTeam } from '@/lib/hooks';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td, Textarea } from '@/components/ui';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/labels';
import { formatDate, errorMessage } from '@/lib/format';
import type { Task } from '@/lib/types';

function statusTone(s: string) {
  return s === 'done' ? 'emerald' : s === 'in_progress' ? 'sky' : s === 'blocked' ? 'rose' : s === 'cancelled' ? 'slate' : 'amber';
}

export default function TasksPage() {
  const { access, session } = useAuth();
  const canAssign = access?.role === 'COMPANY_ADMIN' || access?.role === 'ENGINEER';
  const { projects, loading: projLoading } = useProjects();
  const { team, loading: teamLoading } = useTeam();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('normal');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('tasks').select('id,project_id,title,description,assignee_id,due_date,priority,status').order('created_at', { ascending: false });
    if (filterProject !== 'all') query = query.eq('project_id', filterProject);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    const { data, error: queryError } = await query;
    if (queryError) setError(errorMessage(queryError));
    else { setTasks((data as Task[]) ?? []); setError(''); }
    setLoading(false);
  }, [filterProject, filterStatus]);

  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const { error: insErr } = await supabase.from('tasks').insert({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        priority,
        status: 'todo',
      });
      if (insErr) throw insErr;
      setOpen(false);
      setTitle(''); setDescription(''); setProjectId(''); setAssigneeId(''); setDueDate(''); setPriority('normal');
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const { error: updErr } = await supabase.from('tasks').update({ status }).eq('id', id);
    if (updErr) setError(errorMessage(updErr));
    else await load();
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const teamMap = new Map(team.map((t) => [t.id, t]));
  const ready = !projLoading && !teamLoading;

  return (
    <div>
      <PageHeader
        title="Задачи"
        description="Все задачи по проектам"
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новая задача</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-auto">
          <option value="all">Все проекты</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-auto">
          <option value="all">Все статусы</option>
          {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {!ready || loading ? (
        <Spinner />
      ) : tasks.length === 0 ? (
        <Card><EmptyState title="Задач нет" description="Создайте первую задачу." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Новая задача</Button>} /></Card>
      ) : (
        <Card>
          <Table head={['Задача', 'Проект', 'Ответственный', 'Приоритет', 'Срок', 'Статус', '']}>
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-slate-800/60">
                <Td className="font-medium">{t.title}</Td>
                <Td>{projectMap.get(t.project_id)?.name ?? '—'}</Td>
                <Td>{t.assignee_id ? (teamMap.get(t.assignee_id)?.full_name ?? '—') : '—'}</Td>
                <Td><Badge tone={t.priority === 'urgent' ? 'rose' : t.priority === 'high' ? 'amber' : 'neutral'}>{TASK_PRIORITY_LABELS[t.priority]}</Badge></Td>
                <Td>{formatDate(t.due_date)}</Td>
                <Td><Badge tone={statusTone(t.status)}>{TASK_STATUS_LABELS[t.status]}</Badge></Td>
                <Td>
                  <Select value={t.status} onChange={(e) => void updateStatus(t.id, e.target.value)} className="w-auto py-1 text-xs">
                    {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal open={open} title="Новая задача" onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Отмена</Button><Button type="submit" form="task-form" loading={saving}>Создать</Button></>}>
        <form id="task-form" onSubmit={create} className="space-y-4">
          <Field label="Проект">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
              <option value="">Выберите проект</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Название"><Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} /></Field>
          <Field label="Описание"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Ответственный">
              <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Не назначен</option>
                {team.filter(m => m.status === 'active' && (canAssign || m.id === session?.user.id)).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Приоритет">
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Срок"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          </div>
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
