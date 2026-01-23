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

## Notes
- Do not commit secrets.
- Copy values from `npm run sb:local:status` into `.env.local` (or `.env.development.local`).
- The seed/verify scripts load `.env.local` first, then `.env.development.local`.
- Some existing scripts still read `NEXT_PUBLIC_SUPABASE_URL`; set it to the same value if you hit missing env errors.
