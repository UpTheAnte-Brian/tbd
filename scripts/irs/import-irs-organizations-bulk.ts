/*
  Bulk IRS ingestion (Pub78 + related TEOS bulk downloads)

  Why this exists
  - Pub78 / revocation / e-postcard bulk files are *much* cleaner than scraping PDFs.
  - This script downloads the official IRS ZIPs, extracts them, parses the rows, and upserts
    into your `irs.organizations` table.

	•	pub78: “eligible to receive tax-deductible contributions” list → gives you name, location-ish, deductibility code (often no subsection/foundation/ruling in the short layout)
	•	revocation: auto-revocation list → focused on revocation metadata + address-ish fields (not subsection/foundation/ruling)
	•	epostcard (990-N): filing notices → can include a website URL sometimes, but generally not subsection/foundation/ruling
	•	eobmf (EO BMF state extract): authoritative IRS registry extract → gives subsection/foundation/ruling (and more), best for filling irs.organizations

  Usage
    # Pub78 (recommended baseline registry)
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source pub78 --download

    # Pub78 but ONLY for EINs in superintendent_scope_nonprofits for a district
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source pub78 --download --district <DISTRICT_UUID>
    # (When --district is provided, the script first seeds irs.organizations from superintendent_scope_nonprofits so all scoped EINs exist, then overlays IRS bulk data.)

    # Include only certain scope statuses (default: candidate,active)
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source pub78 --download --district <DISTRICT_UUID> --statuses candidate,active

    # Use a previously-downloaded zip
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source pub78 --zip /path/to/data-download-pub78.zip

    # Revocations list
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source revocation --download

    # E-Postcard bulk (990-N)
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source epostcard --download

    # EO BMF state extract (CSV) — recommended to enrich subsection/foundation/ruling
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source eobmf --file /path/to/eo_mn.csv
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source eobmf --zip /path/to/eo_mn.zip

    # Run everything, but EO BMF requires --file/--zip (download is not wired for EO BMF yet)
    # (When using --source all, provide --eobmfFile so EO BMF can run first.)
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source all --download --eobmfFile /path/to/eo_mn.csv

    # Run all registry sources (pub78 + revocation + epostcard) in sequence
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source all --download
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source all --download --district <DISTRICT_UUID>

    # Persist downloaded ZIPs under <IRS_TEOS_XML_ROOT>/registry
    pnpm tsx scripts/irs/import-irs-organizations-bulk.ts --source pub78 --download --cache

  Notes
  - This script intentionally focuses on the “organizations registry” surface area first:
      ein (normalized 9 digits) / legal_name / normalized_legal_name / city / state / country
    so the superintendent dashboard can get good results quickly.
  - TEOS 990 XML is a *second* phase (the Form 990 series downloads), and should land in
    `irs.returns` / `irs.return_*` tables. This script includes a stub for that.
*/

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import https from "node:https";
import { spawnSync } from "node:child_process";
import readline from "node:readline";

import { createClient } from "@supabase/supabase-js";
import { formatEinDashed, normalizeEinInput } from "./lib/ein";

type Source = "pub78" | "revocation" | "epostcard" | "eobmf" | "teos" | "all";

const REGISTRY_SOURCES: Array<Exclude<Source, "teos" | "all">> = [
    "eobmf",
    "epostcard",
    "revocation",
    "pub78",
];

const DOWNLOADS: Record<Exclude<Source, "teos" | "all">, string> = {
    pub78: "https://apps.irs.gov/pub/epostcard/data-download-pub78.zip",
    revocation:
        "https://apps.irs.gov/pub/epostcard/data-download-revocation.zip",
    epostcard: "https://apps.irs.gov/pub/epostcard/data-download-epostcard.zip",
    // EO BMF extracts are published separately (typically one file per state). We ingest them via --file/--zip.
    eobmf: "",
};

const DEFAULT_BATCH_SIZE = 1000;

function mustGetEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function getPersistentIrsRoot(): string {
    const root = process.env.IRS_TEOS_XML_ROOT || process.env.IRS_XML_ROOT;
    return path.resolve(root || path.join(process.cwd(), "data", "irs-teos"));
}

function getRegistryCacheDir(): string {
    const dir = path.join(getPersistentIrsRoot(), "registry");
    ensureDir(dir);
    return dir;
}

function normalizeLegalName(input: string | null | undefined): string | null {
    if (!input) return null;
    const s = String(input)
        .trim()
        .replace(/^"+|"+$/g, "")
        .replace(/\s+/g, " ")
        .toUpperCase();
    return s.length ? s : null;
}

function normalizeCountry(input: string | null | undefined): string | null {
    if (!input) return null;
    const raw = String(input).trim().replace(/^"+|"+$/g, "");
    if (!raw) return null;
    const upper = raw.toUpperCase();
    if (
        upper === "US" || upper === "USA" || upper === "UNITED STATES" ||
        upper === "UNITED STATES OF AMERICA"
    ) {
        return "US";
    }
    return raw;
}

