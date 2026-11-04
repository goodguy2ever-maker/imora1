import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import { Redirect } from '@/components/Redirect';
import { AuthLayout } from '@/components/AuthLayout';
import { Alert, Button, Field, Input } from '@/components/ui';
import { errorMessage } from '@/lib/format';

type Mode = 'signin' | 'forgot';

export default function LoginPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect to="/app" />;

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setInfo('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setInfo('Если аккаунт с таким email существует, мы отправили на него ссылку для смены пароля. Проверьте входящие и папку «Спам».');
      }
    } catch (err) {
      setError(errorMessage(err, mode === 'signin' ? 'Неверный email или пароль.' : 'Не удалось отправить письмо. Попробуйте позже.'));
    } finally {
      setLoading(false);
    }
  }

  const isForgot = mode === 'forgot';

  return (
    <AuthLayout
      title={isForgot ? 'Восстановление пароля' : 'Вход в воркспейс IMORA 2.0'}
      description={isForgot ? 'Укажите email, и мы отправим ссылку для создания нового пароля' : 'Вход для сотрудников, инженеров и руководителей'}
      footer={
        <div className="space-y-2">
          <p className="text-slate-400">Доступ выдаётся администратором вашей компании.</p>
          <p>
            Нет аккаунта?{' '}
            <a href="/#demo" className="font-semibold text-sky-400 hover:text-sky-300 hover:underline">
              Оставить заявку на подключение компании
            </a>
          </p>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.ru" />
        </Field>
        {!isForgot && (
          <Field label="Пароль">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
          </Field>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}
        <Button type="submit" loading={loading} className="w-full">
          {isForgot ? 'Отправить ссылку' : 'Войти'}
        </Button>
        <div className="flex justify-center pt-1">
          {isForgot ? (
            <button type="button" onClick={() => switchMode('signin')} className="text-sm text-sky-400 transition hover:text-sky-300">
              Вернуться ко входу
            </button>
          ) : (
            <button type="button" onClick={() => switchMode('forgot')} className="text-sm text-sky-400 transition hover:text-sky-300">
              Забыли пароль?
            </button>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
