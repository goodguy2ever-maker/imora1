const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(file, dependencies, globals = {}) {
  const source = readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    ...globals,
  }, { filename: file });
  return exports;
}
const accessHelpers = load('src/lib/access.ts', {
  '@/lib/format': { formatDate: value => value },
});
const component = name => ({ __esModule: true, default: name });
function render(route, auth) {
  const dependencies = {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'lucide-react': {},
    '@/context/useAuth': { useAuth: () => auth },
    '@/lib/access': accessHelpers,
    '@/lib/router': { usePathname: () => route },
    '@/components/Redirect': { Redirect: 'Redirect' },
    '@/components/StatusScreen': component('StatusScreen'),
    '@/components/ui': { Spinner: 'Spinner' },
    '@/components/AppShell': { AppShell: 'AppShell' },
    '../apps/platform/src/PlatformConsole': component('PlatformConsole'),
  };
  for (const page of [
    'LandingPage', 'LoginPage', 'ResetPasswordPage',
    ...['DashboardPage', 'ProjectsPage', 'ProjectDetailPage', 'DrawingEditorPage', 'TasksPage',
      'MaterialsPage', 'ExpensesPage', 'ReportsPage', 'TeamPage', 'SettingsPage', 'BillingPage'].map(p => `app/${p}`),
    ...['SalesDashboardPage', 'ChessboardPage', 'LeadsPipelinePage', 'LeadDetailPage', 'SalesAnalyticsPage'].map(p => `sales/${p}`),
  ]) dependencies[`@/pages/${page}`] = component(page);
  const sessionStorage = { getItem: () => JSON.stringify({ authenticated: true, role: 'SUPER_ADMIN' }) };
  return load('src/App.tsx', dependencies, { sessionStorage }).default();
}
const admin = {
  session: { user: { id: 'admin-user', email: 'admin@example.test' } },
  access: { role: 'SUPER_ADMIN', profile_status: 'active', company_id: null },
  accessError: false, loading: false, signOut() {},
};
for (const route of ['/admin', '/admin/companies', '/platform-gate']) {
  test(`${route}: forged browser flag cannot admit an anonymous visitor`, () => {
    const view = render(route, { ...admin, session: null, access: null });
    assert.equal(view.type, 'Redirect');
    assert.equal(view.props.to, '/login');
  });
  test(`${route}: waits for access loading`, () => {
    assert.equal(render(route, { ...admin, loading: true }).type, 'Spinner');
  });
  test(`${route}: active server-provided SUPER_ADMIN enters console`, () => {
    assert.equal(render(route, admin).type, 'PlatformConsole');
  });
  test(`${route}: blocked SUPER_ADMIN cannot enter console`, () => {
    const view = render(route, { ...admin, access: { ...admin.access, profile_status: 'blocked' } });
    assert.equal(view.type, 'StatusScreen');
    assert.equal(view.props.title, 'Доступ ограничен');
  });
  test(`${route}: company admin cannot enter platform console`, () => {
    const view = render(route, { ...admin, access: {
      role: 'COMPANY_ADMIN', profile_status: 'active', company_id: 'company-a', company_status: 'active',
    } });
    assert.equal(view.type, 'StatusScreen');
    assert.equal(view.props.title, 'Доступ запрещён');
  });
  test(`${route}: missing or failed access never opens console`, () => {
    for (const state of [{ access: null }, { accessError: true }]) {
      assert.equal(render(route, { ...admin, ...state }).type, 'StatusScreen');
    }
  });
}
test('SUPER_ADMIN arriving from login through /app is directed to /admin', () => {
  const view = render('/app', admin);
  assert.equal(view.type, 'Redirect');
  assert.equal(view.props.to, '/admin');
});
