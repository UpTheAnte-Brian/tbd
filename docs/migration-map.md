# Migration Map

Source of truth: ../project-structure.json

## Checklist
- [ ] Phase 0: prep
  - [ ] docs/migration-map.md
  - [ ] scripts/structure-diff.ts (optional)
  - [ ] scratchfiles/* deprecated (gitignore/quarantine)
  - [ ] app/components/keeper-archive/* and app/lib/keeper-archive/* deprecated
- [ ] Phase 1: api canonicalization
  - [ ] decision: app/api/governance/* vs app/api/entities/[id]/governance/*
  - [ ] deprecate app/api/districts/*
  - [ ] deprecate app/api/nonprofits/*
  - [ ] deprecate app/api/businesses/*
  - [ ] merge app/api/entity-users/route.ts -> app/api/entities/[id]/users/route.ts
  - [ ] review app/api/branding/assets/* vs app/api/entities/[id]/branding/assets/*
  - [ ] review app/api/map/* vs app/api/entities/[id]/map/route.ts
  - [ ] add app/lib/server/rbac.ts
  - [ ] add app/lib/server/route-context.ts
- [ ] Phase 2: components entity-first
  - [ ] merge app/components/districts/* -> app/components/entities/tabs/*
  - [ ] merge app/components/nonprofits/* -> app/components/entities/tabs/governance/*
  - [ ] normalize app/components/branding/EntityLogo.tsx
  - [ ] move app/components/maps/* -> app/components/map/*
  - [ ] review app/components/ui/district-sidebar.tsx and district-* UI primitives
- [ ] Phase 3: dtos and types
  - [ ] move app/data/*.ts -> domain/<area>/*.ts
  - [ ] merge app/lib/types/* -> domain/<area>/*
  - [ ] add domain/index.ts
- [ ] Phase 4: cleanup and deletion
  - [ ] delete api/districts (top-level folder)
  - [ ] delete app/api/district-users and app/api/user-districts (if unused)
  - [ ] delete legacy duplicated governance endpoints
  - [ ] delete keeper-archive folders

## Decisions
- Canonical governance API surface: entity-scoped `/api/entities/[id]/governance/*` for entity UI; keep `/api/governance/*` only for cross-entity admin workflows until parity.
- Canonical branding assets endpoints:

## Status
- Entity UI governance calls migrated: ✅
- Global governance endpoints retained for cross-entity admin: ✅ (still in use? yes)
- Phase 2B map folder normalization: ✅
- Phase 3D legacy user endpoints removed: ✅ (deleted `app/api/entity-users`, `app/api/nonprofit-users`, `app/api/business-users`, `app/api/district-users`, `app/api/user-districts`; canonical `/api/entities/[id]/users`)
- Phase 4A cleanup: ✅ (removed `.storybook`, `public/customers`, `public/hero-desktop.png`, `public/hero-mobile.png`, `public/opengraph-image.png`, `public/AnteUpNation`, `public/UTALogos`, `public/districtLogos`)
