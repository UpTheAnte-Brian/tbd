/*
  IRS 990-N (e-Postcard) bulk importer

  Downloads the IRS 990-N bulk ZIP, parses the pipe-delimited file, and upserts into:
  - irs.organizations (minimal fields to satisfy FK)
  - irs.returns (return_type = '990N')

  Usage examples
    # Download latest ZIP and import
    pnpm tsx scripts/irs/import-irs-990n.ts --download --district <DISTRICT_UUID>

    # Use an already-downloaded zip
    pnpm tsx scripts/irs/import-irs-990n.ts --zip /path/to/data-download-epostcard.zip --district <DISTRICT_UUID>

    # Use a local extracted .txt file
    pnpm tsx scripts/irs/import-irs-990n.ts --file /path/to/epostcard.txt --district <DISTRICT_UUID>

    # Use env selection (loads .env.test.local, etc.)
    pnpm tsx scripts/irs/import-irs-990n.ts --env test --download --district <DISTRICT_UUID>

  Notes
    - The IRS 990-N bulk file layout has changed over time. This script uses a
      header-driven parser when a header row is present, and falls back to
      conservative positional heuristics otherwise.
    - By default this script expects --district to scope EINs; use --all to import everything.
*/

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import https from "node:https";
import { spawnSync } from "node:child_process";
import readline from "node:readline";

import { createClient } from "@supabase/supabase-js";
import { normalizeEinInput } from "./lib/ein";
import { loadEnvFiles } from "../lib/load-env";
import { logSupabaseError } from "../lib/supabase-error";

const DEFAULT_BATCH_SIZE = 1000;
const DOWNLOAD_URL =
  "https://apps.irs.gov/pub/epostcard/data-download-epostcard.zip";

type Args = {
  env?: string;
  download?: boolean;
  zip?: string;
  file?: string;
  cache?: boolean;
  batchSize?: number;
  debug?: boolean;
  maxRows?: number;
  cleanupFile?: boolean;
  district?: string;
  statuses?: string;
  all?: boolean;
};

type ParsedRow = {
  ein: string;
  tax_year: number;
  tax_period_start: string | null;
  tax_period_end: string | null;
  filed_on: string | null;
  organization_name: string | null;
  website_url: string | null;
  organization_terminated: boolean | null;
  dba_name: string | null;
  mailing_address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
  };
  principal_officer: {
    name: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
  };
};

type HeaderMap = {
  headers: string[];
  normalized: string[];
  index: Record<string, number>;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--env") {
      args.env = argv[i + 1];
      i++;
    } else if (token.startsWith("--env=")) {
      args.env = token.slice("--env=".length);
    } else if (token === "--download") {
      args.download = true;
    } else if (token === "--zip") {
      args.zip = argv[i + 1];
      i++;
    } else if (token.startsWith("--zip=")) {
      args.zip = token.slice("--zip=".length);
    } else if (token === "--file") {
      args.file = argv[i + 1];
      i++;
    } else if (token.startsWith("--file=")) {
      args.file = token.slice("--file=".length);
    } else if (token === "--cache") {
      args.cache = true;
    } else if (token === "--batch-size") {
      args.batchSize = Number(argv[i + 1]);
      i++;
    } else if (token.startsWith("--batch-size=")) {
      args.batchSize = Number(token.slice("--batch-size=".length));
    } else if (token === "--debug") {
      args.debug = true;
    } else if (token === "--max-rows") {
      args.maxRows = Number(argv[i + 1]);
      i++;
    } else if (token.startsWith("--max-rows=")) {
      args.maxRows = Number(token.slice("--max-rows=".length));
    } else if (token === "--district") {
      args.district = argv[i + 1];
      i++;
    } else if (token.startsWith("--district=")) {
      args.district = token.slice("--district=".length);
    } else if (token === "--statuses") {
      args.statuses = argv[i + 1];
      i++;
    } else if (token.startsWith("--statuses=")) {
      args.statuses = token.slice("--statuses=".length);
    } else if (token === "--all") {
      args.all = true;
    }
  }
  return args;
}