function looksLikeZip(input: unknown): boolean {
    const t = String(input ?? "").trim();
    return /^\d{5}(-\d{4})?$/.test(t);
}

function looksLikeAddressLine(input: unknown): boolean {
    const t = String(input ?? "").trim();
    if (!t) return false;
    // simple heuristic: street-ish tokens + at least one digit
    return /\d/.test(t) &&
        /(\bPO\b\s*\bBOX\b|\bP\.?\s*O\.?\b\s*\bBOX\b|\bRD\b|\bROAD\b|\bST\b|\bSTREET\b|\bAVE\b|\bAVENUE\b|\bBLVD\b|\bDR\b|\bDRIVE\b|\bLN\b|\bLANE\b|\bHWY\b|\bHIGHWAY\b|\bCT\b|\bCOURT\b)/i
            .test(t);
}

function parseArgs(argv: string[]) {
    const args: Record<string, string | boolean> = {};
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith("--")) continue;
        const key = a.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith("--")) {
            args[key] = true;
        } else {
            args[key] = next;
            i++;
        }
    }
    return args;
}

function parseCommaList(input: string | null | undefined): string[] {
    if (!input) return [];
    return String(input)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

function ensureDir(p: string) {
    fs.mkdirSync(p, { recursive: true });
}

async function downloadFile(url: string, outPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(outPath);
        const req = https.get(url, (res) => {
            if (
                res.statusCode && res.statusCode >= 300 &&
                res.statusCode < 400 && res.headers.location
            ) {
                // simple redirect handling
                file.close();
                fs.unlinkSync(outPath);
                downloadFile(res.headers.location, outPath).then(resolve).catch(
                    reject,
                );
                return;
            }

            if (res.statusCode !== 200) {
                reject(
                    new Error(`Download failed: ${url} (${res.statusCode})`),
                );
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
    ensureDir(outDir);

    // Prefer system unzip (fast, no extra deps).
    const r = spawnSync("unzip", ["-o", "-q", zipPath, "-d", outDir], {
        stdio: "inherit",
    });

    if (r.status !== 0) {
        throw new Error(
            `Failed to unzip ${zipPath}. Ensure the 'unzip' command is available on your system.`,
        );
    }
}

function findFirstFileMatching(dir: string, pattern: RegExp): string {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            try {
                const hit = findFirstFileMatching(full, pattern);
                if (hit) return hit;
            } catch {}
        } else if (pattern.test(e.name)) {
            return full;
        }
    }
    throw new Error(`No extracted file matched ${pattern} in ${dir}`);
}

// Pub78 / revocation are pipe-delimited ASCII text.
// We parse conservatively by position and also retain raw columns.
function splitPipe(line: string): string[] {
    // Pub78 doesn't escape pipes; split is safe.
    return line.split("|").map((s) => s.trim());
}

// EO BMF is CSV with a header row.
function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                // Escaped quote
                if (line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cur += ch;
            }
        } else {
            if (ch === ",") {
                out.push(cur.trim());
                cur = "";
            } else if (ch === '"') {
                inQuotes = true;
            } else {
                cur += ch;
            }
        }
    }
    out.push(cur.trim());
    return out;
}

function toHeaderIndex(headers: string[]): Record<string, number> {
    const idx: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
        const key = String(headers[i] ?? "").trim().toUpperCase();
        if (!key) continue;
        idx[key] = i;
    }
    return idx;
}

function pick(cols: string[], i: number | undefined): string | null {
    if (i == null || i < 0 || i >= cols.length) return null;
    const v = String(cols[i] ?? "").trim();
    return v.length ? v : null;
}

function rulingToYear(rulingRaw: string | null): number | null {
    if (!rulingRaw) return null;
    // EO BMF uses YYYYMM in many extracts (e.g. 201206). We keep just YYYY.
    const t = String(rulingRaw).trim();
    const y = t.slice(0, 4);
    return /^\d{4}$/.test(y) ? Number(y) : null;
}

function looksLikeYearOnly(s: unknown): boolean {
    const t = String(s ?? "").trim();
    return /^\d{4}$/.test(t);
}

function looksLikeName(s: unknown): boolean {
    const t = String(s ?? "").trim();
    if (!t) return false;
    if (looksLikeYearOnly(t)) return false;
    return /[a-z]/i.test(t);
}

function looksLikeState2(s: unknown): boolean {
    return /^[A-Z]{2}$/i.test(String(s ?? "").trim());
}

type OrgParsedRow = {
    ein: string; // normalized 9 digits (e.g. "411619499")
    legal_name: string | null;
    normalized_legal_name: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    website: string | null;
    deductibility_code: string | null;
    subsection_code: string | null;
    foundation_code: string | null;
    ruling_year: number | null;
};

