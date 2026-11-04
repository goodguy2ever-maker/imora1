import { useState } from 'react';
import { Calculator, TrendingUp, Clock, DollarSign, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export default function RoiCalculator() {
  const [projectCount, setProjectCount] = useState<number>(3);
  const [avgBudgetMln, setAvgBudgetMln] = useState<number>(60);

  // Standard construction stats:
  // - 5% savings on materials & procurement mistakes
  // - 18 hours/week saved by PTO & engineers on spreadsheets & calls
  const totalBudget = projectCount * avgBudgetMln;
  const estimatedSavingsMln = Math.round((totalBudget * 0.055) * 10) / 10;
  const hoursSavedMonth = projectCount * 45;

  return (
    <section id="calculator" className="relative py-20 border-t border-slate-900 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-emerald-400">
            <Calculator className="h-3.5 w-3.5" />
            Экономика эффективности
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Калькулятор окупаемости внедрения Imora
          </h2>
          <p className="mt-3 text-base text-slate-300">
            Узнайте, сколько средств теряется на неконтролируемых закупках и ручном сведении смет,
            и сколько спасёт ваша компания.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Controls Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-md lg:col-span-7">
            <div className="space-y-6">
              {/* Slider 1: Projects */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">Количество активных объектов в год:</span>
                  <span className="font-mono text-lg font-bold text-sky-400">
                    {projectCount} {projectCount === 1 ? 'объект' : projectCount < 5 ? 'объекта' : 'объектов'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={projectCount}
                  onChange={(e) => setProjectCount(Number(e.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-500"
                />
                <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-500">
                  <span>1 объект</span>
                  <span>10 объектов</span>
                  <span>25 объектов</span>
                </div>
              </div>

              {/* Slider 2: Average Budget */}
              <div className="border-t border-slate-800 pt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">Средний бюджет одного объекта:</span>
                  <span className="font-mono text-lg font-bold text-sky-400">
                    {avgBudgetMln.toLocaleString('ru-RU')} млн ₽
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  value={avgBudgetMln}
                  onChange={(e) => setAvgBudgetMln(Number(e.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-500"
                />
                <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-500">
                  <span>5 млн ₽</span>
                  <span>150 млн ₽</span>
                  <span>300 млн ₽</span>
                </div>
              </div>

              {/* Total volume indicator */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 font-mono text-xs text-slate-400">
                Общий строительный бюджет под контролем:{' '}
                <span className="font-bold text-white">{totalBudget.toLocaleString('ru-RU')} млн ₽</span>
              </div>
            </div>
          </div>

          {/* Results Output Box */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl ring-1 ring-emerald-500/20 lg:col-span-5">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />

            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400">
              Прогноз экономической выгоды
            </div>

            <div className="mt-4">
              <span className="text-sm text-slate-400">Сохранение бюджета компании:</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight sm:text-5xl">
                  +{estimatedSavingsMln.toLocaleString('ru-RU')}
                </span>
                <span className="text-xl font-bold text-emerald-400">млн ₽ / год</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                За счёт устранения перерасхода материалов, двойных закупок и потерь в накладных расходах.
              </p>
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-800 pt-6 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="h-4 w-4 text-sky-400" />
                  <span>Экономия времени ПТО:</span>
                </div>
                <span className="font-mono font-bold text-white">~{hoursSavedMonth} ч/мес</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>Срок окупаемости Imora:</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">&lt; 14 дней</span>
              </div>
            </div>

            <div className="mt-8">
              <a href="#demo">
                <Button variant="primary" className="w-full justify-center shadow-lg shadow-sky-600/30">
                  Получить детальный финплан <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