function envFilesFor(envName: string): string[] {
  const normalized = envName.trim().toLowerCase();
  if (normalized === "test") return [".env.test.local", ".env.test"];
  if (
    normalized === "local" || normalized === "dev" ||
    normalized === "development"
  ) {
    return [".env.local", ".env.development.local", ".env.development"];
  }
  if (normalized === "prod" || normalized === "production") {
    return [".env.production.local", ".env.production"];
  }
  return [`.env.${normalized}.local`, `.env.${normalized}`];
}

function loadEnvFromArgs(args: Args): void {
  if (!args.env) return;
  const loaded = loadEnvFiles(envFilesFor(args.env));
  if (loaded.length > 0) {
    console.log(`Loaded env: ${loaded.join(", ")}`);
  } else {
    console.warn(`No env files found for --env ${args.env}`);
  }
}

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function parseCommaList(input: string | null | undefined): string[] {
  if (!input) return [];
  return String(input)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getPersistentIrsRoot(): string {
  const root = process.env.IRS_TEOS_XML_ROOT || process.env.IRS_XML_ROOT;
  return path.resolve(root || path.join(process.cwd(), "data", "irs-teos"));
}

function get990nCacheDir(): string {
  const dir = path.join(getPersistentIrsRoot(), "returns-990n");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function findFirstFileMatching(dir: string, pattern: RegExp): string {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      try {
        const hit = findFirstFileMatching(full, pattern);
        if (hit) return hit;
      } catch {}
    } else if (pattern.test(entry.name)) {
      return full;
    }
  }
  throw new Error(`No extracted file matched ${pattern} in ${dir}`);
}

function splitPipe(line: string): string[] {
  return line.split("|").map((s) => s.trim());
}

