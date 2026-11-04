import { canEditEstimates } from '@/lib/types';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Plus, CheckCircle2, Copy, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { useProjects } from '@/lib/hooks';
import Link from '@/components/Link';
import ProjectDrawings from '@/components/ProjectDrawings';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td } from '@/components/ui';
import { PROJECT_STATUS_LABELS, CURRENCIES, UNITS } from '@/lib/labels';
import { formatMoney, formatDate, errorMessage } from '@/lib/format';
import type { EstimateVersion, EstimateLine, Project } from '@/lib/types';

function statusTone(s: string) {
  return s === 'approved' ? 'emerald' : s === 'archived' ? 'slate' : 'amber';
}

type LineDraft = { id: string | null; position: number; name: string; unit: string; quantity: string; unit_price: string };

function emptyLine(position: number): LineDraft {
  return { id: null, position, name: '', unit: 'шт', quantity: '1', unit_price: '0' };
}

export default function ProjectDetailPage({ projectId }: { projectId: string }) {
  const { access } = useAuth();
  const { projects, loading: projLoading, reload: reloadProjects } = useProjects();
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<EstimateVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [lines, setLines] = useState<EstimateLine[]>([]);
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [lineModal, setLineModal] = useState(false);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  const isAdmin = access?.role === 'COMPANY_ADMIN';
  const canEstimate = !!access?.role && canEditEstimates(access.role);

  useEffect(() => {
    const p = projects.find((x) => x.id === projectId) ?? null;
    setProject(p);
  }, [projects, projectId]);

  const loadVersions = useCallback(async () => {
    if (!canEstimate) { setVersions([]); setLoadingVersions(false); return; }
    setLoadingVersions(true);
    const { data, error } = await supabase
      .from('estimate_versions')
      .select('id,project_id,version_number,title,status,approved_at')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false });
    if (!error && data) {
      const list = data as EstimateVersion[];
      setVersions(list);
      setActiveVersionId(current => list.some(v => v.id === current) ? current : list[0]?.id ?? null);
    }
    setLoadingVersions(false);
  }, [canEstimate, projectId]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  async function loadLines(versionId: string) {
    setLoadingLines(true);
    const { data, error } = await supabase
      .from('estimate_lines')
      .select('id,version_id,position,name,unit,quantity,unit_price,line_total')
      .eq('version_id', versionId)
      .order('position', { ascending: true });
    if (!error && data) setLines(data as EstimateLine[]);
    setLoadingLines(false);
  }

  useEffect(() => {
    if (activeVersionId) void loadLines(activeVersionId);
    else setLines([]);
  }, [activeVersionId]);

  const activeVersion = versions.find((v) => v.id === activeVersionId) ?? null;
  const isDraft = activeVersion?.status === 'draft';
  const lineTotalSum = lines.reduce((sum, l) => sum + Number(l.line_total), 0);
  const nextPosition = lines.reduce((max, l) => Math.max(max, l.position), 0) + 1;

  async function createVersion(copyFrom?: string) {
    setActionError('');
    setActing(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_estimate_version', {
        p_project_id: projectId,
        p_copy_from: copyFrom ?? null,
      });
      if (rpcError) throw rpcError;
      await loadVersions();
      setActiveVersionId(data as string);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function approveVersion() {
    setActionError('');
    setActing(true);
    try {
      const { error: rpcError } = await supabase.rpc('approve_estimate_version', { p_version_id: activeVersionId });
      if (rpcError) throw rpcError;
      await loadVersions();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function saveLines() {
    if (!activeVersionId) return;
    const rows = lineDrafts.map((d) => ({
      id: d.id,
      position: d.position,
      name: d.name.trim(),
      unit: d.unit.trim(),
      quantity: parseFloat(d.quantity),
      unit_price: parseFloat(d.unit_price),
    }));
    if (rows.some((r) => !r.name)) { setActionError('Укажите наименование каждой строки'); return; }
    if (rows.some((r) => !(r.quantity > 0))) { setActionError('Количество должно быть больше нуля'); return; }
    if (rows.some((r) => !(r.unit_price >= 0))) { setActionError('Цена за единицу не может быть отрицательной'); return; }
    setActionError('');
    setActing(true);
    try {
      for (const { id, ...fields } of rows) {
        if (id) {
          const { error: updErr } = await supabase.from('estimate_lines').update(fields).eq('id', id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from('estimate_lines').insert({ ...fields, version_id: activeVersionId });
          if (insErr) throw insErr;
        }
      }
      setLineDrafts([]);
      setLineModal(false);
      await loadLines(activeVersionId);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function deleteLine(id: string) {
    setActionError('');
    try {
      const { error: delErr } = await supabase.from('estimate_lines').delete().eq('id', id);
      if (delErr) throw delErr;
      if (activeVersionId) await loadLines(activeVersionId);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function updateProjectStatus(status: string) {
    setActionError('');
    setActing(true);
    try {
      const { error: updErr } = await supabase.from('projects').update({ status }).eq('id', projectId);
      if (updErr) throw updErr;
      await reloadProjects();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function saveProjectEdit(form: FormData) {
    setActionError('');
    setActing(true);
    try {
      const { error: updErr } = await supabase.from('projects').update({
        name: String(form.get('name') || '').trim(),
        address: String(form.get('address') || '').trim() || null,
        client_name: String(form.get('client_name') || '').trim() || null,
        currency: String(form.get('currency') || 'RUB'),
        status: String(form.get('status') || 'planning'),
        start_date: String(form.get('start_date') || '') || null,
        end_date: String(form.get('end_date') || '') || null,
      }).eq('id', projectId);
      if (updErr) throw updErr;
      await reloadProjects();
      setEditOpen(false);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setActing(false);
    }
  }

  if (projLoading) return <Spinner />;
  if (!project) return <Alert tone="error">Проект не найден или у вас нет к нему доступа.</Alert>;

  return (
    <div>
      <Link to="/app/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Все проекты
      </Link>

      <PageHeader
        title={project.name}
        description={`${project.client_name ?? 'Без клиента'} · ${project.currency}`}
        actions={
          <>
            <Badge tone={statusTone(project.status)}>{PROJECT_STATUS_LABELS[project.status] ?? project.status}</Badge>
            {isAdmin && (
              <>
                <Select
                  value={project.status}
                  onChange={(e) => void updateProjectStatus(e.target.value)}
                  className="w-auto"
                  disabled={acting}
                >
                  {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>Редактировать</Button>
              </>
            )}
          </>
        }
      />

      {actionError && <div className="mb-4"><Alert tone="error">{actionError}</Alert></div>}

      <Card className="mb-6 p-5">
        <dl className="grid gap-4 sm:grid-cols-4">
          <div><dt className="text-xs text-slate-400">Адрес</dt><dd className="mt-0.5 text-sm text-slate-200">{project.address || '—'}</dd></div>
          <div><dt className="text-xs text-slate-400">Начало</dt><dd className="mt-0.5 text-sm text-slate-200">{formatDate(project.start_date)}</dd></div>
          <div><dt className="text-xs text-slate-400">Окончание</dt><dd className="mt-0.5 text-sm text-slate-200">{formatDate(project.end_date)}</dd></div>
          <div><dt className="text-xs text-slate-400">Описание</dt><dd className="mt-0.5 text-sm text-slate-200">{project.description || '—'}</dd></div>
        </dl>
      </Card>

      {canEstimate && <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-white">Сметы</h2>
            {versions.length > 0 && (
              <Select value={activeVersionId ?? ''} onChange={(e) => setActiveVersionId(e.target.value)} className="w-auto">
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} (№{v.version_number}) — {v.status === 'approved' ? 'утверждена' : v.status === 'archived' ? 'в архиве' : 'черновик'}
                  </option>
                ))}
              </Select>
            )}
          </div>
          {canEstimate && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => void createVersion(activeVersionId ?? undefined)} loading={acting}>
                <Copy className="h-4 w-4" /> Копировать версию
              </Button>
              {(!versions.length || !isDraft) && (
                <Button variant="secondary" onClick={() => void createVersion()} loading={acting}>
                  <Plus className="h-4 w-4" /> Новая версия
                </Button>
              )}
            </div>
          )}
        </div>

        {loadingVersions ? (
          <Spinner />
        ) : !activeVersion ? (
          <EmptyState title="Версий смет пока нет" description={canEstimate ? 'Создайте первую версию сметы.' : 'Администратор создаст сметы.'} />
        ) : (
          <div>
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <Badge tone={statusTone(activeVersion.status)}>
                  {activeVersion.status === 'approved' ? 'Утверждена' : activeVersion.status === 'archived' ? 'Архив' : 'Черновик'}
                </Badge>
                {activeVersion.approved_at && <span className="text-xs text-slate-400">{formatDate(activeVersion.approved_at)}</span>}
              </div>
              {canEstimate && isDraft && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setLineDrafts([emptyLine(nextPosition)]); setLineModal(true); }}>
                    <Plus className="h-4 w-4" /> Добавить строку
                  </Button>
                  <Button disabled={!isAdmin} onClick={() => void approveVersion()} loading={acting}>
                    <CheckCircle2 className="h-4 w-4" /> Утвердить
                  </Button>
                </div>
              )}
            </div>

            {loadingLines ? (
              <Spinner />
            ) : lines.length === 0 ? (
              <EmptyState title="Строк нет" description={isDraft && canEstimate ? 'Добавьте позиции в смету.' : 'В этой версии нет позиций.'} />
            ) : (
              <>
                <Table head={['№', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Сумма', '']}>
                  {lines.map((l, idx) => (
                    <tr key={l.id}>
                      <Td>{idx + 1}</Td>
                      <Td className="font-medium">{l.name}</Td>
                      <Td>{l.unit}</Td>
                      <Td>{Number(l.quantity)}</Td>
                      <Td>{formatMoney(l.unit_price, project.currency)}</Td>
                      <Td className="font-semibold">{formatMoney(l.line_total, project.currency)}</Td>
                      <Td>
                        {canEstimate && isDraft && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => { setLineDrafts([{ id: l.id, position: l.position, name: l.name, unit: l.unit, quantity: String(l.quantity), unit_price: String(l.unit_price) }]); setLineModal(true); }}
                              className="text-slate-400 hover:text-sky-400"
                              aria-label="Редактировать строку"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => void deleteLine(l.id)} className="text-slate-400 hover:text-rose-400" aria-label="Удалить строку">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </Table>
                <div className="flex justify-end border-t border-slate-700/60 px-5 py-3">
                  <span className="text-sm font-bold text-white">Итого: {formatMoney(lineTotalSum, project.currency)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>}

      <div className="mt-6">
        {canEstimate && <ProjectDrawings projectId={projectId} isAdmin={canEstimate} />}
      </div>

      <Modal open={lineModal} title="Строки сметы" onClose={() => setLineModal(false)}
        footer={<><Button variant="secondary" onClick={() => setLineModal(false)}>Отмена</Button><Button onClick={() => void saveLines()} loading={acting}>Сохранить</Button></>}
      >
        <div className="space-y-3">
          {lineDrafts.map((d, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-4">
              <Input className="sm:col-span-2" placeholder="Наименование" value={d.name} onChange={(e) => { const c = [...lineDrafts]; c[i] = { ...d, name: e.target.value }; setLineDrafts(c); }} />
              <Select value={d.unit} onChange={(e) => { const c = [...lineDrafts]; c[i] = { ...d, unit: e.target.value }; setLineDrafts(c); }}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
              <Input type="number" step="0.001" placeholder="Кол-во" value={d.quantity} onChange={(e) => { const c = [...lineDrafts]; c[i] = { ...d, quantity: e.target.value }; setLineDrafts(c); }} />
              <Input type="number" step="0.01" placeholder="Цена за ед." value={d.unit_price} onChange={(e) => { const c = [...lineDrafts]; c[i] = { ...d, unit_price: e.target.value }; setLineDrafts(c); }} />
            </div>
          ))}
          <Button variant="ghost" onClick={() => setLineDrafts([...lineDrafts, emptyLine(nextPosition + lineDrafts.length)])}><Plus className="h-4 w-4" /> Ещё строку</Button>
          {actionError && <Alert tone="error">{actionError}</Alert>}
        </div>
      </Modal>

      <Modal open={editOpen} title="Редактировать проект" onClose={() => setEditOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setEditOpen(false)}>Отмена</Button></>}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void saveProjectEdit(new FormData(e.currentTarget)); }}>
          <Field label="Название"><Input name="name" defaultValue={project.name} required maxLength={160} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Клиент"><Input name="client_name" defaultValue={project.client_name ?? ''} maxLength={160} /></Field>
            <Field label="Валюта">
              <Select name="currency" defaultValue={project.currency}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Адрес"><Input name="address" defaultValue={project.address ?? ''} maxLength={240} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Дата начала"><Input type="date" name="start_date" defaultValue={project.start_date ?? ''} /></Field>
            <Field label="Дата окончания"><Input type="date" name="end_date" defaultValue={project.end_date ?? ''} /></Field>
          </div>
          <Field label="Статус">
            <Select name="status" defaultValue={project.status}>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Button type="submit" loading={acting}>Сохранить</Button>
          {actionError && <Alert tone="error">{actionError}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
