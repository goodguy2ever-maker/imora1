import type { ReactNode } from 'react';
import { HardHat } from 'lucide-react';

export function AuthLayout({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(40rem_40rem_at_50%_-10%,rgba(2,132,199,0.12),transparent)]" aria-hidden />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 shadow-lg shadow-sky-600/30">
            <HardHat className="h-6 w-6 text-white" aria-hidden />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-center text-sm text-slate-500">{description}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">{children}</div>
        {footer && <div className="mt-4 text-center text-xs text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}
