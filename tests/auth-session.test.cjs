const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
function mount() {
  const initial = deferred();
  const rpc = [];
  const slots = [];
  let cursor = 0, effect, cleanup, listener, subscribed = true;
  const timers = new Map();
  let nextTimer = 0;
  const backend = {
    auth: {
      getSession: () => initial.promise,
      onAuthStateChange: fn => { listener = fn; return { data: { subscription: { unsubscribe() { subscribed = false; } } } }; },
      signOut: async () => { listener('SIGNED_OUT', null); return { error: null }; },
    },
    rpc: () => { const request = deferred(); rpc.push(request); return request.promise; },
  };
  const react = {
    useState(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = value;
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: value };
      return slots[index];
    },
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useEffect: fn => { if (!effect) effect = fn; },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', 'src/context/AuthProvider.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
      if (name === '@/lib/supabase') return { supabase: backend };
      if (name === '@/context/auth-context') return { AuthContext: { Provider: 'Provider' } };
      throw new Error(name);
    },
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
  });
  function value() { cursor = 0; return exports.AuthProvider({ children: null }).props.value; }
  value(); cleanup = effect();
  return {
    initial, rpc, value,
    emit: session => listener(session ? 'SIGNED_IN' : 'SIGNED_OUT', session),
    flushTimers() { const tasks = [...timers.values()]; timers.clear(); tasks.forEach(fn => fn()); },
    unmount: () => cleanup(), isSubscribed: () => subscribed,
  };
}
const session = id => ({ user: { id } });
const adminAccess = { role: 'SUPER_ADMIN', profile_status: 'active' };
test('rights lookup is deferred until after the synchronous Auth callback', async () => {
  const app = mount();
  assert.equal(app.emit(session('admin')), undefined);
  assert.equal(app.rpc.length, 0);
  assert.equal(app.value().loading, true);
  app.flushTimers();
  assert.equal(app.rpc.length, 1);
  app.rpc[0].resolve({ data: adminAccess, error: null });
  await settle();
  assert.equal(app.value().access.role, 'SUPER_ADMIN');
  assert.equal(app.value().loading, false);
});
test('signing out invalidates an outstanding admin rights response', async () => {
  const app = mount();
  app.emit(session('admin')); app.flushTimers();
  app.emit(null);
  app.rpc[0].resolve({ data: adminAccess });
  await settle();
  assert.equal(app.value().session, null);
  assert.equal(app.value().access, null);
  assert.equal(app.value().loading, false);
});
test('switching users clears old rights and ignores stale responses', async () => {
  const app = mount();
  app.emit(session('admin')); app.flushTimers();
  app.emit(session('member'));
  assert.equal(app.value().access, null);
  app.flushTimers();
  app.rpc[1].resolve({ data: { role: 'MEMBER', profile_status: 'active' } });
  await settle();
  app.rpc[0].resolve({ data: adminAccess });
  await settle();
  assert.equal(app.value().session.user.id, 'member');
  assert.equal(app.value().access.role, 'MEMBER');
});
test('late initial-session result cannot replace a newer signed-in session', async () => {
  const app = mount();
  app.emit(session('member'));
  app.initial.resolve({ data: { session: session('old-admin') } });
  await settle();
  assert.equal(app.value().session.user.id, 'member');
});
test('rights failure clears loading and shows access error', async () => {
  const app = mount();
  app.emit(session('admin')); app.flushTimers();
  app.rpc[0].resolve({ data: null, error: { message: 'Denied' } });
  await settle();
  assert.equal(app.value().access, null);
  assert.equal(app.value().accessError, true);
  assert.equal(app.value().loading, false);
});
test('initial-session failure cannot leave an infinite spinner', async () => {
  const app = mount();
  app.initial.reject(new Error('Unavailable'));
  await settle();
  assert.equal(app.value().loading, false);
  assert.equal(app.value().accessError, true);
});
test('cleanup cancels scheduled RPC and unsubscribes from Auth', () => {
  const app = mount();
  app.emit(session('admin'));
  app.unmount(); app.flushTimers();
  assert.equal(app.rpc.length, 0);
  assert.equal(app.isSubscribed(), false);
});
