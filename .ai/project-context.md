# Project Context – Up The Ante Platform

## Tech Stack
- Next.js 14 App Router
- TypeScript (strict)
- TailwindCSS
- Supabase (Postgres + RLS planned/partial)
- Stripe
- Google Maps JS API

## Architectural Principles
- DTO layer sits between Supabase queries and UI
- No Supabase client calls directly from React components (fetch UI → API route → DTO)
- API routes should stay thin and delegate to DTO/service helpers
- Shared logic belongs in `/lib` or `/services`, not in components

## Linting & TypeScript Rules
- `strict` mode on; `no-explicit-any` enforced
- Prefer `unknown` over `any` in error handling
- Catch clauses type errors as `unknown`
- Prefer discriminated unions over enums where practical
- Do not silence TypeScript errors without an inline explanation

## Component Standards
- Functional components only
- Server Components by default; Client Components explicitly `"use client"`
- Components should be small, composable, and entity-agnostic when possible (district, business, nonprofit)
- Naming: Pages `page.tsx`; Panels `*Panels.tsx`; DTOs `*-dto.ts`; Hooks `use*`

## Supabase Usage Rules
- Clients: server routes/components use `utils/supabase/server.ts` or `utils/supabase/route.ts`; client components use `utils/supabase/client.ts`; middleware uses `utils/supabase/middleware.ts`
- Data access: UI uses API route → DTO/service; no direct Supabase calls from components
- Authorization intended via RLS (in progress)

## CSS / Tailwind Rules
- Utility-first Tailwind
- Avoid inline styles except when computed values require it

## Branding & Theming
- Multi-entity branding (districts, businesses, nonprofits) should support logo, palette, and fonts coming from Supabase
- Components should accept branding props/context when branding is needed

## What NOT To Do
- Do not bypass DTOs with ad-hoc Supabase calls
- Do not assume “admin” implies global admin unless explicitly set
- Avoid reintroducing deprecated tables or legacy `*_users` patterns

## Uncertain / Need Confirmation
- Semantic Tailwind tokens like `text-brand-primary`/`bg-brand-accent` are not present in the current theme; confirm whether we plan to add a tokenized design system or keep using palette classes.
- “All entity permissions flow through `entity_users`” — current code still references other role sources (e.g., `profiles` global role); confirm the canonical role model.
- “All authorization enforced via RLS” — some routes rely on elevated/platform admin checks; confirm rollout plan.
- “No hardcoded brand colors” — current UI uses Tailwind grays/blues; clarify if a theming layer will replace these.

## Implicit Standards Observed
- Favor typed DTO mappers for Supabase rows before returning to UI.
- Use `react-hot-toast` for user feedback on async actions.
- Keep UI data-fetching in API routes; client components use `fetch` to those routes rather than Supabase directly.
- Keep governance UI in accordion sections to separate concerns (meetings, motions, votes, board management).
- Prefer schema-qualified Supabase calls (e.g., `.schema("governance")`) and avoid schema names in `.from`.

## Two Most Pressing Concerns
- Governance data vs. schema drift: recent errors around missing columns (`created_at` on approvals/minutes) and missing `created_by` highlight the need to align DTO queries with the actual Supabase schema and add defensive null handling. Suggest running a schema audit and updating DTO selects/order clauses to match columns, plus adding migrations if fields are required.
- Theming/legibility consistency: UI still uses raw Tailwind grays/blues on dark green backgrounds, leading to contrast issues. Suggest introducing a small design token layer (colors + spacing) or at least standardizing a neutral palette for governance screens to ensure WCAG-friendly contrast and predictable theming hooks for future branding.
