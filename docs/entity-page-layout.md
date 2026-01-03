# Entity Page Layout

## Routes (entity pages)
- app/entities/[id]/page.tsx#L7
- app/districts/[id]/page.tsx#L7
- app/nonprofits/[id]/page.tsx#L7
- app/businesses/[id]/page.tsx#L7

## Shell components (current responsibilities)
- app/components/entities/panels/EntityPanel.tsx#L27
  - Fetches entity details from `/api/entities/:id`.
  - Resolves `entityType` from props or API response.
  - Reads `tab` from query params, defaults to `overview`.
  - Writes tab changes to the URL via `router.replace`.
  - Renders the mobile header block, tab selector, and main tab content.
- app/components/entities/EntityPageLayout.tsx#L18
  - Two-column shell with `EntitySidebar` on desktop and content on the right.
- app/components/entities/shared/EntitySidebar.tsx#L24
  - Desktop-only sticky sidebar.
  - Shows logo (via `EntityLogo`) and desktop tab buttons.
  - Shows `BrandPaletteCube` preview.
- app/components/entities/shared/EntityHeader.tsx#L13
  - Displays entity name, type badge, active status, id/slug metadata.
- app/components/entities/panels/EntityPanelTabs.tsx#L30
  - Renders tab buttons or a select based on `tabsVariant`.
  - Switches tab content between `overview`, `branding`, `users`, `map`.
- app/components/branding/EntityLogo.tsx#L19
  - Renders entity logo with fallbacks and size constraints.
- app/components/entities/tabs/branding/EntityBrandingTab.tsx#L12
  - Wraps `EntityBrandingPanel` for the branding tab.
- app/components/branding/panels/EntityBrandingPanel.tsx#L21
  - Handles branding assets/palettes/typography data and UI.

## Tab selection (current behavior)
- Query param `?tab=` drives the active tab.
- Parsed in `EntityPanel` via `useSearchParams`.
- Updates via `router.replace(`${pathname}?${params.toString()}`)`.
- Tabs render as buttons on desktop and a `<select>` on mobile (`tabsVariant="select"`).

## Known layout bugs
- Top alignment mismatch between sidebar and main content.
  - Likely caused by the sidebar using `sticky top-20` while the main content has no matching top offset, plus the right column padding/border in `EntityPageLayout` (`md:pl-4 md:border-l`) making the top edges feel misaligned. See `app/components/entities/shared/EntitySidebar.tsx#L33` and `app/components/entities/EntityPageLayout.tsx#L35`.
- Logo resize issues in the sidebar header.
  - The sidebar locks the logo container to `h-20` while `EntityLogo` uses `minHeight` + inline width/height and an `img` that is `object-contain`, which can cause inconsistent vertical sizing across assets. See `app/components/entities/shared/EntitySidebar.tsx#L36` and `app/components/branding/EntityLogo.tsx#L109`.
- Mobile layout inconsistencies between header, tabs, and content.
  - Mobile stack lives in `EntityPanel` with `space-y-4` and custom ordering (logo + select tabs + header), while the desktop path relies on `EntityPanelTabs` spacing (`mt-4`) and `EntityPageLayout` spacing (`space-y-6 md:space-y-0`), which can create uneven vertical rhythm when switching breakpoints. See `app/components/entities/panels/EntityPanel.tsx#L120`, `app/components/entities/panels/EntityPanelTabs.tsx#L75`, and `app/components/entities/EntityPageLayout.tsx#L35`.
