# Domain Layer

The `domain/` folders are the canonical home for DTOs and shared types.

- `app/data` and `app/lib/types` are legacy re-export layers until phased out.
- Keep migrations incremental and scoped to a single domain at a time.