type OrgUpsertRow = {
    ein: string; // normalized 9 digits (e.g. "411619499")
    legal_name?: string | null;
    normalized_legal_name?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    website?: string | null;
    deductibility_code?: string | null;
    subsection_code?: string | null;
    foundation_code?: string | null;
    ruling_year?: number | null;
    pub78_last_seen_at?: string | null;
    revocation_last_seen_at?: string | null;
    epostcard_last_seen_at?: string | null;
    eobmf_last_seen_at?: string | null;
    is_pub78?: boolean;
    is_revoked?: boolean;
};

async function loadScopedScopeRows(params: {
    supabaseAdmin: any;
    districtEntityId: string;
    statuses: string[];
}): Promise<
    Array<{ ein: string; ein_dashed: string; label: string | null }>
> {
    const { supabaseAdmin, districtEntityId, statuses } = params;

    const rowsOut: Array<{ ein: string; ein_dashed: string; label: string | null }> = [];

    const pageSize = 1000;
    let from = 0;

    while (true) {
        let q = supabaseAdmin
            .schema("public")
            .from("superintendent_scope_nonprofits")
            .select("ein,label", { count: "exact" })
            .eq("district_entity_id", districtEntityId);

        if (statuses.length) {
            q = q.in("status", statuses);
        }

        q = q.range(from, from + pageSize - 1);

        const { data, error } = await q;
        if (error) {
            throw new Error(`Failed to load scoped EINs: ${error.message}`);
        }

        const rows = (data || []) as Array<{ ein: string; label?: string | null }>;
        for (const r of rows) {
            const n = normalizeEinInput(r.ein);
            if (!n) continue;
            rowsOut.push({
                ein: n,
                ein_dashed: formatEinDashed(n),
                label: r.label ?? null,
            });
        }

        if (rows.length < pageSize) break;
        from += pageSize;
    }

    return rowsOut;
}

function buildScopedEinSet(scopeRows: Array<{ ein: string }>): Set<string> {
    const set = new Set<string>();
    for (const r of scopeRows) set.add(r.ein);
    return set;
}

function mapPub78Row(cols: string[]): OrgParsedRow | null {
    const einN = normalizeEinInput(cols[0]);
    if (!einN) return null;

    // Pub78 has two common layouts:
    // (A) small: EIN | NAME | CITY | STATE | COUNTRY | DEDUCTIBILITY | SUBSECTION | FOUNDATION | RULING_YEAR
    // (B) wide (EO BMF-like):
    //   EIN | NAME | ICO | STREET | CITY | STATE | ZIP | GROUP | SUBSECTION | AFFILIATION | CLASSIFICATION |
    //   RULING_YEAR | DEDUCTIBILITY | FOUNDATION | ...
    // We detect wide by column count.

    const isWide = cols.length >= 14;

    let legalName: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    let country: string | null = null;
    let deductibility_code: string | null = null;
    let subsection_code: string | null = null;
    let foundation_code: string | null = null;
    let ruling_year: number | null = null;

    if (isWide) {
        legalName = cols[1] || null;
        city = cols[4] || null;
        state = cols[5] || null;
        // wide files are overwhelmingly US; there may or may not be an explicit country column.
        country = "US";

        // Known wide positions (based on common IRS BMF-style exports)
        subsection_code = cols[8]?.trim() || null;
        const rulingRaw = String(cols[11] ?? "").trim();
        ruling_year = /^\d{4}$/.test(rulingRaw) ? Number(rulingRaw) : null;

        deductibility_code = cols[12]?.trim() || null;
        foundation_code = cols[13]?.trim() || null;

        // Guardrails: avoid polluting city/state with address/zip fragments.
        if (looksLikeAddressLine(city) || looksLikeZip(city)) city = null;
        if (state && !looksLikeState2(state)) state = null;
    } else {
        legalName = cols[1] || null;
        city = cols[2] || null;
        state = cols[3] || null;
        country = normalizeCountry(cols[4] || null);
        deductibility_code = cols[5]?.trim() || null;
        // Some Pub78 downloads are the short 6-column format (no subsection/foundation/ruling year).
        // Others include additional columns.
        subsection_code = cols.length > 6 ? (cols[6]?.trim() || null) : null;
        foundation_code = cols.length > 7 ? (cols[7]?.trim() || null) : null;
        const rulingRaw = cols.length > 8 ? String(cols[8] ?? "").trim() : "";
        ruling_year = /^\d{4}$/.test(rulingRaw) ? Number(rulingRaw) : null;

        if (looksLikeAddressLine(city) || looksLikeZip(city)) city = null;
        if (state && !looksLikeState2(state)) state = null;
    }

    return {
        ein: einN,
        legal_name: legalName,
        normalized_legal_name: normalizeLegalName(legalName),
        city,
        state,
        country,
        website: null,
        deductibility_code,
        subsection_code,
        foundation_code,
        ruling_year,
    };
}

