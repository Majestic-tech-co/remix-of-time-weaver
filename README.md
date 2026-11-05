# Majestic — time tracking

Time tracking for freelance work: a live timer, timesheets, customers and projects with budgets, kanban boards, deductible receipts, and Manitoba GST/PST tax reports with PDF export.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routes in `src/routes`)
- Tailwind CSS v4 + shadcn/ui components (`src/components/ui`)
- [Supabase](https://supabase.com) for the database, auth and receipt file storage
- Deployed on [Vercel](https://vercel.com); [Nitro](https://nitro.build) builds for Vercel automatically there

## Local development

```bash
bun install
bun run dev
```

The app runs at http://localhost:8080. It needs these variables in `.env`:

| Variable | Used by |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser client |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server-side rendering |

The publishable key is safe to expose; row-level security keeps each user's data private. Never put a service-role/secret key in `.env` in this repo.

## Deploying

Pushing to `main` deploys on Vercel. If you change the Supabase project, update the same variables in the Vercel project settings, and add the site's domain to the Supabase Auth **Site URL** and **Redirect URLs** so sign-up emails link back to the app.

## Database

Schema changes live in `supabase/migrations` as plain SQL, applied in filename order. To apply new ones with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <project-id>
supabase db push
```

On the original Lovable Cloud database, the Boards migration (`20261027150400_boards.sql`) was applied outside the CLI. Mark it as applied once before your first `db push` there: `supabase migration repair --status applied 20261027150400`.

Tables: `customers`, `projects`, `timesheets`, `expenses`, `tax_settings`, `boards`, `board_columns`, `board_cards`, plus a private `receipts` storage bucket. After a schema change, regenerate `src/integrations/supabase/types.ts` with `supabase gen types typescript --linked`.
