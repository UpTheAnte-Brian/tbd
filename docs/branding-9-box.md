# 9-Box Branding Usage

## Default behavior
- The app-level 9-box palette in `app/lib/branding/resolveBranding.ts` is the canonical fallback for the whole product.
- Every entity page inherits that app-level 9-box automatically until the entity defines its own branding palettes.
- Every entity page also falls back to the app logo (`/logo.webp`) until the entity uploads a primary logo asset.

## The canonical 9-box
- `primary-0`: primary action / CTA fill
- `primary-1`: light canvas / page background
- `primary-2`: primary action hover or synchronized companion to `primary-0`
- `secondary-0`: muted label / utility shade
- `secondary-1`: dark ink / dark surface
- `secondary-2`: inset surface / soft neutral panel
- `accent-0`: deep accent support
- `accent-1`: high-energy accent / focus emphasis
- `accent-2`: restrained accent support

## Semantic variants derived from the 9-box
- Components should prefer semantic tokens over raw slot colors.
- `surface-page` → `primary-1`
- `surface-card` → `primary-1`
- `surface-inset` → `secondary-2`
- `surface-nav` → `secondary-1`
- `surface-accent` → `primary-0`
- `text-on-light` → `secondary-1`
- `text-on-dark` → `primary-1`
- `border-subtle` → `secondary-2`
- `focus-ring` → `accent-1`

## Usage rules
- Use raw `brand-*` slots for palette swatches, map markers, data visual encoding, or places where the UI is intentionally demonstrating the palette itself.
- Use semantic `surface-*` and `text-on-*` tokens for panels, cards, drawers, overlays, popovers, sidebars, buttons, forms, badges, and empty states.
- Buttons on `surface-accent` must use `text-on-dark`, not `secondary-2`.
- Dark overlays and map controls should use `surface-nav` with `text-on-dark`.
- Light cards and editors should use `surface-card` or `surface-inset` with `text-on-light`.

## Patterns to avoid
- `bg-brand-primary-0` with `text-brand-secondary-2`
- `bg-brand-secondary-0` or `bg-brand-secondary-1` with `text-brand-secondary-2` for primary content
- Raw palette slots used as generic panel backgrounds without matching semantic text tokens

## Entity customization model
- Custom entity palettes override the app fallback slot-by-slot.
- If an entity only defines some palette slots, the missing slots continue to inherit the app fallback values.
- If an entity does not upload a primary logo, the entity page still renders with the app fallback logo.
- This means every entity page always has a complete, readable theme before custom branding exists.