function normalizeHeader(input: string): string {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function setHeaderIndex(map: HeaderMap, key: string, idx: number) {
  if (map.index[key] == null) map.index[key] = idx;
}

function buildHeaderMap(headers: string[]): HeaderMap {
  const normalized = headers.map(normalizeHeader);
  const map: HeaderMap = { headers, normalized, index: {} };

  normalized.forEach((h, idx) => {
    if (!h) return;

    if (h === "ein" || h.includes("employeridentification")) {
      setHeaderIndex(map, "ein", idx);
    }

    if (h.includes("taxyear") || h === "taxyr" || h.includes("filingyear")) {
      setHeaderIndex(map, "tax_year", idx);
    }

    if (
      h.includes("taxperiodbegin") || h.includes("taxperiodstart") ||
      (h.includes("taxperiod") && h.includes("begin"))
    ) {
      setHeaderIndex(map, "tax_period_start", idx);
    }

    if (
      h.includes("taxperiodend") || h.includes("taxperiodending") ||
      (h.includes("taxperiod") && h.includes("end"))
    ) {
      setHeaderIndex(map, "tax_period_end", idx);
    }

    if (
      h.includes("filedon") || h.includes("filingdate") ||
      h.includes("datereceived") || h.includes("datefiled")
    ) {
      setHeaderIndex(map, "filed_on", idx);
    }

    if (
      h.includes("organizationname") || h.includes("orgname") ||
      h.includes("taxpayername") || (h === "name") ||
      (h.includes("legal") && h.includes("name"))
    ) {
      if (!h.includes("principal")) {
        setHeaderIndex(map, "organization_name", idx);
      }
    }

    if (h.includes("website") || h.includes("weburl") || h.includes("web")) {
      setHeaderIndex(map, "website_url", idx);
    }

    if (h.includes("terminated") || h.includes("termination")) {
      setHeaderIndex(map, "organization_terminated", idx);
    }

    if (
      h.includes("dba") || h.includes("doingbusiness") || h.includes("aka") ||
      h.includes("othername")
    ) {
      setHeaderIndex(map, "dba_name", idx);
    }

    if (h.includes("principal") && h.includes("name")) {
      setHeaderIndex(map, "principal_name", idx);
    }

    if (
      h.includes("principal") && (h.includes("address") || h.includes("street"))
    ) {
      if (!map.index.principal_address1) {
        setHeaderIndex(map, "principal_address1", idx);
      } else {
        setHeaderIndex(map, "principal_address2", idx);
      }
    }

    if (h.includes("principal") && h.includes("city")) {
      setHeaderIndex(map, "principal_city", idx);
    }

    if (h.includes("principal") && h.includes("state")) {
      setHeaderIndex(map, "principal_state", idx);
    }

    if (
      h.includes("principal") && (h.includes("zip") || h.includes("postal"))
    ) {
      setHeaderIndex(map, "principal_zip", idx);
    }

    if (h.includes("principal") && h.includes("country")) {
      setHeaderIndex(map, "principal_country", idx);
    }

    if (
      !h.includes("principal") &&
      (h.includes("address") || h.includes("street"))
    ) {
      if (!map.index.mailing_address1) {
        setHeaderIndex(map, "mailing_address1", idx);
      } else {
        setHeaderIndex(map, "mailing_address2", idx);
      }
    }

    if (!h.includes("principal") && h.includes("city")) {
      setHeaderIndex(map, "mailing_city", idx);
    }

    if (!h.includes("principal") && h.includes("state")) {
      setHeaderIndex(map, "mailing_state", idx);
    }

    if (
      !h.includes("principal") && (h.includes("zip") || h.includes("postal"))
    ) {
      setHeaderIndex(map, "mailing_zip", idx);
    }

    if (!h.includes("principal") && h.includes("country")) {
      setHeaderIndex(map, "mailing_country", idx);
    }
  });

  return map;
}

function looksLikeHeader(cols: string[]): boolean {
  const normalized = cols.map(normalizeHeader);
  const hasEin = normalized.some((h) =>
    h === "ein" || h.includes("employeridentification")
  );
  const hasTax = normalized.some((h) =>
    h.includes("taxyear") || h.includes("taxperiod")
  );
  const hasName = normalized.some((h) =>
    h.includes("organization") || h.includes("taxpayer") || h === "name"
  );
  return hasEin && (hasTax || hasName);
}

function parseBoolean(value: string | null | undefined): boolean | null {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (!v) return null;
  if (["y", "yes", "true", "1"].includes(v)) return true;
  if (["n", "no", "false", "0"].includes(v)) return false;
  return null;
}

function parseDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [m, d, y] = raw.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // IRS 990-N bulk file uses MM-DD-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
    const [m, d, y] = raw.split("-");
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

function normalizeWebsite(value: string | null): string | null {
  if (!value) return null;
  const raw = String(value).trim().replace(/^"+|"+$/g, "");
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  // If it looks like a domain, assume https.
  if (/[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(raw)) return `https://${raw}`;
  return null;
}

function normalizeLegalName(value: string | null): string | null {
  if (!value) return null;
  const raw = String(value).trim().replace(/^"+|"+$/g, "");
  if (!raw) return null;
  return raw.replace(/\s+/g, " ").toUpperCase();
}

function parseYear(value: string | null | undefined): number | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isFinite(year)) return null;
  return year;
}

function getCol(cols: string[], idx: number | undefined): string | null {
  if (idx == null || idx < 0 || idx >= cols.length) return null;
  const v = String(cols[idx] ?? "").trim();
  return v.length ? v : null;
}

