/*
# BuildAI 06: estimate lines fill in their company automatically

Plain-English summary
Adding a line to an estimate from the project screen did not send the company, and the table did not fill it in, so the save failed. The company is now filled in from the signed-in user's company, the same way the other workspace tables already work.

1. Modified object
- `estimate_lines.company_id`: defaults to the signed-in user's company when not provided.

2. Security
- Row level security is unchanged. The default only fills the value; the existing rules still decide what may be written.

3. Important notes
- No existing rows are changed.
*/

ALTER TABLE public.estimate_lines ALTER COLUMN company_id SET DEFAULT app.my_company_id();
