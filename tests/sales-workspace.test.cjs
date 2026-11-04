const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
function fn(file, name, context = {}) {
  const p = path.join(__dirname, '..', file);
  const ast = ts.createSourceFile(p, fs.readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let node;
  function visit(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === name) node = n; ts.forEachChild(n, visit); }
  visit(ast); assert.ok(node, name);
  const code = ts.transpileModule(node.getText(ast).replace(/^export /, ''), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return vm.runInNewContext(`${code}\n${name}`, context);
}
function leadContext() {
  const events = [];
  const unit = { id: 'unit-a', project_id: 'project-a', currency: 'KZT' };
  const context = {
    events, data: { units: [unit], projects: [] }, access: { role: 'SALES_MANAGER' }, session: { user: { id: 'seller-a' } },
    name: ' Client ', phone: ' 1234567 ', email: '', unitId: 'unit-a', projectId: '', budget: '1200.50', managerId: 'other-manager', currency: 'USD', source: ' site ', method: 'cash', notes: '',
    setBusy: v => events.push(['busy',v]), setActionError: v => events.push(['error',v]), setOpen: v => events.push(['open',v]),
    setName() {}, setPhone() {}, setEmail() {}, setBudget() {}, setNotes() {}, reload: async () => events.push(['reload']), errorMessage: e => e.message,
    supabase: { from: table => ({ insert: payload => { events.push(['insert',table,payload]); return { select: () => ({ single: async () => ({ data: { id: 'new-uuid' } }) }) }; } }) },
  };
  return context;
}
test('lead creation persists to Supabase with the authenticated manager and selected units currency', async () => {
  const context = leadContext();
  await fn('src/pages/sales/LeadsPipelinePage.tsx', 'create', context)({ preventDefault() {} });
  const [,table,payload] = context.events.find(([event]) => event === 'insert');
  assert.equal(table,'leads'); assert.equal(payload.manager_id,'seller-a'); assert.equal(payload.currency,'KZT');
  assert.equal(payload.project_id,'project-a'); assert.equal(payload.interested_unit_id,'unit-a');
  assert.equal(payload.client_name,'Client'); assert.equal(payload.budget,1200.5);
  assert.equal(payload.id,undefined); assert.equal(payload.company_id,undefined);
  assert.ok(context.events.some(([e,v]) => e === 'open' && v === false));
});
test('failed lead insert keeps form open and clears busy state', async () => {
  const context = leadContext();
  context.supabase = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ error: new Error('RLS denied') }) }) }) }) };
  await fn('src/pages/sales/LeadsPipelinePage.tsx', 'create', context)({ preventDefault() {} });
  assert.ok(context.events.some(([e,v]) => e === 'error' && v === 'RLS denied'));
  assert.equal(context.events.some(([e]) => e === 'open' || e === 'reload'),false);
  assert.deepEqual(context.events.at(-1),['busy',false]);
});
test('sales totals keep currencies separate and distinguish agreed from received payments', () => {
  const totals = fn('src/lib/sales.ts','salesTotals')({
    leads: [{ stage:'contract',currency:'RUB',agreed_price:'1000' },{ stage:'new',currency:'RUB',agreed_price:5000 },{ stage:'payment',currency:'USD',agreed_price:10 }],
    payments: [{ currency:'RUB',amount:'1000',status:'pending',paid_amount:200 },{ currency:'USD',amount:10,status:'paid',paid_amount:null }],
  });
  assert.equal(totals.find(t => t.currency === 'RUB').agreed,1000);
  assert.equal(totals.find(t => t.currency === 'RUB').received,200);
  assert.equal(totals.find(t => t.currency === 'USD').received,10);
  assert.equal(totals.length,2);
});
test('data loading pages past the first API row limit', async () => {
  const ranges = [];
  const rows = fn('src/lib/sales.ts','rows',{ supabase: { from: () => ({ select: () => ({ order: () => ({ range: async (start,end) => { ranges.push([start,end]); return { data: start === 0 ? Array.from({length:500},(_,id) => ({id})) : [{id:500}] }; } }) }) }) } });
  assert.equal((await rows('leads')).length,501);
  assert.deepEqual(ranges,[[0,499],[500,999]]);
});
test('API read failure propagates instead of displaying misleading empty totals', async () => {
  const rows = fn('src/lib/sales.ts','rows',{ supabase: { from: () => ({ select: () => ({ order: () => ({ range: async () => ({ error: new Error('Disconnected') }) }) }) }) } });
  await assert.rejects(rows('leads'),/Disconnected/);
});
test('drawing marker totals are recalculated and invalid prices are excluded', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..','src/lib/drawing.ts'),'utf8'),{ compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020} }).outputText,{exports});
  const parsed = exports.parseDrawingData({ markers: [
    {id:'a',x:1,y:1,title:'Paint',quantity:2.5,unit_price:12.34,total_price:999999},
    {id:'b',x:1,y:1,title:'Bad',quantity:1,unit_price:-1,total_price:1},
  ] });
  assert.equal(parsed.markers.length,1); assert.equal(parsed.markers[0].total_price,30.85);
});
test('money formatting retains fractional currency units', () => {
  const money = fn('src/lib/format.ts','formatMoney');
  assert.match(money(12.34,'USD'),/12,34/);
  assert.match(money(12.34,'KZT'),/12,34/);
});