function parseRow(
  cols: string[],
  headerMap: HeaderMap | null,
): ParsedRow | null {
  const einRaw = headerMap ? getCol(cols, headerMap.index.ein) : cols[0];
  const ein = normalizeEinInput(einRaw ?? "");
  if (!ein) return null;

  // Header-driven when available; otherwise use IRS 990-N pipe-delimited field order.
  const taxYear = headerMap
    ? parseYear(getCol(cols, headerMap.index.tax_year))
    : parseYear(cols[1] ?? null);

  if (!taxYear) return null;

  const organizationName = headerMap
    ? (getCol(cols, headerMap.index.organization_name) ?? null)
    : (cols[2] ?? null);

  const websiteUrl = normalizeWebsite(
    headerMap
      ? (getCol(cols, headerMap.index.website_url) ?? null)
      : (cols[7] ?? null),
  );

  // IRS 990-N field order (no header):
  // 16 mailing addr1, 17 mailing addr2, 18 mailing city, 20 mailing state, 21 mailing postal, 22 mailing country
  const mailingAddress1 = headerMap
    ? getCol(cols, headerMap.index.mailing_address1)
    : (cols[16] ?? null);
  const mailingAddress2 = headerMap
    ? getCol(cols, headerMap.index.mailing_address2)
    : (cols[17] ?? null);
  const mailingCity = headerMap
    ? getCol(cols, headerMap.index.mailing_city)
    : (cols[18] ?? null);
  const mailingState = headerMap
    ? getCol(cols, headerMap.index.mailing_state)
    : (cols[20] ?? null);
  const mailingZip = headerMap
    ? getCol(cols, headerMap.index.mailing_zip)
    : (cols[21] ?? null);
  const mailingCountry = headerMap
    ? getCol(cols, headerMap.index.mailing_country)
    : (cols[22] ?? null);

  // IRS 990-N field order (no header):
  // 8 principal name, 9 addr1, 10 addr2, 11 city, 14 state, 15 zip, 15 country? -> country is 15? Actually 15 is zip, 15 country is 15? See below.
  const principalName = headerMap
    ? getCol(cols, headerMap.index.principal_name)
    : (cols[8] ?? null);
  const principalAddress1 = headerMap
    ? getCol(cols, headerMap.index.principal_address1)
    : (cols[9] ?? null);
  const principalAddress2 = headerMap
    ? getCol(cols, headerMap.index.principal_address2)
    : (cols[10] ?? null);
  const principalCity = headerMap
    ? getCol(cols, headerMap.index.principal_city)
    : (cols[11] ?? null);
  const principalState = headerMap
    ? getCol(cols, headerMap.index.principal_state)
    : (cols[13] ?? null);
  const principalZip = headerMap
    ? getCol(cols, headerMap.index.principal_zip)
    : (cols[14] ?? null);
  const principalCountry = headerMap
    ? getCol(cols, headerMap.index.principal_country)
    : (cols[15] ?? null);

  const organizationTerminated = headerMap
    ? parseBoolean(getCol(cols, headerMap.index.organization_terminated))
    : parseBoolean(cols[4] ?? null);

  const dbaName = headerMap
    ? getCol(cols, headerMap.index.dba_name)
    : (cols[23] ?? null);

  const taxPeriodStart = headerMap
    ? parseDate(getCol(cols, headerMap.index.tax_period_start))
    : parseDate(cols[5] ?? null);
  const taxPeriodEnd = headerMap
    ? parseDate(getCol(cols, headerMap.index.tax_period_end))
    : parseDate(cols[6] ?? null);
  const filedOn = headerMap
    ? parseDate(getCol(cols, headerMap.index.filed_on))
    : null;

  return {
    ein,
    tax_year: taxYear,
    tax_period_start: taxPeriodStart,
    tax_period_end: taxPeriodEnd,
    filed_on: filedOn,
    organization_name: organizationName?.trim() || null,
    website_url: websiteUrl ?? null,
    organization_terminated: organizationTerminated,
    dba_name: dbaName?.trim() || null,
    mailing_address: {
      line1: mailingAddress1,
      line2: mailingAddress2,
      city: mailingCity,
      state: mailingState,
      zip: mailingZip,
      country: mailingCountry,
    },
    principal_officer: {
      name: principalName,
      address_line1: principalAddress1,
      address_line2: principalAddress2,
      city: principalCity,
      state: principalState,
      zip: principalZip,
      country: principalCountry,
    },
  };
}