function mapRevocationRow(cols: string[]): OrgParsedRow | null {
    // Revocation list format varies. Common patterns:
    //  (A) EIN | NAME | ADDRESS | CITY | STATE | ZIP | COUNTRY | ...
    //  (B) EIN | NAME | CITY | STATE | ZIP | COUNTRY | ...
    const einN = normalizeEinInput(cols[0]);
    if (!einN) return null;

    const legalName = cols[1] || null;

    let city: string | null = null;
    let state: string | null = null;
    let country: string | null = null;
    let subsection_code: string | null = null;

    // Prefer pattern (A) if we can see a plausible state in cols[4]
    if (looksLikeState2(cols[4])) {
        city = cols[3] || null;
        state = cols[4] || null;
        country = normalizeCountry(cols[6] || null) || "US";
        subsection_code = cols[7]?.trim() || null;
    } else if (looksLikeState2(cols[3])) {
        // Pattern (B)
        city = cols[2] || null;
        state = cols[3] || null;
        country = normalizeCountry(cols[5] || null) || "US";
        subsection_code = cols[6]?.trim() || null;
    } else {
        // Fallback: be conservative and avoid writing junk into city/state.
        city = null;
        state = null;
        country = normalizeCountry(cols[6] || cols[5] || cols[4] || null) ||
            "US";
        subsection_code = null;
    }

    if (looksLikeAddressLine(city) || looksLikeZip(city)) city = null;
    if (state && !looksLikeState2(state)) state = null;

    return {
        ein: einN,
        legal_name: legalName,
        normalized_legal_name: normalizeLegalName(legalName),
        city,
        state,
        country,
        website: null,
        deductibility_code: null,
        subsection_code,
        foundation_code: null,
        ruling_year: null,
    };
}

function mapEpostcardRow(cols: string[]): OrgParsedRow | null {
    // 990-N dataset: many columns; first two are typically EIN + NAME.
    const einN = normalizeEinInput(cols[0]);
    if (!einN) return null;

    let legalName: string | null = null;
    // epostcard layout varies; often col[1]=tax year and col[2]=org name
    if (looksLikeName(cols[1])) legalName = cols[1] || null;
    else if (looksLikeName(cols[2])) legalName = cols[2] || null;

    const websiteCandidate = String(cols[7] ?? "").trim();
    const website = /^https?:\/\//i.test(websiteCandidate)
        ? websiteCandidate
        : null;

    // City/State are usually later, but are not reliable enough to pin without the data dictionary.
    // We'll keep them null and preserve payload.
    return {
        ein: einN,
        legal_name: legalName,
        normalized_legal_name: normalizeLegalName(legalName),
        city: null,
        state: null,
        country: normalizeCountry(
            cols[14] || cols[13] || cols[12] || cols[11] || null,
        ),
        website,
        deductibility_code: null,
        subsection_code: null,
        foundation_code: null,
        ruling_year: null,
    };
}

async function upsertOrganizations(
    supabaseAdmin: any,
    rows: OrgParsedRow[],
    source: Exclude<Source, "teos" | "all">,
    runStartedAtIso: string,
) {
    if (!rows.length) return { upserted: 0 };

    const nowIso = new Date().toISOString();

    // We always upsert by primary key (ein) and bump last_seen_at when we observe the org in any dataset.
    // IMPORTANT: irs.organizations.legal_name is NOT NULL. During district-scoped runs we seed base rows first,
    // so for sources like epostcard (which can have blank names), we must NOT overwrite legal_name with null.
    // Also, avoid overwriting existing non-null columns with nulls from any source.
    const payload = rows.map((r) => {
        const out: OrgUpsertRow & { last_seen_at: string } = {
            ein: r.ein,
            last_seen_at: nowIso,
        };

        if (source === "pub78") {
            out.pub78_last_seen_at = runStartedAtIso;
            out.is_pub78 = true;
        }
        if (source === "revocation") {
            out.revocation_last_seen_at = runStartedAtIso;
            out.is_revoked = true;
        }
        if (source === "epostcard") {
            out.epostcard_last_seen_at = runStartedAtIso;
        }
        if (source === "eobmf") {
            out.eobmf_last_seen_at = runStartedAtIso;
        }

        if (r.legal_name && String(r.legal_name).trim().length) {
            out.legal_name = r.legal_name;
            out.normalized_legal_name = r.normalized_legal_name;
        }

        if (r.city && String(r.city).trim().length) out.city = r.city;
        if (r.state && looksLikeState2(r.state)) out.state = r.state;
        const ctry = normalizeCountry(r.country);
        if (ctry && !looksLikeZip(ctry)) {
            out.country = ctry;
        }
        if (r.website && String(r.website).trim().length) {
            out.website = String(r.website).trim();
        }
        if (r.deductibility_code) {
            out.deductibility_code = r.deductibility_code;
        }
        if (r.subsection_code) out.subsection_code = r.subsection_code;
        if (r.foundation_code) out.foundation_code = r.foundation_code;
        if (r.ruling_year != null) out.ruling_year = r.ruling_year;

        return out;
    });

    const { error } = await supabaseAdmin
        .schema("irs")
        .from("organizations")
        .upsert(payload, { onConflict: "ein" });

    if (error) {
        throw new Error(`Upsert failed: ${error.message}`);
    }

    return { upserted: rows.length };
}

