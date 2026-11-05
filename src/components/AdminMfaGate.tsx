import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { Alert, Button, Card, Input, Spinner } from '@/components/ui';

export default function AdminMfaGate({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setReady(false); setLoading(true); setError('');
    async function check() {
      try {
        const level = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (level.error) throw level.error;
        if (!active) return;
        if (level.data.currentLevel === 'aal2') { setReady(true); return; }
        const factors = await supabase.auth.mfa.listFactors();
        if (factors.error) throw factors.error;
        if (active) setFactorId(factors.data.totp.find(f => f.status === 'verified')?.id ?? '');
      } catch { if (active) setError('Не удалось проверить защиту аккаунта. Повторите попытку.'); }
      finally { if (active) setLoading(false); }
    }
    void check();
    return () => { active = false; };
  }, [session?.access_token, retry]);

  async function enroll() {
    setBusy(true); setError('');
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      // Remove only abandoned setup attempts belonging to this flow.
      for (const factor of factors.data.all) {
        if (factor.status === 'unverified' && factor.friendly_name === 'IMORA Admin') {
          const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (removed.error) throw removed.error;
        }
      }
      const result = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'IMORA Admin', issuer: 'IMORA' });
      if (result.error) throw result.error;
      setFactorId(result.data.id); setQr(result.data.totp.qr_code); setSecret(result.data.totp.secret);
    } catch { setError('Не удалось настроить второй фактор. Повторите попытку.'); }
    finally { setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError('');
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) throw result.error;
      setQr(''); setSecret(''); setCode(''); setRetry(n => n + 1);
    } catch { setError('Код не принят. Проверьте время на телефоне и введите новый код.'); }
    finally { setBusy(false); }
  }
  if (loading) return <Spinner />;
  if (ready) return <>{children}</>;
  return <main className="min-h-screen grid place-items-center bg-slate-950 p-6 text-slate-100">
    <Card className="w-full max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Защита администратора</h1>
      <p className="text-sm text-slate-300">Для доступа нужен код из приложения-аутентификатора. При первой настройке сохраните ключ в защищённом менеджере паролей.</p>
      {error && <><Alert>{error}</Alert><Button variant="secondary" onClick={() => setRetry(n => n + 1)}>Проверить снова</Button></>}
      {!factorId ? <Button disabled={busy || !!error} onClick={() => void enroll()}>Подключить второй фактор</Button> : <form onSubmit={verify} className="space-y-4">
        {qr && <><img src={qr.startsWith('data:') ? qr : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} alt="QR-код для подключения аутентификатора" className="mx-auto h-52 w-52 bg-white p-2" /><details><summary>Ключ для ручного ввода</summary><code className="break-all select-all">{secret}</code></details></>}
        <label className="block" htmlFor="admin-mfa-code">Код из приложения</label>
        <Input id="admin-mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        <Button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Проверяем…' : 'Подтвердить'}</Button>
      </form>}
      <p className="text-xs text-slate-400">При потере второго фактора восстановление выполняет владелец проекта через Supabase после проверки личности.</p>
      <Button variant="secondary" onClick={() => void signOut()}>Выйти</Button>
    </Card>
  </main>;
}
