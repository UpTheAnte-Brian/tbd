import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { loadEnvFiles } from "./lib/load-env";
import { logSupabaseError } from "./lib/supabase-error";

type Args = {
  env: string;
  limit?: number;
  dryRun: boolean;
  debug: boolean;
};

type ParsedRow = {
  formid: string | null;
  districtName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  columns: string[];
};

type Summary = {
  parsed: number;
  processed: number;
  matched: number;
  inserted: number;
  updated: number;
  expired: number;
  unmatched: string[];
  skipped: number;
};

const SOURCE_URL =
  "https://pub.education.mn.gov/MdeOrgView/districts/superintendentsDistricts";
const CONTACT_ROLE = "superintendent";
const SOURCE_SYSTEM = "mde";

function parseArgs(argv: string[]): Args {
  const args: Args = {
    env: "dev",
    dryRun: false,
    debug: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--env") {
      args.env = argv[i + 1] ?? args.env;
      i += 1;
    } else if (token.startsWith("--env=")) {
      args.env = token.slice("--env=".length);
    } else if (token === "--limit") {
      const value = argv[i + 1];
      if (value) args.limit = Number(value);
      i += 1;
    } else if (token.startsWith("--limit=")) {
      const value = token.slice("--limit=".length);
      args.limit = Number(value);
    } else if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--debug") {
      args.debug = true;
    }
  }

  if (args.limit != null && !Number.isFinite(args.limit)) {
    throw new Error(`Invalid --limit value: ${args.limit}`);
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

function loadEnvFor(envName: string): void {
  const loaded = loadEnvFiles(envFilesFor(envName));
  if (loaded.length > 0) {
    console.log(`Loaded env: ${loaded.join(", ")}`);
  } else {
    console.warn(`No env files found for --env ${envName}`);
  }
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  }
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return { url, serviceKey };
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeFormid(value: string | null): string | null {
  if (!value) return null;
  const cleaned = cleanText(value);
  const match = cleaned.match(/\b\d{4}-\d{2}\b/);
  if (match) return match[0];
  const normalized = cleaned.replace(/\s+/g, "");
  return normalized.length ? normalized : null;
}

function normalizeEmail(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  return cleaned.length ? cleaned : null;
}

function normalizeName(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, " ");
  return cleaned.length ? cleaned : null;
}