async function seedOrganizationsFromScope(params: {
    supabaseAdmin: any;
    scopeRows: Array<{ ein_dashed: string; ein: string; label: string | null }>;
}) {
    const { supabaseAdmin, scopeRows } = params;
    if (!scopeRows.length) return { seeded: 0 };

    const nowIso = new Date().toISOString();

    // Seed minimal rows to ensure every scoped EIN exists in irs.organizations (EIN stored as 9 digits, no dash).
    // legal_name is NOT NULL in the table, so we always provide something.
    const payload = scopeRows.map((r) => {
        const fallbackName = `UNKNOWN ORG (${r.ein_dashed})`;
        return {
            ein: r.ein,
            legal_name: (r.label && String(r.label).trim().length)
                ? String(r.label).trim()
                : fallbackName,
            normalized_legal_name: normalizeLegalName(r.label ?? null),
            city: null,
            state: null,
            country: "US",
            last_seen_at: nowIso,
        };
    });

    const { error } = await supabaseAdmin
        .schema("irs")
        .from("organizations")
        .upsert(payload, { onConflict: "ein" });

    if (error) throw new Error(`Seed upsert failed: ${error.message}`);

    return { seeded: payload.length };
}

async function parseAndIngestPipeFile(params: {
    supabaseAdmin: any;
    source: "pub78" | "revocation" | "epostcard";
    filePath: string;
    batchSize: number;
    scopedEinSet?: Set<string> | null;
}) {
    const { supabaseAdmin, source, filePath, batchSize, scopedEinSet } = params;

    const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: "utf8" }),
        crlfDelay: Infinity,
    });

    let batch: OrgParsedRow[] = [];
    let totalLines = 0;
    let totalMapped = 0;
    let totalUpserted = 0;
    let totalScopedMatched = 0;
    let totalScopedSkipped = 0;

    const started = Date.now();
    const runStartedAtIso = new Date().toISOString();

    for await (const lineRaw of rl) {
        const line = String(lineRaw || "").trim();
        if (!line) continue;
        totalLines++;

        const cols = splitPipe(line);

        let mapped: OrgParsedRow | null = null;
        if (source === "pub78") mapped = mapPub78Row(cols);
        if (source === "revocation") mapped = mapRevocationRow(cols);
        if (source === "epostcard") mapped = mapEpostcardRow(cols);

        if (!mapped) continue;

        // If a district scope set is provided, only ingest organizations that are in scope.
        if (scopedEinSet) {
            if (!scopedEinSet.has(mapped.ein)) {
                totalScopedSkipped++;
                continue;
            }
            totalScopedMatched++;
        }

        totalMapped++;
        batch.push(mapped);

        if (batch.length >= batchSize) {
            const r = await upsertOrganizations(
                supabaseAdmin,
                batch,
                source,
                runStartedAtIso,
            );
            totalUpserted += r.upserted;
            batch = [];

            const elapsedSec = Math.max(
                1,
                Math.round((Date.now() - started) / 1000),
            );
            const rate = Math.round(totalLines / elapsedSec);
            process.stdout.write(
                `\rParsed ${totalLines.toLocaleString()} lines, mapped ${totalMapped.toLocaleString()}, scoped ${totalScopedMatched.toLocaleString()} (skipped ${totalScopedSkipped.toLocaleString()}), upserted ${totalUpserted.toLocaleString()} (${rate.toLocaleString()} lines/sec)   `,
            );
        }
    }

    if (batch.length) {
        const r = await upsertOrganizations(
            supabaseAdmin,
            batch,
            source,
            runStartedAtIso,
        );
        totalUpserted += r.upserted;
    }

    const elapsedSec = Math.max(1, Math.round((Date.now() - started) / 1000));
    process.stdout.write("\n");
    console.log(
        `Done. Source=${source} lines=${totalLines.toLocaleString()} mapped=${totalMapped.toLocaleString()} scoped=${totalScopedMatched.toLocaleString()} skipped=${totalScopedSkipped.toLocaleString()} upserted=${totalUpserted.toLocaleString()} elapsed=${elapsedSec}s`,
    );

    return { runStartedAtIso };
}

// ----------------------------
// CSV ingestion (EO BMF)
// ----------------------------

function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
                // Escaped quote
                if (i + 1 < line.length && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cur += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            continue;
        }

        if (ch === ",") {
            out.push(cur);
            cur = "";
            continue;
        }

        cur += ch;
    }

    out.push(cur);
    return out.map((s) => String(s ?? "").trim());
}

function normalizeCity(input: string | null | undefined): string | null {
    const t = String(input ?? "").trim();
    if (!t) return null;

    // If it's already mixed-case, keep it.
    const hasLower = /[a-z]/.test(t);
    const hasUpper = /[A-Z]/.test(t);
    if (hasLower && hasUpper) return t;

    // Title-case ALL CAPS strings (e.g. MINNEAPOLIS -> Minneapolis)
    return t
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
}

