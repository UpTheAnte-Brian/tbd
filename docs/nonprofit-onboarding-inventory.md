# Nonprofit Onboarding Inventory (Phase 0)

## Current create flow entry points
- `/nonprofits` list page → `NonprofitCreateDrawer` (`app/components/nonprofits/NonprofitCreateDrawer.tsx`) posts to `POST /api/nonprofits`.
- `/admin/nonprofits/[ein]` review page → "Create entity" button posts to `POST /api/admin/nonprofits/entity` (creates `public.entities` + `irs.entity_links` from EIN).

## Current server routes used
- `GET /api/nonprofits` → `listNonprofitDTO()` (`domain/nonprofits/nonprofit-dto.ts`).
- `POST /api/nonprofits` → `createNonprofitDTO()` (`domain/nonprofits/nonprofit-dto.ts`).
- `GET /api/admin/nonprofits/[ein]` → `getNonprofitReview()` (`domain/admin/nonprofits-admin-dto.ts`).
- `POST /api/admin/nonprofits/entity` → `createEntityFromEin()` (`domain/admin/nonprofits-admin-dto.ts`).
- `POST /api/admin/nonprofits/scope` → `upsertScopeRow()` (`domain/admin/nonprofits-admin-dto.ts`).

## Columns required on insert today
- `public.entities` (admin EIN flow): `entity_type`, `name`, `slug`, `external_ids`.
- `public.nonprofits` (standard create flow): `entity_id`, `name`, `org_type` (plus optional `ein`, `website_url`, `mission_statement`, `active`).
- `irs.entity_links` (admin EIN flow): `ein`, `entity_id` (optional `match_type`, `confidence`, `notes`).

Notes
- `createNonprofitDTO()` currently requires `entity_id`, but `NonprofitCreateDrawer` does not supply it; the existing flow likely fails or relies on out-of-band defaults.
