import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export default function PricingPlans() {
  const [annualBilling, setAnnualBilling] = useState(true);

  const PLANS = [
    {
      name: 'Старт',
      badge: 'Для подрядчиков и бригад',
      priceMonthly: 19900,
      priceAnnual: 14900,
      desc: 'Базовый набор инструментов для контроля 2D-чертежей, смет и закупок на небольших стройках.',
      popular: false,
      features: [
        'До 3 активных объектов строительства',
        'До 5 пользователей (прорабы, сметчик, админ)',
        '2D-редактор чертежей стен и планировок',
        'Сметный модуль с расчётом объёмов',
        'Заявки на материалы с базовым статусом',
        'Email-поддержка',
      ],
      cta: 'Выбрать тариф Старт',
    },
    {
      name: 'Бизнес',
      badge: 'Выбор строительных компаний',
      priceMonthly: 49900,
      priceAnnual: 39900,
      desc: 'Полнофункциональная платформа для генподрядчиков с контролем версий смет и цепочкой снабжения.',
      popular: true,
      features: [
        'До 15 активных объектов одновременно',
        'До 25 сотрудников с ролевым доступом',
        'Версионность смет и фиксация базовых цен',
        'Многоступенчатый workflow согласования заявок',
        'План-факт финансовый дашборд (бюджет vs факт)',
        'Ежедневные отчёты прорабов с объектов',
        'Журнал аудита действий и изменений',
        'Приоритетная поддержка 24/7',
      ],
      cta: 'Подключить тариф Бизнес',
    },
    {
      name: 'Корпорация',
      badge: 'Для девелоперов и холдингов',
      priceMonthly: null,
      priceAnnual: null,
      desc: 'Индивидуальная инфраструктура, неограниченные мощности и глубокая интеграция с 1С/ERP.',
      popular: false,
      features: [
        'Неограниченное число проектов и пользователей',
        'Выделенный сервер / On-premise развёртывание',
        'Интеграция с 1С, BIM-системами и банками',
        'Индивидуальные доработки логики workflow',
        'Персональный куратор и обучение команды',
        'Гарантированный SLA 99.9%',
      ],
      cta: 'Запросить корпоративные условия',
    },
  ];

  return (
    <section id="pricing" className="relative py-20 border-t border-slate-900 bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-sky-400">
            Прозрачные тарифы
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Тарифные планы Imora 2.0
          </h2>
          <p className="mt-3 text-base text-slate-300">
            Оплата банковской картой или по счёту юрлица. 14 дней бесплатного пробного периода на всех тарифах.
          </p>

          {/* Billing period toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                !annualBilling ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ежемесячно
            </button>
            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                annualBilling ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Годовая подписка
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 ring-1 ring-emerald-500/30">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {PLANS.map((plan, i) => {
            const price = annualBilling ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={i}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 sm:p-8 transition-all ${
                  plan.popular
                    ? 'border-sky-500 bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 shadow-2xl shadow-sky-950/60 ring-1 ring-sky-500/50'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-3.5 py-1 text-xs font-bold text-white shadow-md">
                    Самый популярный тариф
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <span className="font-mono text-xs text-slate-400">{plan.badge}</span>
                  </div>

                  <p className="mt-2 text-xs text-slate-300">{plan.desc}</p>

                  <div className="mt-6 flex items-baseline gap-1 border-b border-slate-800 pb-6">
                    {price ? (
                      <>
                        <span className="text-4xl font-extrabold text-white font-mono">
                          {price.toLocaleString('ru-RU')} ₽
                        </span>
                        <span className="text-xs text-slate-400">/ месяц</span>
                      </>
                    ) : (
                      <span className="text-3xl font-extrabold text-white font-mono">По запросу</span>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Что включено:
                    </div>
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                          <Check className="h-3 w-3" />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-800/80 pt-6">
                  <a href="#demo" className="block">
                    <Button
                      variant={plan.popular ? 'primary' : 'secondary'}
                      className="w-full justify-center"
                    >
                      {plan.cta} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
