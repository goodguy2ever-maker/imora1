const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual event handlers with isolated network/state dependencies.
function handler(file, name, context) {
  const filename = path.join(__dirname, '..', file);
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, `Handler ${name} exists`);
  const code = ts.transpileModule(found.getText(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return vm.runInNewContext(`${code}\n${name}`, context);
}
function state() {
  const events = [];
  return {
    events,
    cName: ' IMORA client ', cCity: '', cEmail: '', cPhone: '', cStatus: 'trial',
    cAccessUntil: '2027-01-01', cLimit: '10', aEmail: ' admin@example.test ',
    aPassword: 'test-password', aName: ' Director ', aPosition: '',
    setFormError: value => events.push(['error', value]),
    setSaving: value => events.push(['saving', value]),
    setCreateOpen: value => events.push(['open', value]),
    load: async () => events.push(['reload']),
    errorMessage: error => error.message,
  };
}
test('manual company creation sends a single action payload and accepts company_id response', async () => {
  const context = state();
  let args;
  context.callManageUsers = async (...values) => { args = values; return { company_id: 'new-company' }; };
  await handler('apps/platform/src/tabs/CompaniesManagementTab.tsx', 'createCompany', context)({ preventDefault() {} });
  assert.equal(args.length, 1);
  assert.equal(args[0].action, 'create_company');
  assert.equal(args[0].name, 'IMORA client');
  assert.equal(args[0].admin_email, 'admin@example.test');
  assert.equal(args[0].admin_name, 'Director');
  assert.equal(args[0].user_limit, 10);
  assert.deepEqual(context.events, [['error', ''], ['saving', true], ['open', false], ['reload'], ['saving', false]]);
});
test('manual creation failure keeps the form open, displays error and clears busy state', async () => {
  const context = state();
  context.callManageUsers = async () => { throw new Error('Access denied'); };
  await handler('apps/platform/src/tabs/CompaniesManagementTab.tsx', 'createCompany', context)({ preventDefault() {} });
  assert.deepEqual(context.events, [['error', ''], ['saving', true], ['error', 'Access denied'], ['saving', false]]);
});
function activationState() {
  const context = state();
  Object.assign(context, {
    activeRequest: { id: 'request-a', contact: 'admin@example.test', position: 'Director' },
    companyName: ' Client ', adminName: ' Director ', adminEmail: ' admin@example.test ',
    activating: false,
    setRequests: fn => context.events.push(['requests', fn([context.activeRequest])]),
    adminPassword: 'test-password', selectedPlan: 'business', userLimit: '10', accessDays: '14',
    setActivating: value => context.events.push(['activating', value]),
    setActivationError: value => context.events.push(['activationError', value]),
    setActiveRequest: value => context.events.push(['activeRequest', value]),
    setCredentialCard: value => context.events.push(['credentials', value]),
    updateStatus: async () => context.events.push(['status']),
    sendDirectorAccessEmail: async () => { context.events.push(['email']); return { success: true, mode: 'api' }; },
    window: { location: { origin: 'https://example.test' } },
  });
  return context;
}
test('request activation uses the same single-object action contract', async () => {
  const context = activationState();
  let args;
  context.callManageUsers = async (...values) => { args = values; return { company_id: 'new-company' }; };
  await handler('apps/platform/src/tabs/RequestsPipelineTab.tsx', 'handleActivateCompany', context)();
  assert.equal(args.length, 1);
  assert.equal(args[0].action, 'create_company');
  assert.equal(args[0].admin_email, 'admin@example.test');
  assert.equal(args[0].demo_request_id, 'request-a');
  assert.equal(args[0].name, 'Client');
  assert.equal(args[0].admin_name, 'Director');
  assert.equal(context.events.some(([event]) => event === 'credentials'), true);
  assert.deepEqual(context.events.at(-1), ['activating', false]);
});
test('failed creation from a request does not update status, send email or show credentials', async () => {
  const context = activationState();
  context.callManageUsers = async () => { throw new Error('Duplicate email'); };
  await handler('apps/platform/src/tabs/RequestsPipelineTab.tsx', 'handleActivateCompany', context)();
  assert.deepEqual(context.events, [
    ['activating', true], ['activationError', ''], ['activationError', 'Duplicate email. Если соединение прервалось, обновите список компаний и заявок перед повторной попыткой.'], ['activating', false],
  ]);
});

test('email failure preserves the created company credentials and never offers creation again', async () => {
  const context = activationState();
  let calls = 0;
  context.callManageUsers = async () => { calls++; return { company_id: 'company-a' }; };
  context.sendDirectorAccessEmail = async () => { throw new Error('Email unavailable'); };
  await handler('apps/platform/src/tabs/RequestsPipelineTab.tsx', 'handleActivateCompany', context)();
  assert.equal(calls, 1);
  const card = context.events.filter(([e]) => e === 'credentials').at(-1)[1];
  assert.equal(card.login, 'admin@example.test');
  assert.equal(card.tempPass, 'test-password');
  assert.ok(card.warning);
  assert.equal(card.emailSent, false);
  assert.ok(context.events.some(([e, value]) => e === 'activeRequest' && value === null));
  assert.equal(context.events.some(([e, value]) => e === 'activationError' && value), false);
});
test('simulated email never appears as actually sent', async () => {
  const context = activationState();
  context.callManageUsers = async () => ({ company_id: 'company-a' });
  context.sendDirectorAccessEmail = async () => ({ success: true, mode: 'simulation', mailtoUrl: 'mailto:admin@example.test' });
  await handler('apps/platform/src/tabs/RequestsPipelineTab.tsx', 'handleActivateCompany', context)();
  const card = context.events.filter(([e]) => e === 'credentials').at(-1)[1];
  assert.equal(card.emailSent, false);
  assert.equal(card.mailtoUrl, 'mailto:admin@example.test');
});
test('linked requests and in-flight activation do not issue another create call', async () => {
  for (const patch of [{ activating: true }, { activeRequest: { id: 'request-a', company_id: 'company-a' } }]) {
    const context = Object.assign(activationState(), patch);
    context.callManageUsers = async () => { throw new Error('Must not be called'); };
    await handler('apps/platform/src/tabs/RequestsPipelineTab.tsx', 'handleActivateCompany', context)();
    assert.equal(context.events.length, 0);
  }
});
test('status update errors are visible and do not update local rows', async () => {
  const context = activationState();
  context.setError = value => context.events.push(['error', value]);
  context.supabase = { from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ error: new Error('Denied') }) }) }) }) }) };
  await handler('apps/platform/src/tabs/RequestsPipelineTab.tsx', 'updateStatus', context)('request-a', 'contacted');
  assert.deepEqual(context.events, [['error', ''], ['error', 'Denied']]);
});
