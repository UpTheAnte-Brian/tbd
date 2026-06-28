# Local Supabase

## Start local Supabase
- `npm run sb:local:start`

## Get local URLs/keys
- `npm run sb:local:status`

## Required env vars (seed/verify)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Fresh seeded DB
- `npm run env:local:fresh`

## Runtime modes
- `npm run dev`
  - Starts local Supabase if needed.
  - Generates `.env.supabase.local.generated`.
  - Runs the app with `.env.local` as the base file and `.env.supabase.local.generated` overriding only the Supabase target values.
- `npm run dev:remote`
  - Runs the app directly against the Supabase values already stored in `.env.local`.
  - Does not start or depend on local Supabase.
- `npm run dev:cloud:dev`
  - Runs the app with `.env.local` as the base file and `.env.dev.cloud` overriding it.
- `npm run dev:cloud:test`
  - Runs the app with `.env.local` as the base file and `.env.test.cloud` overriding it.

## Remote CLI workflows
- `supabase link`, `supabase db pull`, `supabase db push`, and `supabase migration list --linked` use the linked project ref plus the remote Postgres password.
- They do **not** use `NEXT_PUBLIC_SUPABASE_URL` from `.env.local`.
- The linked project ref for this repo is stored under `supabase/.temp/project-ref`.

## Notes
- Do not commit secrets.
- Do not overwrite your remote `.env.local` just to use local Supabase. `npm run dev` now handles local overrides automatically.
- If you want a dedicated remote runtime file instead of keeping remote Supabase keys in `.env.local`, use `.env.dev.cloud` or `.env.test.cloud`.
- `seed:local` force-checks that it is pointed at `127.0.0.1` or `localhost` before writing anything.
