# Env setup

## Local dev
1) Copy `.env.example` to `.env.local`.
2) Fill in the required values for your dev Supabase/Stripe/Google projects.
3) If you run import scripts against test data, also create `.env.test.local`.

## Required keys (dev/test)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL` (preferred) or `NEXT_PUBLIC_HOST` (legacy)

## Optional / feature-specific
- `NEXT_PUBLIC_GOOGLE_MAP_ID` (maps styling)
- `NEXT_PUBLIC_GOOGLE_LIBRARIES` (maps features, e.g. `maps,marker,places`)
- `NEXT_PUBLIC_SUPABASE_STORAGE_LOGO_PATH` (logo storage path)
- `NEXT_PUBLIC_BRANDING_DEBUG` (branding diagnostics)
- `EMAIL_FROM`, `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASS` (email testing)

## Test env
- Copy `.env.example` to `.env.test.local` and set your test Supabase URL + service role key.
- These scripts load `.env.test.local`:
  - `npm run importDistricts:test`
  - `npm run importStates`
  - `npm run importAttendanceAreas`
- This script loads `.env.local`:
  - `npm run importDistricts`

## Production
- Set production env vars in your hosting provider (Vercel project settings, etc.).
- If you run Supabase edge functions, set any required vars in Supabase as well.

## Env check
- `npm run env:check` prints missing keys (non-blocking).
- `npm run env:check -- --strict` exits with failure if required keys are missing.
