import { useState } from 'react';
import { Layers, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from '@/components/Link';
import { Button } from '@/components/ui';

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-sky-950/60 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 shadow-lg shadow-sky-500/25 ring-1 ring-sky-400/30">
            <Layers className="h-5 w-5 text-white" aria-hidden />
            <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-mono">IMORA</span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-sky-400 ring-1 ring-inset ring-sky-500/30">
                2.0
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
              Digital Construction OS
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
          <a href="#transformation" className="transition hover:text-sky-400">
            Трансформация
          </a>
          <a href="#ecosystem" className="transition hover:text-sky-400">
            3 Части платформы
          </a>
          <a href="#calculator" className="transition hover:text-sky-400">
            Калькулятор выгоды
          </a>
          <a href="#pricing" className="transition hover:text-sky-400">
            Тарифы
          </a>
          <a href="#demo" className="transition hover:text-sky-400">
            Демо-доступ
          </a>
        </nav>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
          >
            Войти
          </Link>
          <a href="#demo" className="hidden sm:inline-block">
            <Button variant="primary" className="shadow-sky-500/20 hover:shadow-sky-500/40">
              Начать бесплатно <ArrowRight className="h-4 w-4" />
            </Button>
          </a>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-800 bg-slate-950 px-4 py-4 md:hidden">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
            <a
              href="#transformation"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-sky-400"
            >
              Трансформация (Чертёж → Объект)
            </a>
            <a
              href="#ecosystem"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-sky-400"
            >
              3 Части платформы
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-sky-400"
            >
              Калькулятор выгоды
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-sky-400"
            >
              Тарифные планы
            </a>
            <a
              href="#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-sky-400 hover:underline"
            >
              Запросить демо
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
