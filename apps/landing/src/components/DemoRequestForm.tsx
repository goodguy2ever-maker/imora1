import { useState, type FormEvent } from 'react';
import { Send, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, Button, Field, Input, Textarea } from '@/components/ui';
import { errorMessage } from '@/lib/format';

export default function DemoRequestForm() {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: rpcError } = await supabase.from('demo_requests').insert({
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        position: position.trim(),
        contact: contact.trim(),
        message: message.trim() || null,
      });

      if (rpcError) throw rpcError;
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось отправить заявку. Пожалуйста, проверьте данные или свяжитесь с нами напрямую.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="demo" className="relative py-20 border-t border-slate-900 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-sky-900/60 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-12 shadow-2xl shadow-sky-950/40 ring-1 ring-white/10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Left promo info */}
            <div className="flex flex-col justify-between lg:col-span-5">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-sky-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ранний доступ
                </div>
                <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-white">
                  Начните управлять стройкой в Imora 2.0
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Оставьте контакты вашей компании. Мы развернём изолированное рабочее пространство,
                  покажем интерактивную трансформацию проектов и загрузим ваши первые сметы.
                </p>

                <div className="mt-8 space-y-3 font-mono text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Изоляция данных компании на уровне RLS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-400" />
                    <span>14 дней полнофункционального доступа</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-400" />
                    <span>Помощь инженера при внедрении</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-400">
                Техническая поддержка: <br />
                <a href="mailto:support@imora.pro" className="font-semibold text-sky-400 hover:underline">
                  support@imora.pro
                </a>
              </div>
            </div>

            {/* Right Form */}
            <div className="lg:col-span-7">
              {done ? (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h4 className="mt-4 text-xl font-bold text-white">Заявка успешно принята!</h4>
                  <p className="mt-2 text-sm text-slate-300 max-w-sm">
                    Наш технический специалист свяжется с вами по указанному контакту в течение 30 минут
                    для демонстрации и настройки воркспейса.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDone(false);
                      setFullName('');
                      setCompanyName('');
                      setPosition('');
                      setContact('');
                      setMessage('');
                    }}
                    className="mt-6"
                  >
                    Отправить ещё одну заявку
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  {error && <Alert tone="error">{error}</Alert>}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Ваше имя *">
                      <Input
                        required
                        placeholder="Константин"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </Field>

                    <Field label="Название компании *">
                      <Input
                        required
                        placeholder="СК «МонолитСтрой»"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Ваша должность *">
                      <Input
                        required
                        placeholder="Гендиректор / Главный инженер"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                      />
                    </Field>

                    <Field label="Телефон или Email *">
                      <Input
                        required
                        placeholder="+7 999 000-00-00 или email"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="Комментарий или пожелания (необязательно)">
                    <Textarea
                      rows={3}
                      placeholder="Сколько объектов строите, какие задачи хотите решить в первую очередь..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </Field>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={loading}
                      className="w-full justify-center h-11 text-base font-semibold shadow-lg shadow-sky-600/30"
                    >
                      <Send className="h-4 w-4" /> Получить доступ к Imora 2.0
                    </Button>
                    <p className="mt-2 text-center text-[11px] text-slate-400">
                      Нажимая кнопку, вы соглашаетесь на обработку персональных данных.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
