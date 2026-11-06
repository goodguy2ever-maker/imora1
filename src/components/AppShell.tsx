import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const drawer = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    const trigger = menuButton.current;
    document.body.style.overflow = 'hidden';
    const items = () => Array.from(drawer.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ?? []);
    items()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const elements = items(), first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', keydown);
      trigger?.focus();
    };
  }, [open]);

  const isActive = (to: string) => (to === '/app' || to === '/admin' ? path === to : path.startsWith(to));

  const navList = (
    <nav aria-label="Разделы рабочего пространства" className="workspace-nav flex flex-col gap-1.5">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`workspace-nav-item group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
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
      <div className="workspace-brand-mark flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600">
        <HardHat className="h-5 w-5 text-white" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-white font-mono">IMORA 2.0</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="workspace-glass flex min-h-screen bg-slate-950">
      <aside className="workspace-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80 p-4 backdrop-blur lg:flex">
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
      {open && <aside ref={drawer} role="dialog" aria-modal="true" aria-label="Навигация"
        className={`workspace-mobile-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900 p-4 transition-transform duration-300 lg:hidden ${
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
      </aside>}

      <div className="workspace-main-panel flex min-w-0 flex-1 flex-col">
        <header className="workspace-topbar sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur sm:px-8">
          <button ref={menuButton} aria-expanded={open} onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden" aria-label="Открыть меню">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0"><p className="mb-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">Рабочее пространство</p><h2 className="truncate text-sm font-semibold text-white">{title}</h2></div>
          <div className="workspace-context ml-auto hidden items-center gap-3 sm:flex">
            <span>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date())}</span>
            <span className="workspace-context-badge">{subtitle}</span>
          </div>
        </header>
        <main className="workspace-content mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
