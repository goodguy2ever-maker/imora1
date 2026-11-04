import { Ruler, FileSpreadsheet, HardHat, Check, ArrowRight, ShieldCheck, Zap, Layers } from 'lucide-react';

const ECOSYSTEM_PARTS = [
  {
    part: 'Часть 1',
    category: 'Архитектура & Проектирование',
    title: 'Интерактивный 2D-САПР в браузере',
    desc: 'Создание планировок, черчение несущих стен и перегородок с автоматическим расчётом погонных метров и площадей помещений прямо на сетке.',
    color: 'from-sky-500/20 to-blue-600/5 border-sky-500/30 text-sky-400',
    features: [
      'Черчение стен по строительным осям с автопривязкой',
      'Расчёт длины стен в метрах в реальном времени',
      'Экспликация помещений и расстановка технологических меток',
      'Экспорт и интеграция в сметный калькулятор',
    ],
    badge: 'CAD-Lite Engine',
  },
  {
    part: 'Часть 2',
    category: 'Сметы & Снабжение',
    title: 'Версионные сметы и согласование закупок',
    desc: 'Каждая смета проходит этапы утверждения. Заявки на материалы связаны с бюджетом проекта и проходят строгий ролевой workflow.',
    color: 'from-emerald-500/20 to-teal-600/5 border-emerald-500/30 text-emerald-400',
    features: [
      'Версионность смет (Черновик → Утверждено → Архив)',
      'Спецификации материалов по позициям и единицам измерения',
      'Workflow заявок: Согласование → Заказ → Поставка на объект',
      'Учёт лимитов и предупреждение о перерасходе до оплаты',
    ],
    badge: 'Budget & Procurement',
  },
  {
    part: 'Часть 3',
    category: 'Стройконтроль & Финансы',
    title: 'Дашборд объекта и отчёты прорабов',
    desc: 'План-факт анализ в реальном времени. Ежедневные журналы со стройплощадки, контроль подрядчиков и финансовая прозрачность для инвестора.',
    color: 'from-amber-500/20 to-orange-600/5 border-amber-500/30 text-amber-400',
    features: [
      'План-факт дашборд: утверждённый бюджет vs реальные расходы',
      'Ежедневные отчёты прорабов с фиксацией выполненных объёмов',
      'Ролевой доступ (Супер-админ, Руководитель компании, Инженер)',
      'Полная серверная изоляция данных на уровне базы (RLS)',
    ],
    badge: 'Field Ops & Audit',
  },
];

export default function EcosystemBreakdown() {
  return (
    <section id="ecosystem" className="relative py-20 border-t border-slate-900 bg-slate-950/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-sky-400">
            Архитектура продукта
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            3 составные части единой системы Imora 2.0
          </h2>
          <p className="mt-4 text-base text-slate-300">
            Больше не нужно разрываться между AutoCAD, таблицами Excel и десятками чатов в Telegram.
            Все этапы стройки соединены в сквозной цифровой процесс.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {ECOSYSTEM_PARTS.map((item, idx) => (
            <div
              key={idx}
              className={`relative flex flex-col justify-between rounded-2xl border bg-gradient-to-b ${item.color} p-6 sm:p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-400">
                    {item.part}
                  </span>
                  <span className="rounded-full bg-slate-900/90 px-2.5 py-0.5 font-mono text-[11px] font-medium text-slate-300 border border-slate-800">
                    {item.badge}
                  </span>
                </div>

                <div className="mt-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {item.category}
                </div>
                <h3 className="mt-1 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{item.desc}</p>

                <div className="mt-6 space-y-2.5 border-t border-slate-800/80 pt-6">
                  {item.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-slate-800/80 pt-4">
                <a
                  href="#demo"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 transition hover:text-sky-300"
                >
                  Узнать подробнее об этом модуле <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
