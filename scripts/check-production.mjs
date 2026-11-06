import assert from 'node:assert/strict';

// Read-only checks: no accounts, form submissions or business records are created.
const base = new URL(process.env.PRODUCTION_URL || 'https://imora1.vercel.app');
assert.equal(base.protocol, 'https:', 'PRODUCTION_URL must use HTTPS');
assert.ok(!base.username && !base.password && !base.search && !base.hash, 'Use a public origin without credentials or query parameters');
assert.equal(base.pathname, '/', 'PRODUCTION_URL must be an origin');
let failures = 0;
async function check(label, run) {
  try { await run(); console.log(`PASS ${label}`); }
  catch (error) { failures++; console.error(`FAIL ${label}: ${error.message}`); }
}
async function get(path, status = 200) {
  const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, status, `HTTP ${response.status}, expected ${status}`);
  return response;
}
function secure(response) {
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  const csp = response.headers.get('content-security-policy') || '';
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self'(?:;|$)/);
  assert.match(csp, /base-uri 'self'/);
}
await check('Landing HTML, SEO and security headers', async () => {
  const response = await get('/');
  secure(response);
  assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex/i);
  const html = await response.text();
  assert.match(html, /<html[^>]+lang="uz"/);
  assert.match(html, /<title>[^<]*IMORA[^<]*<\/title>/i);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /Qurilish/);
  assert.doesNotMatch(html, /<meta[^>]+content="[^"]*noindex/i);
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
  assert.ok(scripts.length > 0, 'Missing application bundle');
  for (const script of scripts) {
    assert.equal(new URL(script, base).origin, base.origin, 'Unexpected external script');
    const asset = await get(script);
    assert.match(asset.headers.get('content-type') || '', /javascript/);
  }
});
for (const path of ['/login', '/reset-password', '/admin', '/app', '/app/projects', '/sales', '/app.html']) {
  await check(`Private shell ${path}`, async () => {
    const response = await get(path);
    secure(response);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    const html = await response.text();
    assert.match(html, /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
    assert.doesNotMatch(html, /application\/ld\+json/);
  });
}
await check('Sitemap excludes workspace pages', async () => {
  const xml = await (await get('/sitemap.xml')).text();
  assert.match(xml, /<urlset\b/);
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(locations.length > 0, 'Empty sitemap');
  for (const location of locations) assert.equal(new URL(location).pathname, '/');
});
await check('Robots links to sitemap', async () => {
  assert.match(await (await get('/robots.txt')).text(), /Sitemap:\s*https:\/\/.+\/sitemap\.xml/i);
});
await check('Brand SVG is available', async () => {
  assert.match((await get('/brand/imora-logo.svg')).headers.get('content-type') || '', /image\/svg\+xml/);
});
await check('Unknown page returns 404', () => get('/__imora_missing_page_smoke_check__', 404));
console.log(`\n${failures ? `${failures} failed checks` : 'All public production checks passed'}. Authenticated business flows require separate acceptance testing.`);
process.exitCode = failures ? 1 : 0;
