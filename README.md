# Nexa

Career-mentorship platform (AYFDAS). Next.js (App Router, TypeScript) + Tailwind + shadcn-style UI on Vercel, Supabase for database, auth, RLS, storage, edge functions and realtime.
Specs: *Nexa Technical Specification* and *Nexa Development Day-by-Day Plan* (11-day MVP build, 19-29 Oct 2026).

## Day 1 checklist (do these once, in order)

PowerShell, from the folder that holds this project:

1. **GitHub**: create a *private* repo `nexa`, then
   ```powershell
   git init; git add .; git commit -m "Day 1: foundation"
   git branch -M main; git remote add origin https://github.com/<you>/nexa.git; git push -u origin main
   ```
2. **Supabase**: New project. Region: the closest one offered to Cameroon. Save the database password.
   Then *Project Settings > API*: copy the Project URL and the anon/publishable key.
3. **Run the migration** (pick one):
   - Dashboard: *SQL Editor* > paste `supabase/migrations/20261019100000_schema.sql` > Run.
   - or CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.
4. **Local env**: copy `.env.example` to `.env.local`, paste the URL and key. Then
   ```powershell
   npm install
   npm run dev      # http://localhost:3000
   ```
5. **Vercel**: Add New > Project > import the GitHub repo. Under Environment Variables add the same two `NEXT_PUBLIC_...` values. Deploy.
6. **First admin (after the Day 2 sign-up form exists)**: admins can only be created from the database. Sign up once as a normal student through the app, then in the SQL Editor:
   ```sql
   update public.profiles
   set role_id = (select id from public.roles where name = 'admin')
   where id = '<your user id, from Authentication > Users>';
   ```
   (Do not use the dashboard's "Add user" button: the sign-up trigger requires a date of birth in the user metadata, so it will refuse a user with none.)
7. **Backups (free plan)**: GitHub repo > Settings > Secrets and variables > Actions > new secret `SUPABASE_DB_URL` = the **Session pooler** connection string (*Project Settings > Database > Connection string*). The nightly workflow in `.github/workflows/db-backup.yml` then saves a dump every night. Download one by hand weekly.

**Done when (Day 1):** the Vercel URL shows the Nexa home page, `/student` redirects to `/login`, and in the Supabase *Table Editor* all 16 tables show "RLS enabled".

## Rules that keep this safe

- Never put the service-role / secret key in `.env.local`, in Vercel `NEXT_PUBLIC_` variables, or in any browser code.
- Every new table gets `enable row level security` in the same migration that creates it.
- Pages never call Supabase directly: add a function in `src/lib/data/` instead.
- Schema changes are new files in `supabase/migrations/` (never edit one that has been applied to the real project).

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run typecheck` / `npm run lint` | Checks |
| `npm run types` | Regenerate `src/types/database.ts` after a schema change (needs `npx supabase link` once) |
| `npm run test:db` | Rebuilds a throwaway local Postgres, applies all migrations, runs `supabase/tests/*.test.sql` (needs local Postgres; Linux/macOS/WSL) |

## Layout

```
src/app/            routes (student/, pro/, admin/ each guarded by a layout)
src/components/     ui/ primitives, navbar, footer, empty-state
src/lib/supabase/   browser, server and middleware clients
src/lib/auth.ts     getCurrentUser, requireAccessLevel
src/lib/data/       the only place that talks to Supabase tables
supabase/migrations SQL migrations (source of truth for the database)
supabase/tests      SQL tests + a mock of the Supabase auth schema (test only)
```
