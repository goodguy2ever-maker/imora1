import { HardHat } from 'lucide-react';
import { Button } from '@/components/ui';

export default function StatusScreen({
  title,
  message,
  onSignOut,
}: {
  title: string;
  message: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 shadow-lg shadow-sky-600/30">
          <HardHat className="h-6 w-6 text-white" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{message}</p>
        <div className="mt-6">
          <Button variant="secondary" onClick={onSignOut}>
            Выйти из аккаунта
          </Button>
        </div>
      </div>
    </div>
  );
}