async function downloadFile(url: string, outPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(outPath);
    const req = https.get(url, (res) => {
      if (
        res.statusCode && res.statusCode >= 300 && res.statusCode < 400 &&
        res.headers.location
      ) {
        file.close();
        fs.unlinkSync(outPath);
        downloadFile(res.headers.location, outPath).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: ${url} (${res.statusCode})`));
        return;
      }

      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
    });
    req.on("error", (err) => {
      try {
        file.close();
      } catch {}
      reject(err);
    });
  });
}

function unzipToDir(zipPath: string, outDir: string) {
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync("unzip", ["-o", "-q", zipPath, "-d", outDir], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    throw new Error(
      `Failed to unzip ${zipPath}. Ensure the 'unzip' command is available on your system.`,
    );
  }
}

async function upsertOrganizations(params: {
  supabaseAdmin: any;
  rows: ParsedRow[];
}) {
  const { supabaseAdmin, rows } = params;
  if (!rows.length) return { upserted: 0, insertedFallback: 0 };

  const nowIso = new Date().toISOString();

  const withName = rows
    .filter((r) => r.organization_name && r.organization_name.trim().length)
    .map((r) => ({
      ein: r.ein,
      legal_name: r.organization_name!.trim(),
      normalized_legal_name: normalizeLegalName(r.organization_name),
      website: r.website_url ?? null,
      last_seen_at: nowIso,
    }));

  const withoutName = rows
    .filter((r) => !r.organization_name || !r.organization_name.trim().length)
    .map((r) => ({
      ein: r.ein,
      legal_name: `UNKNOWN ORG (${r.ein})`,
      normalized_legal_name: null,
      last_seen_at: nowIso,
    }));

  if (withName.length) {
    const { error } = await supabaseAdmin
      .schema("irs")
      .from("organizations")
      .upsert(withName, { onConflict: "ein" });
    if (error) throw error;
  }

  if (withoutName.length) {
    const { error } = await supabaseAdmin
      .schema("irs")
      .from("organizations")
      .upsert(withoutName, { onConflict: "ein", ignoreDuplicates: true });
    if (error) throw error;
  }

  return { upserted: withName.length, insertedFallback: withoutName.length };
}

async function upsertReturns(params: {
  supabaseAdmin: any;
  rows: ParsedRow[];
}) {
  const { supabaseAdmin, rows } = params;
  if (!rows.length) return { upserted: 0 };

  const payload = rows.map((r) => ({
    ein: r.ein,
    return_type: "990N",
    tax_year: r.tax_year,
    tax_period_start: r.tax_period_start,
    tax_period_end: r.tax_period_end,
    filed_on: r.filed_on,
    source_system: "irs_990n",
    // 990-N confirms receipts not greater than $50,000.
    gross_receipts_cap: 50000,
    is_terminated: r.organization_terminated ?? null,
    principal_officer_name: r.principal_officer.name ?? null,
    return_name: r.organization_name ?? null,
    return_meta: {
      organization_name: r.organization_name ?? null,
      tax_period_start: r.tax_period_start,
      tax_period_end: r.tax_period_end,
      website_url: r.website_url ?? null,
      organization_terminated: r.organization_terminated ?? null,
      dba_name: r.dba_name ?? null,
      mailing_address: r.mailing_address,
      principal_officer: r.principal_officer,
    },
  }));

  const { error } = await supabaseAdmin
    .schema("irs")
    .from("returns")
    .upsert(payload, { onConflict: "ein,return_type,tax_year" });

  if (error) throw error;

  return { upserted: payload.length };
}

type EntityAddressRow = {
  id: string;
  entity_id: string;
  source_system: string | null;
};

async function upsertEntityAddressesFrom990n(params: {
  supabaseAdmin: any;
  rows: ParsedRow[];
}) {
  const { supabaseAdmin, rows } = params;
  if (!rows.length) {
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  const bestByEin = new Map<string, ParsedRow>();
  for (const row of rows) {
    if (!row?.ein) continue;
    if (!row.mailing_address?.line1) continue;
    const existing = bestByEin.get(row.ein);
    if (!existing || row.tax_year > existing.tax_year) {
      bestByEin.set(row.ein, row);
    }
  }

  if (!bestByEin.size) {
    return { inserted: 0, updated: 0, skipped: rows.length };
  }

  const eins = Array.from(bestByEin.keys());

  const { data: scopeRows, error: scopeError } = await supabaseAdmin
    .schema("public")
    .from("superintendent_scope_nonprofits")
    .select("ein, entity_id")
    .in("ein", eins)
    .not("entity_id", "is", null);

  if (scopeError) throw scopeError;

  const { data: linkRows, error: linkError } = await supabaseAdmin
    .schema("irs")
    .from("entity_links")
    .select("ein, entity_id")
    .in("ein", eins);

  if (linkError) throw linkError;

  const entityIdByEin = new Map<string, string>();
  for (const row of (scopeRows ?? []) as Array<{
    ein: string;
    entity_id: string | null;
  }>) {
    if (row.ein && row.entity_id && !entityIdByEin.has(row.ein)) {
      entityIdByEin.set(row.ein, row.entity_id);
    }
  }
  for (const row of (linkRows ?? []) as Array<{
    ein: string;
    entity_id: string;
  }>) {
    if (row.ein && row.entity_id) {
      entityIdByEin.set(row.ein, row.entity_id);
    }
  }

  const entityIds = Array.from(new Set(entityIdByEin.values()));
  if (!entityIds.length) {
    return { inserted: 0, updated: 0, skipped: bestByEin.size };
  }

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .schema("public")
    .from("entity_addresses")
    .select("id, entity_id, source_system")
    .in("entity_id", entityIds)
    .eq("is_primary", true);

  if (existingError) throw existingError;

  const existingByEntityId = new Map<string, EntityAddressRow>();
  for (const row of (existingRows ?? []) as EntityAddressRow[]) {
    if (!existingByEntityId.has(row.entity_id)) {
      existingByEntityId.set(row.entity_id, row);
    }
  }

  const toInsert: Array<Record<string, any>> = [];
  const toUpdate: Array<Record<string, any>> = [];
  let skipped = 0;

  for (const [ein, row] of bestByEin.entries()) {
    const entityId = entityIdByEin.get(ein);
    if (!entityId) {
      skipped++;
      continue;
    }

    const payload = {
      entity_id: entityId,
      label: "mailing",
      address1: row.mailing_address.line1,
      address2: row.mailing_address.line2,
      city: row.mailing_address.city,
      state: row.mailing_address.state,
      postal: row.mailing_address.zip,
      country: row.mailing_address.country ?? "US",
      source_system: "irs_990n",
      source_ref: `990N:${row.tax_year}`,
      is_primary: true,
    };

    const existing = existingByEntityId.get(entityId);
    if (!existing) {
      toInsert.push(payload);
      continue;
    }

    if ((existing.source_system ?? "").toLowerCase() === "irs_990n") {
      toUpdate.push({ id: existing.id, ...payload });
    } else {
      skipped++;
    }
  }

  if (toInsert.length) {
    const { error } = await supabaseAdmin
      .schema("public")
      .from("entity_addresses")
      .insert(toInsert);
    if (error) throw error;
  }

  if (toUpdate.length) {
    const { error } = await supabaseAdmin
      .schema("public")
      .from("entity_addresses")
      .upsert(toUpdate, { onConflict: "id" });
    if (error) throw error;
  }

  return { inserted: toInsert.length, updated: toUpdate.length, skipped };
}

async function loadScopedEinSet(params: {
  supabaseAdmin: any;
  districtEntityId: string;
  statuses: string[];
}): Promise<Set<string>> {
  const { supabaseAdmin, districtEntityId, statuses } = params;
  const set = new Set<string>();

  const pageSize = 1000;
  let from = 0;

  while (true) {
    let q = supabaseAdmin
      .schema("public")
      .from("superintendent_scope_nonprofits")
      .select("ein", { count: "exact" })
      .eq("district_entity_id", districtEntityId);

    if (statuses.length) q = q.in("status", statuses);

    q = q.range(from, from + pageSize - 1);

    const { data, error } = await q;
    if (error) {
      throw new Error(`Failed to load scoped EINs: ${error.message}`);
    }

    const rows = (data || []) as Array<{ ein: string }>;
    for (const r of rows) {
      const ein = normalizeEinInput(r.ein);
      if (ein) set.add(ein);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return set;
}

async function parseAndIngest(params: {
  supabaseAdmin: any;
  filePath: string;
  batchSize: number;
  debug?: boolean;
  maxRows?: number;
  scopedEinSet?: Set<string> | null;
}) {
  const { supabaseAdmin, filePath, batchSize, debug, maxRows, scopedEinSet } =
    params;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let headerMap: HeaderMap | null = null;
  let lineCount = 0;
  let mappedCount = 0;
  let skippedCount = 0;
  let upsertedOrgs = 0;
  let upsertedReturns = 0;
  let insertedAddresses = 0;
  let updatedAddresses = 0;
  let debugPrinted = 0;

  let batch: ParsedRow[] = [];
  const started = Date.now();

  for await (const lineRaw of rl) {
    const line = String(lineRaw ?? "").trim();
    if (!line) continue;
    lineCount++;

    const cols = splitPipe(line);

    if (!headerMap && looksLikeHeader(cols)) {
      headerMap = buildHeaderMap(cols);
      continue;
    }

    const parsed = parseRow(cols, headerMap);
    if (!parsed) {
      skippedCount++;
      continue;
    }

    if (scopedEinSet && scopedEinSet.size && !scopedEinSet.has(parsed.ein)) {
      skippedCount++;
      continue;
    }

    mappedCount++;
    batch.push(parsed);

    if (debug && debugPrinted < 3) {
      debugPrinted++;
      console.log("Sample parsed row:", parsed);
    }

    if (batch.length >= batchSize) {
      const orgResult = await upsertOrganizations({
        supabaseAdmin,
        rows: batch,
      });
      const returnResult = await upsertReturns({ supabaseAdmin, rows: batch });
      const addressResult = await upsertEntityAddressesFrom990n({
        supabaseAdmin,
        rows: batch,
      });
      upsertedOrgs += orgResult.upserted + orgResult.insertedFallback;
      upsertedReturns += returnResult.upserted;
      insertedAddresses += addressResult.inserted;
      updatedAddresses += addressResult.updated;
      batch = [];

      const elapsedSec = Math.max(1, Math.round((Date.now() - started) / 1000));
      const rate = Math.round(lineCount / elapsedSec);
      process.stdout.write(
        `\rParsed ${lineCount.toLocaleString()} lines, mapped ${mappedCount.toLocaleString()}, skipped ${skippedCount.toLocaleString()}, upserted orgs ${upsertedOrgs.toLocaleString()}, returns ${upsertedReturns.toLocaleString()}, addresses ${(
          insertedAddresses + updatedAddresses
        ).toLocaleString()} (${rate.toLocaleString()} lines/sec)   `,
      );
    }

    if (maxRows && lineCount >= maxRows) break;
  }

  if (batch.length) {
    const orgResult = await upsertOrganizations({ supabaseAdmin, rows: batch });
    const returnResult = await upsertReturns({ supabaseAdmin, rows: batch });
    const addressResult = await upsertEntityAddressesFrom990n({
      supabaseAdmin,
      rows: batch,
    });
    upsertedOrgs += orgResult.upserted + orgResult.insertedFallback;
    upsertedReturns += returnResult.upserted;
    insertedAddresses += addressResult.inserted;
    updatedAddresses += addressResult.updated;
  }

  const elapsedSec = Math.max(1, Math.round((Date.now() - started) / 1000));
  process.stdout.write("\n");
  console.log(
    `Done. lines=${lineCount.toLocaleString()} mapped=${mappedCount.toLocaleString()} skipped=${skippedCount.toLocaleString()} orgs=${upsertedOrgs.toLocaleString()} returns=${upsertedReturns.toLocaleString()} addresses=${
      insertedAddresses + updatedAddresses
    } (inserted=${insertedAddresses}, updated=${updatedAddresses}) elapsed=${elapsedSec}s`,
  );
}

async function resolveInputFile(args: Args): Promise<string> {
  if (args.file) {
    const resolved = path.resolve(args.file);
    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${resolved}`);
    }
    args.cleanupFile = false;
    return resolved;
  }

  let zipPath = args.zip ? path.resolve(args.zip) : "";

  if (args.download || !zipPath) {
    if (!args.download && !zipPath) {
      throw new Error("Provide --download, --zip, or --file.");
    }

    const downloadDir = args.cache
      ? get990nCacheDir()
      : fs.mkdtempSync(path.join(os.tmpdir(), "irs-990n-"));
    zipPath = path.join(downloadDir, "data-download-epostcard.zip");

    console.log(`Downloading 990-N bulk ZIP to ${zipPath}...`);
    await downloadFile(DOWNLOAD_URL, zipPath);
  }

  if (!fs.existsSync(zipPath)) {
    throw new Error(`ZIP not found: ${zipPath}`);
  }

  const extractDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "irs-990n-extract-"),
  );
  unzipToDir(zipPath, extractDir);

  const txtPath = findFirstFileMatching(extractDir, /\.txt$/i);
  args.cleanupFile = true;
  return txtPath;
}