function mapEobmfCsvRow(
    cols: string[],
    headerIdx: Record<string, number>,
): OrgParsedRow | null {
    const get = (name: string): string | null => {
        const idx = headerIdx[name];
        if (idx === undefined) return null;
        const v = cols[idx];
        const t = String(v ?? "").trim();
        return t.length ? t : null;
    };

    const einRaw = get("EIN");
    const einN = normalizeEinInput(einRaw);
    if (!einN) return null;

    const legalName = get("NAME");
    const city = normalizeCity(get("CITY"));
    const state = get("STATE");

    // BMF has a 6-digit ruling value like YYYYMM (e.g. 200206). Keep year.
    const rulingRaw = get("RULING");
    const rulingYear = rulingRaw && /^\d{6}$/.test(rulingRaw)
        ? Number(rulingRaw.slice(0, 4))
        : (rulingRaw && /^\d{4}$/.test(rulingRaw) ? Number(rulingRaw) : null);

    const subsection = get("SUBSECTION");
    const foundation = get("FOUNDATION");
    const deductibility = get("DEDUCTIBILITY");

    return {
        ein: einN,
        legal_name: legalName,
        normalized_legal_name: normalizeLegalName(legalName),
        city: city && !looksLikeAddressLine(city) && !looksLikeZip(city)
            ? city
            : null,
        state: state && looksLikeState2(state) ? state.toUpperCase() : null,
        country: "US",
        website: null,
        deductibility_code: deductibility,
        subsection_code: subsection,
        foundation_code: foundation,
        ruling_year: rulingYear,
    };
}

async function parseAndIngestCsvFile(params: {
    supabaseAdmin: any;
    source: "eobmf";
    filePath: string;
    batchSize: number;
    scopedEinSet?: Set<string> | null;
}) {
    const { supabaseAdmin, source, filePath, batchSize, scopedEinSet } = params;

    const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: "utf8" }),
        crlfDelay: Infinity,
    });

    let headerIdx: Record<string, number> | null = null;

    let batch: OrgParsedRow[] = [];
    let totalLines = 0;
    let totalMapped = 0;
    let totalUpserted = 0;
    let totalScopedMatched = 0;
    let totalScopedSkipped = 0;

    const started = Date.now();
    const runStartedAtIso = new Date().toISOString();

    for await (const lineRaw of rl) {
        const line = String(lineRaw ?? "").trimEnd();
        if (!line) continue;

        // Build header map from the first non-empty line.
        if (!headerIdx) {
            const header = splitCsvLine(line).map((h) =>
                h.trim().toUpperCase()
            );
            const idx: Record<string, number> = {};
            header.forEach((h, i) => {
                if (h) idx[h] = i;
            });
            headerIdx = idx;

            // If it doesn't look like a header, treat it as data but still build a best-effort map.
            // EO BMF should have EIN,NAME,CITY,STATE,SUBSECTION,FOUNDATION,RULING,DEDUCTIBILITY.
            if (!headerIdx["EIN"] || !headerIdx["NAME"]) {
                // Do nothing; we'll attempt to parse subsequent lines using the map we have.
            }
            continue;
        }

        totalLines++;
        const cols = splitCsvLine(line);
        const mapped = mapEobmfCsvRow(cols, headerIdx);
        if (!mapped) continue;

        if (scopedEinSet) {
            if (!scopedEinSet.has(mapped.ein)) {
                totalScopedSkipped++;
                continue;
            }
            totalScopedMatched++;
        }

        totalMapped++;
        batch.push(mapped);

        if (batch.length >= batchSize) {
            const r = await upsertOrganizations(
                supabaseAdmin,
                batch,
                source,
                runStartedAtIso,
            );
            totalUpserted += r.upserted;
            batch = [];

            const elapsedSec = Math.max(
                1,
                Math.round((Date.now() - started) / 1000),
            );
            const rate = Math.round(totalLines / elapsedSec);
            process.stdout.write(
                `\rParsed ${totalLines.toLocaleString()} lines, mapped ${totalMapped.toLocaleString()}, scoped ${totalScopedMatched.toLocaleString()} (skipped ${totalScopedSkipped.toLocaleString()}), upserted ${totalUpserted.toLocaleString()} (${rate.toLocaleString()} lines/sec)   `,
            );
        }
    }

    if (batch.length) {
        const r = await upsertOrganizations(
            supabaseAdmin,
            batch,
            source,
            runStartedAtIso,
        );
        totalUpserted += r.upserted;
    }

    const elapsedSec = Math.max(1, Math.round((Date.now() - started) / 1000));
    process.stdout.write("\n");
    console.log(
        `Done. Source=${source} lines=${totalLines.toLocaleString()} mapped=${totalMapped.toLocaleString()} scoped=${totalScopedMatched.toLocaleString()} skipped=${totalScopedSkipped.toLocaleString()} upserted=${totalUpserted.toLocaleString()} elapsed=${elapsedSec}s`,
    );

    return { runStartedAtIso };
}

