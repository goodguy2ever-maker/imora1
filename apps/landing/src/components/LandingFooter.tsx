import { Layers, ShieldCheck, Heart } from 'lucide-react';
import Link from '@/components/Link';

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow-md shadow-sky-600/30">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-mono text-lg font-bold text-white tracking-tight">IMORA 2.0</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Единая строительная операционная система: от архитектурных чертежей и смет до готового объекта.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Серверы: Все системы работают стабильно</span>
            </div>
          </div>

          {/* Col 2: Продукт */}
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Экосистема
            </div>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <a href="#transformation" className="hover:text-sky-400 transition">
                  Трансформация Чертёж → Объект
                </a>
              </li>
              <li>
                <a href="#ecosystem" className="hover:text-sky-400 transition">
                  2D-САПР в браузере
                </a>
              </li>
              <li>
                <a href="#ecosystem" className="hover:text-sky-400 transition">
                  Версионные сметы и расчёт
                </a>
              </li>
              <li>
                <a href="#ecosystem" className="hover:text-sky-400 transition">
                  Закупки материалов & Workflow
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Платформа */}
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Платформа
            </div>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-sky-400 transition">
                  Вход в рабочий воркспейс
                </Link>
              </li>
              <li>
                <a href="#pricing" className="hover:text-sky-400 transition">
                  Тарифы и подписка
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-sky-400 transition">
                  Калькулятор окупаемости
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-sky-400 transition">
                  Заявка на подключение
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Безопасность & Документы */}
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Безопасность
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Изолированные базы данных компаний. Шифрование TLS 1.3, контроль доступа на уровне строк (PostgreSQL RLS).
            </p>
            <div className="mt-3 text-xs text-slate-400">
              Контакты: <a href="mailto:contact@imora.pro" className="text-sky-400 hover:underline">contact@imora.pro</a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-900 pt-8 sm:flex-row text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} IMORA 2.0. Все права защищены.
          </div>
          <div className="flex gap-6">
            <span>Политика конфиденциальности</span>
            <span>Пользовательское соглашение</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