async function main() {
  const args = parseArgs(process.argv);
  loadEnvFromArgs(args);

  const batchSize = Number.isFinite(args.batchSize) && (args.batchSize ?? 0) > 0
    ? (args.batchSize as number)
    : DEFAULT_BATCH_SIZE;

  const filePath = await resolveInputFile(args);

  const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const districtEntityId = args.district ? String(args.district) : null;
  const statuses = parseCommaList(args.statuses ?? "candidate,active");

  if (!districtEntityId && !args.all) {
    throw new Error(
      "Provide --district <DISTRICT_UUID> (or use --all to import every EIN).",
    );
  }

  let scopedEinSet: Set<string> | null = null;
  if (districtEntityId) {
    console.log(
      `Loading scoped EINs for district_entity_id=${districtEntityId} statuses=${
        statuses.join(",")
      }`,
    );
    scopedEinSet = await loadScopedEinSet({
      supabaseAdmin,
      districtEntityId,
      statuses,
    });
    console.log(`Loaded ${scopedEinSet.size.toLocaleString()} EINs.`);
  }

  console.log(`Parsing 990-N file: ${filePath}`);

  try {
    await parseAndIngest({
      supabaseAdmin,
      filePath,
      batchSize,
      debug: args.debug ?? false,
      maxRows: args.maxRows,
      scopedEinSet,
    });
  } catch (err) {
    logSupabaseError("990-N import failed", err);
    process.exitCode = 1;
  } finally {
    if (args.cleanupFile) {
      try {
        await fsp.unlink(filePath);
      } catch {}
    }
  }
}

main().catch((err) => {
  logSupabaseError("990-N import crashed", err);
  process.exit(1);
});
