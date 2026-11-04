import { useState, type ReactNode } from 'react';
import { LogOut, Menu, X, HardHat } from 'lucide-react';
import Link from '@/components/Link';
import { usePathname } from '@/lib/router';
import type { LucideIcon } from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };

export function AppShell({
  nav,
  title,
  subtitle,
  onSignOut,
  children,
}: {
  nav: NavItem[];
  title: string;
  subtitle: string;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (to: string) => (to === '/app' || to === '/admin' ? path === to : path.startsWith(to));

  const navList = (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3 px-3 pb-6 pt-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600">
        <HardHat className="h-5 w-5 text-white" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-white font-mono">IMORA 2.0</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80 p-4 backdrop-blur lg:flex">
        {brand}
        {navList}
        <button
          onClick={onSignOut}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Выйти
        </button>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900 p-4 transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between">
          {brand}
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:text-white" aria-label="Закрыть меню">
            <X className="h-5 w-5" />
          </button>
        </div>
        {navList}
        <button onClick={onSignOut} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white">
          <LogOut className="h-4 w-4" aria-hidden />
          Выйти
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur sm:px-8">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden" aria-label="Открыть меню">
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="truncate text-base font-semibold text-white">{title}</h2>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
