import {
  Activity,
  Building2,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
  Truck,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@/context/useAuth';
import {
  accessBlockMessage,
  canSeeBillingNav,
  canSeeConstructionNav,
  canSeeFinanceNav,
  canSeeTeamNav,
  canSeeSalesNav,
  canSeeSettingsNav,
} from '@/lib/access';
import { usePathname } from '@/lib/router';
import type { Role } from '@/lib/types';
import { Redirect } from '@/components/Redirect';
import StatusScreen from '@/components/StatusScreen';
import { Spinner } from '@/components/ui';
import { AppShell, type NavItem } from '@/components/AppShell';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

// Construction workspace
import DashboardPage from '@/pages/app/DashboardPage';
import ProjectsPage from '@/pages/app/ProjectsPage';
import ProjectDetailPage from '@/pages/app/ProjectDetailPage';
import DrawingEditorPage from '@/pages/app/DrawingEditorPage';
import TasksPage from '@/pages/app/TasksPage';
import MaterialsPage from '@/pages/app/MaterialsPage';
import ExpensesPage from '@/pages/app/ExpensesPage';
import ReportsPage from '@/pages/app/ReportsPage';
import TeamPage from '@/pages/app/TeamPage';
import SettingsPage from '@/pages/app/SettingsPage';
import BillingPage from '@/pages/app/BillingPage';

// Sales CRM workspace (Part 3 — generated in next step)
import SalesDashboardPage from '@/pages/sales/SalesDashboardPage';
import ChessboardPage from '@/pages/sales/ChessboardPage';
import LeadsPipelinePage from '@/pages/sales/LeadsPipelinePage';
import LeadDetailPage from '@/pages/sales/LeadDetailPage';
import SalesAnalyticsPage from '@/pages/sales/SalesAnalyticsPage';

// Autonomous Superadmin Platform (Part 2)
import SuperAdminGate, { PLATFORM_AUTH_STORAGE_KEY } from '../apps/platform/src/SuperAdminGate';
import PlatformConsole from '../apps/platform/src/PlatformConsole';

// ─── ROUTE MATCHERS ───────────────────────────────────────────────────────────
const PROJECT_ROUTE = /^\/app\/projects\/([0-9a-f-]{36})$/i;
const DRAWING_ROUTE = /^\/app\/drawings\/([0-9a-f-]{36})$/i;
const LEAD_ROUTE    = /^\/sales\/leads\/([0-9a-f-]{36})$/i;

// ─── NAVIGATION BUILDERS (called per-role after auth) ─────────────────────────
// Each helper returns only the nav items the role is allowed to see.
// The nav is split into two conceptual groups shown in the sidebar:
//   GROUP 1 — Construction workspace (строительство)
//   GROUP 2 — Sales CRM (продажи)
// COMPANY_ADMIN sees both groups with a divider.

function buildNav(role: Role): NavItem[] {
  const nav: NavItem[] = [];

  // ── Dashboard (everyone inside the workspace sees a dashboard) ────────────
  if (canSeeConstructionNav(role) || role === 'COMPANY_ADMIN') {
    nav.push({ to: '/app',          label: 'Дашборд',              icon: LayoutDashboard });
  }

  // ── Construction Workspace ────────────────────────────────────────────────
  if (canSeeConstructionNav(role)) {
    nav.push({ to: '/app/projects', label: 'Проекты',              icon: FolderKanban });

    // Tasks: foreman sees only their tasks; engineers see all
    nav.push({ to: '/app/tasks',    label: 'Задачи',               icon: CheckSquare });

    // Material requests: foreman creates; supply manager fulfills; admin approves
    nav.push({ to: '/app/materials',label: 'Заявки на материалы',  icon: Package });

    // Expenses: foreman and supply_manager can log; engineer/admin can see all
    if (['COMPANY_ADMIN', 'ENGINEER', 'SUPPLY_MANAGER'].includes(role)) {
      nav.push({ to: '/app/expenses', label: 'Расходы',            icon: Receipt });
    }

    // Daily reports: foreman submits; admin/engineer reads
    nav.push({ to: '/app/reports',  label: 'Журнал объекта',       icon: ClipboardList });
  }

  // ── Sales CRM ─────────────────────────────────────────────────────────────
  if (canSeeSalesNav(role)) {
    nav.push({ to: '/sales',           label: 'Продажи (CRM)',     icon: Activity });
    nav.push({ to: '/sales/chessboard',label: 'Шахматка',          icon: LayoutGrid });
    nav.push({ to: '/sales/leads',     label: 'Воронка лидов',     icon: Users });

    // Analytics only for SALES_LEAD and COMPANY_ADMIN
    if (canSeeFinanceNav(role)) {
      nav.push({ to: '/sales/analytics', label: 'Аналитика продаж', icon: FileBarChart });
    }
  }

  // ── Admin-only nav items ───────────────────────────────────────────────────
  if (canSeeTeamNav(role)) {
    nav.push({ to: '/app/team',     label: 'Команда',              icon: Building2 });
  }
  if (canSeeBillingNav(role)) {
    nav.push({ to: '/app/billing',  label: 'Тариф и оплата',       icon: CreditCard });
  }
  if (canSeeSettingsNav(role)) {
    nav.push({ to: '/app/settings', label: 'Настройки',            icon: Settings });
  }

  return nav;
}

// ─── PAGE RESOLVER — Construction workspace ───────────────────────────────────
function resolveConstructionPage(path: string) {
  const projectMatch = path.match(PROJECT_ROUTE);
  if (projectMatch) return <ProjectDetailPage projectId={projectMatch[1]} />;
  const drawingMatch = path.match(DRAWING_ROUTE);
  if (drawingMatch) return <DrawingEditorPage drawingId={drawingMatch[1]} />;

  switch (path) {
    case '/app':           return <DashboardPage />;
    case '/app/projects':  return <ProjectsPage />;
    case '/app/tasks':     return <TasksPage />;
    case '/app/materials': return <MaterialsPage />;
    case '/app/expenses':  return <ExpensesPage />;
    case '/app/reports':   return <ReportsPage />;
    case '/app/team':      return <TeamPage />;
    case '/app/billing':   return <BillingPage />;
    case '/app/settings':  return <SettingsPage />;
    default:               return null;
  }
}

// ─── PAGE RESOLVER — Sales CRM ────────────────────────────────────────────────
function resolveSalesPage(path: string) {
  const leadMatch = path.match(LEAD_ROUTE);
  if (leadMatch) return <LeadDetailPage leadId={leadMatch[1]} />;

  switch (path) {
    case '/sales':             return <SalesDashboardPage />;
    case '/sales/chessboard':  return <ChessboardPage />;
    case '/sales/leads':       return <LeadsPipelinePage />;
    case '/sales/analytics':   return <SalesAnalyticsPage />;
    default:                   return null;
  }
}

// ─── ROOT APP COMPONENT ───────────────────────────────────────────────────────
export default function App() {
  const path = usePathname();
  const { session, access, accessError, loading, signOut } = useAuth();
  const [platformGateAuth, setPlatformGateAuth] = useState(false);

  // Restore autonomous platform superadmin session from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PLATFORM_AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { authenticated?: boolean };
        if (parsed.authenticated) setPlatformGateAuth(true);
      }
    } catch {
      // ignore
    }
  }, [path]);

  // ── Autonomous Superadmin Platform (isolated entry) ────────────────────────
  // Accessed via /platform-gate — completely separate from /login
  // SUPER_ADMIN users who authenticated via Supabase also get directed here
  if (path === '/platform-gate' || path.startsWith('/admin')) {
    if (platformGateAuth || access?.role === 'SUPER_ADMIN') {
      return (
        <PlatformConsole
          onSignOut={() => {
            sessionStorage.removeItem(PLATFORM_AUTH_STORAGE_KEY);
            setPlatformGateAuth(false);
            if (session) void signOut();
            window.location.href = '/platform-gate';
          }}
        />
      );
    }
    return <SuperAdminGate onAuthenticated={() => setPlatformGateAuth(true)} />;
  }

  // ── Public routes ──────────────────────────────────────────────────────────
  if (path === '/')               return <LandingPage />;
  if (path === '/login')          return loading ? <Spinner /> : <LoginPage />;
  if (path === '/reset-password') return <ResetPasswordPage />;

  // ── Auth guards ────────────────────────────────────────────────────────────
  if (loading) return <Spinner label="Проверяем доступ…" />;
  if (!session) return <Redirect to="/login" />;

  if (accessError) {
    return (
      <StatusScreen
        title="Не удалось загрузить доступ"
        message="Проверьте соединение и обновите страницу."
        onSignOut={signOut}
      />
    );
  }
  if (!access) {
    return (
      <StatusScreen
        title="Учётная запись не настроена"
        message="Для этого аккаунта ещё не назначен доступ. Обратитесь к администратору вашей компании."
        onSignOut={signOut}
      />
    );
  }

  const blocked = accessBlockMessage(access);
  if (blocked) return <StatusScreen title="Доступ ограничен" message={blocked} onSignOut={signOut} />;

  const role = access.role;
  const nav  = buildNav(role);
  const companyTitle = access.company_name ?? 'Компания';

  // ── Sales CRM routes (/sales/...) ─────────────────────────────────────────
  if (path === '/sales' || path.startsWith('/sales/')) {
    if (!canSeeSalesNav(role)) return <Redirect to="/app" />;
    const page = resolveSalesPage(path);
    if (!page) return <Redirect to="/sales" />;
    return (
      <AppShell nav={nav} title={companyTitle} subtitle="Отдел продаж" onSignOut={signOut}>
        {page}
      </AppShell>
    );
  }

  // ── Construction workspace routes (/app/...) ───────────────────────────────
  if (path === '/app' || path.startsWith('/app/')) {
    // Pure sales roles should land on /sales, not /app dashboard
    if (role === 'SALES_MANAGER' || role === 'SALES_LEAD') return <Redirect to="/sales" />;
    const page = resolveConstructionPage(path);
    if (!page) return <Redirect to="/app" />;
    return (
      <AppShell nav={nav} title={companyTitle} subtitle="Рабочее пространство" onSignOut={signOut}>
        {page}
      </AppShell>
    );
  }

  // ── Default redirect based on role ────────────────────────────────────────
  if (role === 'SALES_MANAGER' || role === 'SALES_LEAD') return <Redirect to="/sales" />;
  return <Redirect to="/app" />;
}
