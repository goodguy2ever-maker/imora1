const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function edge(service) {
  const file = path.join(__dirname, '..', 'supabase/functions/manage-users/index.ts');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  let serve;
  vm.runInNewContext(code, {
    exports: {}, Response, console,
    Deno: { env: { get: () => 'test' }, serve: fn => { serve = fn; } },
    require: () => ({ createClient: () => service }),
  });
  return body => serve(new Request('https://example.test/manage-users', {
    method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
}
function service(role = 'SUPER_ADMIN', status = 'active') {
  const calls = [];
  return {
    calls,
    auth: {
      getUser: async () => ({ data: { user: { id: 'actor-a' } } }),
      admin: {
        createUser: async args => { calls.push(['createUser', args]); return { data: { user: { id: 'admin-a' } } }; },
        deleteUser: async id => { calls.push(['deleteUser', id]); return {}; },
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'actor-a', role, status, company_id: 'company-a' } }) }) }) }),
    rpc: async (name, args) => { calls.push(['rpc', name, args]); return { data: 'created-company' }; },
  };
}
const payload = {
  action: 'create_company', name: 'Client', admin_name: 'Director',
  admin_email: 'admin@example.test', admin_password: 'test-password',
  status: 'trial', access_until: '2027-01-01', user_limit: 10,
};
test('only an active SUPER_ADMIN may create a company', async () => {
  for (const [role, status] of [['COMPANY_ADMIN', 'active'], ['MEMBER', 'active'], ['SUPER_ADMIN', 'blocked']]) {
    const backend = service(role, status);
    const response = await edge(backend)(payload);
    assert.equal(response.status, 403);
    assert.equal(backend.calls.length, 0);
  }
});
test('manual creation uses the existing server RPC and correct field names', async () => {
  const backend = service();
  const response = await edge(backend)(payload);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).company_id, 'created-company');
  const call = backend.calls.find(([name]) => name === 'rpc');
  assert.equal(call[1], 'create_company_with_admin');
  assert.equal(call[2].p_name, 'Client');
  assert.equal(call[2].p_admin_name, 'Director');
});
test('request activation selects the atomic RPC and passes the request identifier', async () => {
  const backend = service();
  const requestId = '11111111-1111-4111-8111-111111111111';
  const response = await edge(backend)({ ...payload, demo_request_id: requestId });
  assert.equal(response.status, 200);
  const call = backend.calls.find(([name]) => name === 'rpc');
  assert.equal(call[1], 'create_company_from_demo_request');
  assert.equal(call[2].p_request_id, requestId);
});
test('RPC failure compensates the newly created Auth user', async () => {
  const backend = service();
  backend.rpc = async () => ({ error: { message: 'Request already activated' } });
  assert.equal((await edge(backend)(payload)).status, 400);
  assert.equal(backend.calls.at(-1)[0], 'deleteUser');
  assert.equal(backend.calls.at(-1)[1], 'admin-a');
});
test('malformed request identifier fails before creating an Auth user', async () => {
  const backend = service();
  assert.equal((await edge(backend)({ ...payload, demo_request_id: 'invalid' })).status, 400);
  assert.equal(backend.calls.length, 0);
});

