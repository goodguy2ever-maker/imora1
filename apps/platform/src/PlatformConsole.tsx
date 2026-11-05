import AdminMfaGate from '@/components/AdminMfaGate';
import { useState } from 'react';
import {
  Users,
  Building2,
  DollarSign,
  Activity,
  LogOut,
  ExternalLink,
  Terminal,
  Server
} from 'lucide-react';
import { Button } from '@/components/ui';
import RequestsPipelineTab from './tabs/RequestsPipelineTab';
import CompaniesManagementTab from './tabs/CompaniesManagementTab';
import PlatformFinancesTab from './tabs/PlatformFinancesTab';
import SystemAuditTab from './tabs/SystemAuditTab';
import { useAuth } from '@/context/useAuth';

type Tab = 'requests' | 'companies' | 'billing' | 'audit';

function PlatformConsoleContent({ onSignOut }: { onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const { session } = useAuth();
  const adminUser = session?.user.email ?? 'Администратор платформы';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Autonomous Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-sky-950/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg shadow-sky-600/30">
                <Terminal className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-white tracking-tight">
                    IMORA PLATFORM
                  </span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-300 ring-1 ring-rose-500/30">
                    SUPERADMIN ROOT
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Server className="h-2.5 w-2.5" /> Core: Online
                  </span>
                  <span>•</span>
                  <span>Сессия: {adminUser}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-mono"
            >
              <span>Открыть сайт</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <Button
              variant="secondary"
              onClick={onSignOut}
              className="py-1.5 px-3 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" /> Выйти из шлюза
            </Button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto border-t border-slate-900 pt-2 pb-2 scrollbar-none font-medium text-xs">
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition ${
                activeTab === 'requests'
                  ? 'bg-sky-600/20 text-sky-400 font-semibold ring-1 ring-sky-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Заявки клиентов (CRM)</span>
            </button>

            <button
              onClick={() => setActiveTab('companies')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition ${
                activeTab === 'companies'
                  ? 'bg-sky-600/20 text-sky-400 font-semibold ring-1 ring-sky-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Компании и Воркспейсы</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition ${
                activeTab === 'billing'
                  ? 'bg-sky-600/20 text-sky-400 font-semibold ring-1 ring-sky-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Биллинг & Финансы</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition ${
                activeTab === 'audit'
                  ? 'bg-sky-600/20 text-sky-400 font-semibold ring-1 ring-sky-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Журнал аудита</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'requests' && <RequestsPipelineTab />}
        {activeTab === 'companies' && <CompaniesManagementTab />}
        {activeTab === 'billing' && <PlatformFinancesTab />}
        {activeTab === 'audit' && <SystemAuditTab />}
      </main>
    </div>
  );
}

export default function PlatformConsole(props: { onSignOut: () => void }) {
  return <AdminMfaGate><PlatformConsoleContent {...props} /></AdminMfaGate>;
}
