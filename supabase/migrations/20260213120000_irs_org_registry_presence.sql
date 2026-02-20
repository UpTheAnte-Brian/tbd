-- Option A: add per-source "presence" stamps to irs.organizations
-- This lets the app answer "is it in Pub78 / revoked / etc" without scraping the IRS UI.

alter table irs.organizations
  add column if not exists pub78_last_seen_at timestamptz null,
  add column if not exists revocation_last_seen_at timestamptz null,
  add column if not exists epostcard_last_seen_at timestamptz null,
  add column if not exists eobmf_last_seen_at timestamptz null;

-- Convenience booleans (kept in sync by the import script)
alter table irs.organizations
  add column if not exists is_pub78 boolean not null default false,
  add column if not exists is_revoked boolean not null default false;

create index if not exists organizations_pub78_last_seen_at_idx
  on irs.organizations (pub78_last_seen_at);

create index if not exists organizations_revocation_last_seen_at_idx
  on irs.organizations (revocation_last_seen_at);

create index if not exists organizations_epostcard_last_seen_at_idx
  on irs.organizations (epostcard_last_seen_at);

create index if not exists organizations_eobmf_last_seen_at_idx
  on irs.organizations (eobmf_last_seen_at);

create index if not exists organizations_is_pub78_idx
  on irs.organizations (is_pub78);

create index if not exists organizations_is_revoked_idx
  on irs.organizations (is_revoked);
