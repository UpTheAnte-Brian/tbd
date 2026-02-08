# Org Type Smoke Check

1. Open `/admin/nonprofits` and pick a district with multiple scope nonprofits.
2. Use the Type dropdown to set one row to `District Foundation`.
3. Confirm the row updates and refresh `/districts/{districtId}?tab=superintendent`:
   - The selected nonprofit displays as `District Foundation`.
   - District Foundation rows appear first, then Up the Ante, then External Charity.
4. Try setting a second row in the same district to `District Foundation` and confirm the UI shows:
   "This district already has a District Foundation. Change the existing one first."
5. Activate a scoped nonprofit and confirm `public.nonprofits.org_type` matches the scope row.
   - You can verify from the admin review panel or by inspecting the `nonprofits` table.
