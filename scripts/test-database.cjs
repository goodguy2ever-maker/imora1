const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
 const root=path.resolve(__dirname,'..');
 const dir=path.join(root,'supabase','migrations');
 for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')).sort()){
  await db.exec(fs.readFileSync(path.join(dir,file),'utf8').replace(/^\uFEFF/,''));
  console.log('Applied',file);
 }
 await db.exec(fs.readFileSync(path.join(root,'tests','demo-request-activation.sql'),'utf8').replace(/^\uFEFF/,''));
 console.log('PASS: SQL activation, rollback, authorization and duplicate protection');
 await db.exec(fs.readFileSync(path.join(root,'tests','workspace-security.sql'),'utf8').replace(/^\uFEFF/,''));
 console.log('PASS: workspace roles, RLS, currency, stage audit, procurement and immutable estimates');
 await db.exec(fs.readFileSync(path.join(root,'tests','admin-mfa.sql'),'utf8'));
 console.log('PASS: password-based active admin access and blocked/unknown identity denial');
 await db.exec(fs.readFileSync(path.join(root,'tests','request-throttle.sql'),'utf8'));
 console.log('PASS: repeated-contact limit, normalization, other contacts and time-window expiry');
 await db.exec(fs.readFileSync(path.join(root,'tests','company-seats.sql'),'utf8'));
 console.log('PASS: company seat limits, reactivation, plan downgrade and last administrator');
 await db.close();
})().catch(e=>{console.error(e.message);process.exitCode=1;});