async function expirePresenceForSource(params: {
    supabaseAdmin: any;
    source: "pub78" | "revocation";
    runStartedAtIso: string;
    scopedEinSet?: Set<string> | null;
}) {
    const { supabaseAdmin, source, runStartedAtIso, scopedEinSet } = params;
    const isPub78 = source === "pub78";
    const flagColumn = isPub78 ? "is_pub78" : "is_revoked";
    const lastSeenColumn = isPub78
        ? "pub78_last_seen_at"
        : "revocation_last_seen_at";
    const clearPatch = isPub78 ? { is_pub78: false } : { is_revoked: false };

    const expireForChunk = async (einChunk?: string[]) => {
        let nullSeenQ = supabaseAdmin
            .schema("irs")
            .from("organizations")
            .update(clearPatch)
            .eq(flagColumn, true)
            .is(lastSeenColumn, null);
        if (einChunk) {
            nullSeenQ = nullSeenQ.in("ein", einChunk);
        }

        const { error: nullSeenErr } = await nullSeenQ;
        if (nullSeenErr) {
            throw new Error(
                `Expire ${source} failed (null last_seen): ${nullSeenErr.message}`,
            );
        }

        let staleSeenQ = supabaseAdmin
            .schema("irs")
            .from("organizations")
            .update(clearPatch)
            .eq(flagColumn, true)
            .neq(lastSeenColumn, runStartedAtIso);
        if (einChunk) {
            staleSeenQ = staleSeenQ.in("ein", einChunk);
        }

        const { error: staleSeenErr } = await staleSeenQ;
        if (staleSeenErr) {
            throw new Error(
                `Expire ${source} failed (stale last_seen): ${staleSeenErr.message}`,
            );
        }
    };

    if (scopedEinSet) {
        if (!scopedEinSet.size) return;
        const chunkSize = 1000;
        const eins = Array.from(scopedEinSet);
        for (let i = 0; i < eins.length; i += chunkSize) {
            await expireForChunk(eins.slice(i, i + chunkSize));
        }
        return;
    }

    await expireForChunk();
}

