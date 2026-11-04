# Landing versions

- Active v2: `apps/landing/src/LandingApp.tsx`, scoped `LandingV2.css` and HTML partials.
- Original supplied v2 file: `apps/landing/versions/v2/original.html` (unchanged).
- Archived v1: `apps/landing/versions/v1/`. Its frozen base stylesheet retains the original blue palette.
- Preview v1 locally at `/landing-v1.html`.
- Export a self-contained v1 HTML: `node scripts/export-landing-v1.mjs <absolute-output-path>`.
  Images, scripts and CSS are embedded. Submitting its request form requires internet access and the configured Supabase service.
- System palette is centralized in `tailwind.config.js`. Existing slate/gray classes use charcoal neutrals; sky/blue accents use orange. Success, warning and error colors retain their meaning.