function pickHeaderIndex(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((header) => header.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

function extractEmail($cell: cheerio.Cheerio<cheerio.Element>): string | null {
  const mailto = $cell.find("a[href^='mailto:']").attr("href");
  if (mailto) {
    const raw = mailto.replace(/^mailto:/i, "").trim();
    const email = raw.split("?")[0]?.trim();
    return email || null;
  }
  const text = cleanText($cell.text());
  if (text.includes("@")) return text;
  return null;
}

function extractPhone($cell: cheerio.Cheerio<cheerio.Element>): string | null {
  const tel = $cell.find("a[href^='tel:']").attr("href");
  if (tel) {
    const raw = tel.replace(/^tel:/i, "").trim();
    return raw || null;
  }
  const text = cleanText($cell.text());
  return text || null;
}

function extractTable(
  $: cheerio.CheerioAPI,
): { headers: string[]; rows: cheerio.Cheerio<cheerio.Element> } {
  const tables = $("table").toArray();
  if (tables.length === 0) {
    throw new Error("No <table> elements found on the MDE page.");
  }

  let bestTable = tables[0];
  let bestScore = -1;

  for (const table of tables) {
    const $table = $(table);
    const headerCells = $table.find("thead tr").first().find("th, td")
      .toArray();
    const headers = headerCells.length > 0
      ? headerCells.map((cell) => cleanText($(cell).text()))
      : $table.find("tr").first().find("th, td")
        .toArray()
        .map((cell) => cleanText($(cell).text()));
    if (headers.length === 0) continue;
    const normalized = headers.map(normalizeHeader);
    let score = 0;
    if (
      pickHeaderIndex(normalized, ["formid", "formidnumber", "formnumber"]) >=
        0
    ) score += 3;
    if (pickHeaderIndex(normalized, ["superintendent", "superint"]) >= 0) {
      score += 3;
    }
    if (pickHeaderIndex(normalized, ["email", "emailaddress"]) >= 0) score += 1;
    if (pickHeaderIndex(normalized, ["district", "districtname"]) >= 0) {
      score += 1;
    }
    if (pickHeaderIndex(normalized, ["phone", "telephone", "tel"]) >= 0) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTable = table;
    }
  }

  const $best = $(bestTable);
  const headerCells = $best.find("thead tr").first().find("th, td").toArray();
  let usingFirstRow = headerCells.length === 0;
  let headers = headerCells.length > 0
    ? headerCells.map((cell) => cleanText($(cell).text()))
    : $best.find("tr").first().find("th, td")
      .toArray()
      .map((cell) => cleanText($(cell).text()));

  let rows = $best.find("tbody tr");
  if (rows.length === 0) {
    rows = $best.find("tr");
  }

  // Heuristic: check if first row is actually data, not headers
  if (rows.length > 0) {
    const $firstRow = rows.first();
    const firstRowCells = $firstRow.find("td, th").toArray();
    const cellTexts = firstRowCells.map((cell) => cleanText($(cell).text()));
    // If any cell matches a formid pattern or contains an email, treat as data row
    const looksLikeData = cellTexts.some(
      (txt) =>
        /\b\d{4}-\d{2}\b/.test(txt) ||
        txt.includes("@"),
    );
    if (usingFirstRow && looksLikeData) {
      // Do not slice away first row; treat as data
      usingFirstRow = false;
      headers = [];
    }
  }
  // Only slice first row if we are using it as header and it doesn't look like data
  if (usingFirstRow && rows.length > 0) {
    rows = rows.slice(1);
  }

  return { headers, rows };
}

function parseRowsFromHtml(html: string): ParsedRow[] {
  const $ = cheerio.load(html);
  const { headers, rows } = extractTable($);
  const normalizedHeaders = headers.map(normalizeHeader);

  let formidIdx = pickHeaderIndex(normalizedHeaders, [
    "formid",
    "formidnumber",
    "formnumber",
    "formid#",
  ]);
  let districtIdx = pickHeaderIndex(normalizedHeaders, [
    "district",
    "districtname",
  ]);
  let superintendentIdx = pickHeaderIndex(normalizedHeaders, [
    "superintendent",
    "superint",
  ]);
  let emailIdx = pickHeaderIndex(normalizedHeaders, [
    "email",
    "emailaddress",
    "emailaddr",
  ]);
  let phoneIdx = pickHeaderIndex(normalizedHeaders, [
    "phone",
    "telephone",
    "tel",
    "phone#",
  ]);

  // Fallback: if headers missing, use positional indices
  const sampleCellsCount = rows.length > 0
    ? rows.first().find("td, th").length
    : 0;

  if ((formidIdx < 0 || superintendentIdx < 0)) {
    // Fallback to positional indices for common table shapes
    if (sampleCellsCount >= 5) {
      superintendentIdx = 0;
      formidIdx = 1;
      districtIdx = 2;
      emailIdx = 3;
      phoneIdx = 4;
    } else if (sampleCellsCount === 4) {
      superintendentIdx = 0;
      formidIdx = 1;
      districtIdx = 2;
      emailIdx = 3;
      phoneIdx = -1;
    }
    // Warn with more info
    console.warn(
      `Could not confidently detect Form ID or Superintendent columns (sampleCellsCount=${sampleCellsCount}). Positional fallback may be used. Enable --debug to inspect parsed rows.`,
    );
  }

  const parsed: ParsedRow[] = [];

  rows.each((_, row) => {
    const $row = $(row);
    const cells = $row.find("td, th").toArray();
    if (cells.length === 0) return;

    const columns = cells.map((cell) => cleanText($(cell).text()));

    const formidRaw = formidIdx >= 0 && cells[formidIdx]
      ? cleanText($(cells[formidIdx]).text())
      : null;
    const districtRaw = districtIdx >= 0 && cells[districtIdx]
      ? cleanText($(cells[districtIdx]).text())
      : null;
    const nameRaw = superintendentIdx >= 0 && cells[superintendentIdx]
      ? cleanText($(cells[superintendentIdx]).text())
      : null;
    const emailRaw = emailIdx >= 0 && cells[emailIdx]
      ? extractEmail($(cells[emailIdx]))
      : null;
    const phoneRaw = phoneIdx >= 0 && cells[phoneIdx]
      ? extractPhone($(cells[phoneIdx]))
      : null;

    let formid = normalizeFormid(formidRaw);
    let districtName = districtRaw || null;
    let name = nameRaw || null;
    const email = emailRaw || null;
    const phone = phoneRaw || null;

    // Per-row fallback: if formid is null, scan columns for a formid pattern
    if (!formid) {
      for (const val of columns) {
        const m = val.match(/\b\d{4}-\d{2}\b/);
        if (m) {
          formid = m[0];
          break;
        }
      }
    }
    // If name is null and there are cells, use first cell
    if (!name && cells.length > 0) {
      name = cleanText($(cells[0]).text()) || null;
    }
    // If districtName is null and there are at least 3 cells, use third cell
    if (!districtName && cells.length > 2) {
      districtName = cleanText($(cells[2]).text()) || null;
    }

    if (!formid && columns.every((value) => value === "")) {
      return;
    }

    parsed.push({
      formid,
      districtName,
      name,
      email,
      phone,
      columns,
    });
  });

  return parsed;
}

function buildRawPayload(row: ParsedRow): Record<string, unknown> {
  return {
    formid: row.formid,
    district_name: row.districtName,
    superintendent_name: row.name,
    email: row.email,
    phone: row.phone,
    columns: row.columns,
    source_url: SOURCE_URL,
    captured_at: new Date().toISOString(),
  };
}

function formatRowPreview(row: ParsedRow): Record<string, unknown> {
  return {
    formid: row.formid,
    districtName: row.districtName,
    name: row.name,
    email: row.email,
    phone: row.phone,
  };
}

async function fetchMdeHtml(): Promise<string> {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch MDE superintendent page: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

async function resolveEntityId(
  supabase: ReturnType<typeof createClient>,
  formid: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("district_metadata")
    .select("entity_id")
    .eq("formid", formid)
    .limit(2);

  if (error) {
    logSupabaseError(`Lookup district_metadata formid=${formid}`, error);
    return null;
  }

  if (!data || data.length === 0) return null;
  if (data.length > 1) {
    console.warn(
      `Multiple district_metadata rows found for formid=${formid}; using first.`,
    );
  }

  return data[0]?.entity_id ?? null;
}

function matchCurrentContact(
  current: Array<{ id: string; name: string | null; email: string | null }>,
  row: ParsedRow,
): { id: string; matchByEmail: boolean } | null {
  const targetEmail = normalizeEmail(row.email);
  if (targetEmail) {
    const match = current.find(
      (contact) => normalizeEmail(contact.email) === targetEmail,
    );
    if (match) return { id: match.id, matchByEmail: true };
  }

  const targetName = normalizeName(row.name);
  if (targetName) {
    const match = current.find(
      (contact) => normalizeName(contact.name) === targetName,
    );
    if (match) return { id: match.id, matchByEmail: false };
  }

  return null;
}

async function upsertContact({
  supabase,
  entityId,
  row,
  dryRun,
  summary,
}: {
  supabase: ReturnType<typeof createClient>;
  entityId: string;
  row: ParsedRow;
  dryRun: boolean;
  summary: Summary;
}): Promise<void> {
  const { data: currentRows, error } = await supabase
    .from("entity_contacts")
    .select("id, name, email")
    .eq("entity_id", entityId)
    .eq("contact_role", CONTACT_ROLE)
    .eq("is_current", true);

  if (error) {
    logSupabaseError(
      `Fetch current entity_contacts for entity_id=${entityId}`,
      error,
    );
    return;
  }

  const current = currentRows ?? [];
  const match = matchCurrentContact(current, row);
  const now = new Date().toISOString();
  const raw = buildRawPayload(row);

  if (match) {
    if (dryRun) {
      summary.updated += 1;
      return;
    }
    const updatePayload: Record<string, unknown> = {
      last_seen_at: now,
      raw,
      source_url: SOURCE_URL,
      source_formid: row.formid,
      source_system: SOURCE_SYSTEM,
    };
    if (row.name) updatePayload.name = row.name;
    if (row.phone) updatePayload.phone = row.phone;
    if (row.email && match.matchByEmail) updatePayload.email = row.email;

    const { error: updateError } = await supabase
      .from("entity_contacts")
      .update(updatePayload)
      .eq("id", match.id);
    if (updateError) {
      logSupabaseError(
        `Update entity_contacts id=${match.id} formid=${row.formid}`,
        updateError,
      );
      return;
    }
    summary.updated += 1;
    return;
  }

  const expireCount = current.length;
  if (expireCount > 0) {
    if (dryRun) {
      summary.expired += expireCount;
    } else {
      const { error: expireError } = await supabase
        .from("entity_contacts")
        .update({ is_current: false, last_seen_at: now })
        .eq("entity_id", entityId)
        .eq("contact_role", CONTACT_ROLE)
        .eq("is_current", true);
      if (expireError) {
        logSupabaseError(
          `Expire entity_contacts entity_id=${entityId}`,
          expireError,
        );
        return;
      }
      summary.expired += expireCount;
    }
  }

  const insertRow = {
    entity_id: entityId,
    contact_role: CONTACT_ROLE,
    name: row.name,
    email: row.email,
    phone: row.phone,
    source_system: SOURCE_SYSTEM,
    source_formid: row.formid,
    source_url: SOURCE_URL,
    is_current: true,
    first_seen_at: now,
    last_seen_at: now,
    raw,
  };

  if (dryRun) {
    summary.inserted += 1;
    return;
  }

  const { error: insertError } = await supabase
    .from("entity_contacts")
    .insert(insertRow);
  if (insertError) {
    logSupabaseError(
      `Insert entity_contacts formid=${row.formid} entity_id=${entityId}`,
      insertError,
    );
    return;
  }
  summary.inserted += 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFor(args.env);

  const { url, serviceKey } = getSupabaseEnv();
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  console.log(
    `Importing MDE superintendents (env=${args.env}${
      args.dryRun ? ", dry-run" : ""
    }${args.limit != null ? `, limit=${args.limit}` : ""})`,
  );

  const html = await fetchMdeHtml();
  const parsed = parseRowsFromHtml(html);

  if (args.debug) {
    console.log(
      "Debug sample rows:",
      parsed.slice(0, 5).map((row) => formatRowPreview(row)),
    );
  }

  const rows = args.limit != null ? parsed.slice(0, args.limit) : parsed;
  const summary: Summary = {
    parsed: parsed.length,
    processed: rows.length,
    matched: 0,
    inserted: 0,
    updated: 0,
    expired: 0,
    unmatched: [],
    skipped: 0,
  };

  for (const row of rows) {
    if (!row.formid) {
      summary.unmatched.push("unknown-formid");
      summary.skipped += 1;
      continue;
    }
    if (!row.name && !row.email) {
      console.warn(
        `Skipping formid=${row.formid} (missing superintendent name/email).`,
      );
      summary.skipped += 1;
      continue;
    }

    const entityId = await resolveEntityId(supabase, row.formid);
    if (!entityId) {
      summary.unmatched.push(row.formid);
      continue;
    }

    summary.matched += 1;
    await upsertContact({
      supabase,
      entityId,
      row,
      dryRun: args.dryRun,
      summary,
    });
  }

  const unmatchedUnique = Array.from(new Set(summary.unmatched)).sort();

  console.log("\nSummary");
  console.log(`Rows parsed: ${summary.parsed}`);
  console.log(`Rows processed: ${summary.processed}`);
  console.log(`Districts matched: ${summary.matched}`);
  console.log(`Inserted: ${summary.inserted}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Expired: ${summary.expired}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(
    `Unmatched formids (${unmatchedUnique.length}): ${
      unmatchedUnique.length ? unmatchedUnique.join(", ") : "none"
    }`,
  );

  console.log("\nValidation queries:");
  console.log(
    "select count(*) from public.entity_contacts where contact_role='superintendent' and is_current=true;",
  );
  console.log(
    "select * from public.entity_contacts where source_formid='0277-01' and contact_role='superintendent' order by last_seen_at desc;",
  );
}

main().catch((err) => {
  logSupabaseError("Import failed", err);
  process.exitCode = 1;
});
