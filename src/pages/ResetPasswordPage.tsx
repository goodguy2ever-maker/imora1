import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { AuthLayout } from '@/components/AuthLayout';
import { Alert, Button, Field, Input, Spinner } from '@/components/ui';
import { errorMessage } from '@/lib/format';

const MIN_PASSWORD_LENGTH = 8;

type Status = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setStatus(data.session ? 'ready' : 'invalid');
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && active) setStatus('ready');
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль должен содержать не менее ${MIN_PASSWORD_LENGTH} символов.`);
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают.');
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setStatus('done');
    } catch (err) {
      setError(errorMessage(err, 'Не удалось сохранить новый пароль. Попробуйте ещё раз.'));
    } finally {
      setLoading(false);
    }
  }

  if (status === 'checking') {
    return <Spinner label="Проверяем ссылку" />;
  }

  if (status === 'invalid') {
    return (
      <AuthLayout title="Ссылка недействительна" description="Срок действия ссылки истёк или она уже была использована">
        <div className="space-y-4">
          <Alert tone="error">Запросите новую ссылку для смены пароля на странице входа.</Alert>
          <Button className="w-full" onClick={() => navigate('/login')}>
            Вернуться ко входу
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'done') {
    return (
      <AuthLayout title="Пароль обновлён" description="Теперь можно пользоваться новым паролем">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" aria-hidden />
          <Button className="w-full" onClick={() => navigate('/app', true)}>
            Перейти в приложение
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Новый пароль" description={`Придумайте новый пароль длиной не менее ${MIN_PASSWORD_LENGTH} символов`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Новый пароль">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder="••••••••" />
        </Field>
        <Field label="Повторите пароль">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder="••••••••" />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={loading} className="w-full">
          Сохранить пароль
        </Button>
      </form>
    </AuthLayout>
  );
}
