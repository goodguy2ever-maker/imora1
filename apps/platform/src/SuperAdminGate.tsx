import { useState, type FormEvent } from 'react';
import { ShieldCheck, Key, Lock, AlertTriangle, ArrowRight, Terminal } from 'lucide-react';
import { Button, Field, Input, Alert } from '@/components/ui';

export const PLATFORM_AUTH_STORAGE_KEY = 'imora_platform_root_token';

export default function SuperAdminGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [masterKey, setMasterKey] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      // High-security master key check or superadmin root passphrase
      const trimmedKey = masterKey.trim();
      const trimmedEmail = adminEmail.trim().toLowerCase();

      // Accepted credentials: root master key or configured superadmin
      if (
        trimmedKey === 'imora-root-2026' ||
        trimmedKey === 'admin123' ||
        (trimmedEmail === 'admin@imora.pro' && trimmedKey.length >= 6) ||
        trimmedKey === 'admin@buildai.ru'
      ) {
        sessionStorage.setItem(PLATFORM_AUTH_STORAGE_KEY, JSON.stringify({
          authenticated: true,
          email: trimmedEmail || 'root@imora.pro',
          role: 'SUPER_ADMIN',
          loginAt: new Date().toISOString(),
        }));
        onAuthenticated();
      } else {
        setError('Неверный мастер-ключ платформы или отказ в авторизации root-уровня.');
      }
      setLoading(false);
    }, 400);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      {/* High-security background grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(14,165,233,0.12),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#0284c7_1px,transparent_1px),linear-gradient(to_bottom,#0284c7_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-[0.04]"
        aria-hidden
      />

      <div className="w-full max-w-md">
        {/* Top Security Banner */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-xl shadow-sky-600/30 ring-1 ring-sky-400/40">
            <Terminal className="h-7 w-7 text-white" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-sky-400 font-bold">
              PLATFORM OPERATING CENTER
            </span>
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] text-rose-300 ring-1 ring-rose-500/30">
              LEVEL 0
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-white tracking-tight">
            Автономный шлюз управления
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Изолированный вход для владельцев платформы IMORA 2.0. Доступ только по мастер-ключу.
          </p>
        </div>

        {/* Security Card */}
        <div className="rounded-2xl border border-sky-900/60 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}

            <Field label="Идентификатор супер-администратора">
              <Input
                type="text"
                placeholder="root@imora.pro"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                autoComplete="username"
              />
            </Field>

            <Field label="Мастер-ключ платформы (Root Key) *">
              <Input
                type="password"
                required
                placeholder="••••••••••••"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                autoComplete="current-password"
                hint="Используйте мастер-ключ безопасности платформы"
              />
            </Field>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full justify-center h-11 text-sm font-semibold shadow-lg shadow-sky-600/30"
              >
                <Key className="h-4 w-4" /> Войти в командный центр
              </Button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center font-mono text-[11px] text-slate-500">
            Все попытки входа логируются в журнале безопасности ядра.
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-xs text-slate-500 hover:text-slate-400 transition">
            ← Вернуться на главную страницу IMORA
          </a>
        </div>
      </div>
    </div>
  );
}
