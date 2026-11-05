import { useState, type FormEvent } from 'react';
import { Plus, KeyRound, Users as UsersIcon } from 'lucide-react';
import { useTeam } from '@/lib/hooks';
import { useAuth } from '@/context/useAuth';
import { callManageUsers } from '@/lib/manageUsers';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td } from '@/components/ui';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/labels';
import { sendTeamMemberInviteEmail } from '@/lib/emailService';
import { errorMessage } from '@/lib/format';
import type { Profile, Role } from '@/lib/types';

export default function TeamPage() {
  const { access, session } = useAuth();
  const { team, loading, error, reload } = useTeam();
  const selfId = session?.user.id;
  const [rowError, setRowError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<Profile | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [newPassword, setNewPassword] = useState('');

  const isAdmin = access?.role === 'COMPANY_ADMIN';
  const activeCount = team.filter((t) => t.status === 'active').length;
  const limit = access?.user_limit ?? 0;

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await callManageUsers({
        action: 'create_team_member',
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        position: position.trim() || undefined,
        role,
      });

      // Send email invitation to the new team member
      try {
        await sendTeamMemberInviteEmail({
          to: email.trim(),
          memberName: fullName.trim(),
          companyName: access?.company_name || 'IMORA 2.0',
          roleTitle: ROLE_LABELS[role] || role,
          loginUrl: `${window.location.origin}/login`,
          tempPassword: password,
          inviterName: access?.full_name || 'Руководитель',
        });
      } catch {
        // Non-blocking email dispatch
      }

      setNotice('Сотрудник создан. Письмо автоматически не отправлено: передайте адрес входа и пароль по согласованному защищённому каналу.');
      setOpen(false);
      setEmail(''); setPassword(''); setFullName(''); setPosition(''); setRole('MEMBER');
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(id: string, field: 'role' | 'status', value: string) {
    setRowError('');
    try {
      await callManageUsers({ action: 'update_team_member', user_id: id, [field]: value });
      await reload();
    } catch (err) {
      setRowError(errorMessage(err));
    }
  }

  async function resetPassword() {
    if (!resetOpen) return;
    setFormError('');
    setSaving(true);
    try {
      await callManageUsers({ action: 'reset_team_password', user_id: resetOpen.id, password: newPassword });
      setResetOpen(null);
      setNewPassword('');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Команда" description="Сотрудники вашей компании" />
        <Card>
          {loading ? <Spinner /> : (
            <Table head={['Имя', 'Должность', 'Email', 'Роль', 'Статус']}>
              {team.map((m) => (
                <tr key={m.id}>
                  <Td className="font-medium">{m.full_name}</Td>
                  <Td>{m.position || '—'}</Td>
                  <Td>{m.email}</Td>
                  <Td><Badge tone="neutral">{ROLE_LABELS[m.role]}</Badge></Td>
                  <Td><Badge tone={m.status === 'active' ? 'emerald' : 'rose'}>{m.status === 'active' ? 'Активен' : 'Заблокирован'}</Badge></Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Команда"
        description={`Активных сотрудников: ${activeCount} из ${limit}`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Пригласить сотрудника</Button>}
      />

      {notice && <div className="mb-4"><Alert tone="info">{notice}</Alert></div>}
      {(error || rowError) && <div className="mb-4"><Alert tone="error">{error || rowError}</Alert></div>}

      {loading ? (
        <Spinner />
      ) : team.length === 0 ? (
        <Card><EmptyState icon={UsersIcon} title="В команде нет сотрудников" description="Пригласите первого сотрудника." /></Card>
      ) : (
        <Card>
          <Table head={['Имя', 'Должность', 'Email', 'Роль', 'Статус', 'Действия']}>
            {team.map((m) => (
              <tr key={m.id} className="hover:bg-slate-800/60">
                <Td className="font-medium">{m.full_name}</Td>
                <Td>{m.position || '—'}</Td>
                <Td>{m.email}</Td>
                <Td>
                  <Select value={m.role} onChange={(e) => void updateMember(m.id, 'role', e.target.value)} className="w-auto py-1 text-xs" disabled={m.role === 'SUPER_ADMIN' || m.id === selfId}>
                    {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'SUPER_ADMIN').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Td>
                <Td>
                  <Select value={m.status} onChange={(e) => void updateMember(m.id, 'status', e.target.value)} className="w-auto py-1 text-xs" disabled={m.id === selfId}>
                    <option value="active">Активен</option>
                    <option value="blocked">Заблокирован</option>
                  </Select>
                </Td>
                <Td>
                  {m.id !== selfId && (
                    <button onClick={() => { setResetOpen(m); setFormError(''); }} className="text-slate-400 hover:text-sky-600" aria-label="Сбросить пароль">
                      <KeyRound className="h-4 w-4" />
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal open={open} title="Пригласить сотрудника" onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Отмена</Button><Button onClick={create} loading={saving}>Создать</Button></>}>
        <form onSubmit={create} className="space-y-4">
          <Field label="Имя"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Пароль" hint="Минимум 8 символов"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Должность"><Input value={position} onChange={(e) => setPosition(e.target.value)} maxLength={120} placeholder="Например: Главный инженер" /></Field>
            <Field label="Роль в системе">
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {Object.entries(ROLE_LABELS)
                  .filter(([k]) => k !== 'SUPER_ADMIN')
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          {ROLE_DESCRIPTIONS[role] && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-950/40 p-3 text-xs text-sky-200">
              <span className="font-semibold text-sky-300">Права роли:</span> {ROLE_DESCRIPTIONS[role]}
            </div>
          )}
          {formError && <Alert tone="error">{formError}</Alert>}
        </form>
      </Modal>

      <Modal open={!!resetOpen} title="Сбросить пароль" onClose={() => setResetOpen(null)}
        footer={<><Button variant="secondary" onClick={() => setResetOpen(null)}>Отмена</Button><Button onClick={() => void resetPassword()} loading={saving}>Сбросить</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Установите новый пароль для <strong>{resetOpen?.full_name}</strong>.</p>
          <Field label="Новый пароль"><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} /></Field>
          {formError && <Alert tone="error">{formError}</Alert>}
        </div>
      </Modal>
    </div>
  );
}
