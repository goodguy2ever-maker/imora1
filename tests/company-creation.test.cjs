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
  assert.equal(args[0].company_name, 'IMORA client');
  assert.equal(args[0].admin_email, 'admin@example.test');
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
    adminPassword: 'test-password', selectedPlan: 'business', userLimit: '10', accessDays: '14',
    setActivating: value => context.events.push(['activating', value]),
    setActivationError: value => context.events.push(['activationError', value]),
    setActiveRequest: value => context.events.push(['activeRequest', value]),
    setCredentialCard: value => context.events.push(['credentials', value]),
    updateStatus: async () => context.events.push(['status']),
    sendDirectorAccessEmail: async () => { context.events.push(['email']); return { success: true }; },
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
  assert.equal(context.events.some(([event]) => event === 'credentials'), true);
  assert.deepEqual(context.events.at(-1), ['activating', false]);
});
test('failed creation from a request does not update status, send email or show credentials', async () => {
  const context = activationState();
  context.callManageUsers = async () => { throw new Error('Duplicate email'); };
  await handler('apps/platform/src/tabs/RequestsPipelineTab.tsx', 'handleActivateCompany', context)();
  assert.deepEqual(context.events, [
    ['activating', true], ['activationError', ''], ['activationError', 'Duplicate email'], ['activating', false],
  ]);
});
