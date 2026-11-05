# IMORA: production readiness, 2026-11-05

Status: hardening release; public market launch is NOT approved by this document.
Primary URL for now: https://imora1.vercel.app (owner has not selected a domain).

## Requests and data
The landing inserts into public.demo_requests in Supabase project htpiufvtkqjptbmfplpg.
Vercel hosts the frontend, not the customer database. Only active SUPER_ADMIN can read/process demo requests via RLS.
The platform Requests tab is the operational inbox. No automatic Telegram/email notification is configured.
A live aggregate read on 2026-11-05 found 1 request, 0 with status new. No personal data was exported.

## This release
- Administrative MFA enrollment/challenge UI. Database helper and manage-users enforce AAL2 after staged backend rollout.
- Role and tenant boundary regression tests; AAL1 and blocked admin denied. No bypass flag in browser storage.
- No email provider secret in frontend. Manual invitation drafts exclude passwords and explicitly do not claim delivery.
- Security headers/CSP, clickjacking protection, private-page noindex/no-store.
- Uzbek landing metadata, canonical, sitemap, structured SoftwareApplication data, static public HTML.
- Separate private application HTML prevents a landing-page flash on login/workspace routes.
- Per-route titles/language; empty/whitespace lead validation and public-safe error messages.
- Dependency patches; minimatch override 11.0.4 for typescript-estree fixes GHSA-g3hv-75wg-m249. Revisit when upstream updates.
- Automated TypeScript, Node regression tests, production dependency audit and build workflow.

## Deployment sequence
1. Deploy frontend on Vercel and verify /, /login, /admin redirects, /robots.txt, /sitemap.xml and /brand/imora-logo.svg.
2. Apply require_admin_mfa migration, then deploy manage-users with verify_jwt=true.
3. Owner logs in at /admin, enrolls authenticator, saves the setup key securely and verifies the first code.
4. Check that AAL1 cannot list requests or mutate accounts, and owner AAL2 can use the console.
Do not roll back to a frontend without the enrollment screen while mandatory MFA remains enabled.
Emergency MFA recovery requires verified owner access to Supabase, not a public application bypass.

## Launch blockers / owner decisions
- Operator legal identity, support/privacy contact, privacy notice/terms, retention/deletion rules remain undetermined. Do not fabricate these.
- Bot protection for public request intake is not configured. Existing input checks/RLS do NOT prevent anonymous spam. Add server-verified CAPTCHA plus request throttling before advertising.
- Configure verified SMTP/invitation delivery and exercise password recovery on the production origin. Manual drafts are not delivery.
- Confirm Supabase Site URL and allowed reset redirects, signup disabled, leaked-password protection available/enabled.
- Enable error monitoring and alert routing; choose responsible person and response targets.
- Establish database backups and perform an isolated restore drill. No recovery-time claim until tested.
- Owner must complete MFA enrollment and end-to-end authorized workspace/admin acceptance.
- Uploaded source plans remain limited to 2 MB and stored as base64 in drawing JSON. Move large plans to private Storage with tenant RLS, signed URLs and retention before scaling.
- Estimates are manually entered/approved. Uploaded PDFs are not automatically measured; drawings are not professional CAD/BIM. Avoid these marketing claims.
- Subscription payments are manual; no real acquiring integration is configured.
- Run tenant UAT for project → estimate → procurement → expense → report and CRM → payment before accepting paying companies.

## SEO / GEO
Technical metadata and crawlable text are implemented, not ranking guarantees. Connect Search Console, submit sitemap and inspect indexing after launch.
Google states its ordinary SEO practices apply to AI features; no special AI file guarantees inclusion:
https://developers.google.com/search/docs/appearance/ai-features
Keep structured data consistent with actual product behavior; no fabricated reviews, prices or operator identities.

## Security scope
An npm audit with zero known advisories is not a penetration test. SQL fixtures run in an isolated database, not customer production data.
RLS and server authorization remain the security boundary; robots.txt and hiding admin navigation are not access controls.
Supabase advisor warnings for explicitly authenticated SECURITY DEFINER business RPCs require continued review of their role checks/search_path.