async function main() {
    const args = parseArgs(process.argv);

    const source = String(args.source || "pub78") as Source;
    if (
        !(
            [
                "pub78",
                "revocation",
                "epostcard",
                "eobmf",
                "teos",
                "all",
            ] as Source[]
        ).includes(source)
    ) {
        throw new Error(
            `Invalid --source. Expected pub78|revocation|epostcard|eobmf|teos|all, got ${source}`,
        );
    }
    const batchSize = args.batchSize
        ? Number(args.batchSize)
        : DEFAULT_BATCH_SIZE;
    if (!Number.isFinite(batchSize) || batchSize <= 0) {
        throw new Error(`Invalid --batchSize: ${args.batchSize}`);
    }

    const districtEntityId = args.district ? String(args.district) : null;
    const statuses = parseCommaList(
        args.statuses ? String(args.statuses) : "candidate,active",
    );

    const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    });

    let scopedEinSet: Set<string> | null = null;
    let scopeRows: Array<{ ein: string; ein_dashed: string; label: string | null }> = [];

    if (districtEntityId) {
        console.log(
            `Loading scoped EINs for district_entity_id=${districtEntityId} statuses=${
                statuses.join(",")
            }`,
        );

        scopeRows = await loadScopedScopeRows({
            supabaseAdmin,
            districtEntityId,
            statuses,
        });
        scopedEinSet = buildScopedEinSet(scopeRows);

        console.log(
            `Scoped EINs loaded: ${scopedEinSet.size.toLocaleString()}`,
        );

        // Seed base org rows so every scoped EIN exists even if IRS bulk ZIPs are missing it.
        const seeded = await seedOrganizationsFromScope({
            supabaseAdmin,
            scopeRows,
        });
        console.log(
            `Seeded irs.organizations from scope: ${seeded.seeded.toLocaleString()}`,
        );
    }

    if (source === "teos") {
        console.log(
            "TEOS 990 XML ingestion is phase-2 for this script. Use your existing PDF pipeline for now, or implement: index CSV -> zip shard -> XML parse -> irs.returns/return_* tables.",
        );
        console.log(
            "You already have one sample XML mounted locally: /mnt/data/202522329349301317_public.xml (useful for mapping).",
        );
        return;
    }

    const wantDownload = Boolean(args.download);
    const zipArg = args.zip ? String(args.zip) : null;
    const fileArg = args.file ? String(args.file) : null;
    const eobmfFileArg = args.eobmfFile ? String(args.eobmfFile) : null;
    const useRegistryCache = Boolean(args.cache);

    const sourcesToRun: Array<Exclude<Source, "teos" | "all">> =
        source === "all"
            ? REGISTRY_SOURCES
            : [source as Exclude<Source, "teos" | "all">];

    const allowUnscoped = Boolean(args.allowUnscoped) ||
        Boolean(args.allowUnscopedEobmf);

    if (sourcesToRun.includes("eobmf") && !districtEntityId && !allowUnscoped) {
        throw new Error(
            "Refusing to ingest EO BMF without --district (it will load the entire state). " +
                "Run with --district <DISTRICT_UUID> or pass --allowUnscopedEobmf to override.",
        );
    }
    for (const src of sourcesToRun) {
        // Reset per-source temp paths for each run (so downloads/extracts don't collide)
        const runWorkDir = path.join(
            os.tmpdir(),
            `irs-bulk-${src}-${Date.now()}`,
        );
        ensureDir(runWorkDir);

        let runZipPath: string | null = null;

        if (wantDownload) {
            const url = DOWNLOADS[src];
            if (useRegistryCache) {
                const cacheDir = getRegistryCacheDir();
                runZipPath = path.join(cacheDir, path.basename(url));
                if (fs.existsSync(runZipPath)) {
                    console.log(`Using cached ZIP: ${runZipPath}`);
                } else {
                    console.log(`Downloading ${src} from ${url}`);
                    await downloadFile(url, runZipPath);
                    console.log(`Downloaded: ${runZipPath}`);
                }
            } else {
                runZipPath = path.join(runWorkDir, path.basename(url));
                console.log(`Downloading ${src} from ${url}`);
                await downloadFile(url, runZipPath);
                console.log(`Downloaded: ${runZipPath}`);
            }
        } else if (zipArg) {
            // If user provided a zip, it applies only to single-source runs.
            // For --source all, require --download or --file instead.
            if (source === "all") {
                throw new Error(
                    "When --source all is used, --zip is not supported. Use --download or --file instead.",
                );
            }
            runZipPath = path.resolve(zipArg);
            if (!fs.existsSync(runZipPath)) {
                throw new Error(`Zip not found: ${runZipPath}`);
            }
        }

        let runDataFilePath: string | null = null;
        let effectiveFileArg = fileArg;
        if (src === "eobmf" && eobmfFileArg) effectiveFileArg = eobmfFileArg;

        if (effectiveFileArg) {
            // If a file is provided, it applies only to single-source runs.
            // For --source all, require --download.
            if (source === "all") {
                throw new Error(
                    "When --source all is used, --file is not supported. Use --download instead.",
                );
            }
            runDataFilePath = path.resolve(effectiveFileArg);
            if (!fs.existsSync(runDataFilePath)) {
                throw new Error(`File not found: ${runDataFilePath}`);
            }
        } else if (runZipPath) {
            const extractDir = path.join(runWorkDir, "extract");
            console.log(`Extracting: ${runZipPath} -> ${extractDir}`);
            unzipToDir(runZipPath, extractDir);

            // Pub78 / revocation / epostcard zips contain one primary *.txt; EO BMF may be a *.csv
            runDataFilePath = src === "eobmf"
                ? findFirstFileMatching(extractDir, /\.csv$/i)
                : findFirstFileMatching(extractDir, /\.txt$/i);
        } else {
            throw new Error(
                "Provide either --download, --zip <path>, or --file <path> (and for EO BMF, provide --file/--zip or --eobmfFile when using --source all).",
            );
        }

        if (src === "eobmf" && !effectiveFileArg && !runZipPath) {
            throw new Error(
                "EO BMF requires input. Use --source eobmf with --file /path/to/eo_STATE.csv (or --zip), or provide --eobmfFile when running --source all.",
            );
        }

        if (src === "eobmf") {
            console.log(`Parsing file (${src}): ${runDataFilePath}`);
            const ingestResult = await parseAndIngestCsvFile({
                supabaseAdmin,
                source: "eobmf",
                filePath: runDataFilePath,
                batchSize,
                scopedEinSet,
            });
            console.log(
                `Ingest complete for ${src} run_started_at=${ingestResult.runStartedAtIso}`,
            );
        } else {
            console.log(`Parsing file (${src}): ${runDataFilePath}`);
            const ingestResult = await parseAndIngestPipeFile({
                supabaseAdmin,
                source: src,
                filePath: runDataFilePath,
                batchSize,
                scopedEinSet,
            });

            if (src === "pub78" || src === "revocation") {
                await expirePresenceForSource({
                    supabaseAdmin,
                    source: src,
                    runStartedAtIso: ingestResult.runStartedAtIso,
                    scopedEinSet,
                });
                console.log(
                    `Presence expiry complete for ${src} run_started_at=${ingestResult.runStartedAtIso}`,
                );
            }
        }

        // Keep temp dir around if user asks for it later; otherwise clean up.
        if (!args.keepTemp) {
            try {
                await fsp.rm(runWorkDir, { recursive: true, force: true });
            } catch {}
        } else {
            console.log(`Temp kept: ${runWorkDir}`);
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
