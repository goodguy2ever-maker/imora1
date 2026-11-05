const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/emailService.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {exports:exportsObject});
test('manual invitation draft never exposes passwords or claims delivery', async () => {
  for (const name of ['sendDirectorAccessEmail','sendTeamMemberInviteEmail']) {
    const result = await exportsObject[name]({ to:'admin@example.test', directorName:'Director', memberName:'Member', companyName:'Company', loginUrl:'https://example.test/login', tempPassword:'secret-password-123' });
    assert.equal(result.success,false);
    assert.equal(result.mode,'fallback_mailto');
    assert.ok(!JSON.stringify(result).includes('secret-password-123'));
    assert.match(result.mailtoUrl,/^mailto:/);
  }
});
