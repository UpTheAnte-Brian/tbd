/*
  TEOS / Form 990 XML bulk ingestion (phase 2)

  What this script does
  - Downloads the IRS TEOS “index file” for a year (CSV)
  - Filters rows to ONLY the EINs in `public.superintendent_scope_nonprofits` for a district (optional)
  - Downloads the required TEOS XML shard ZIP(s)
  - Extracts the matching `*_public.xml` files
  - Parses key fields from each XML (EIN, return type, tax period, organization name)
  - Writes JSONL output for auditing, and (optionally) upserts into `irs.returns`
  - Extracts XMLs into a persistent cache dir (IRS_TEOS_XML_ROOT or ./data/irs-teos) so xml_path remains valid across runs.
*/

import { formatEinDashed, normalizeEinInput } from "./lib/ein";
import {
    atomicWriteFile,
    getXmlCachePath,
    isValidCachedFile,
    makeCacheKey,
} from "./lib/cache";
import { parseReturnFinancialsFromXmlPath } from "./parse-990-financials";

function getPersistentTeosRoot(): string {
    // Preferred override: IRS_TEOS_XML_ROOT (or IRS_XML_ROOT). Default: ./data/irs-teos
    const root = process.env.IRS_TEOS_XML_ROOT || process.env.IRS_XML_ROOT;
    return path.resolve(root || path.join(process.cwd(), "data", "irs-teos"));
}

function getTeosIndexPath(year: number): string {
    const dir = path.join(getPersistentTeosRoot(), "index");
    ensureDir(dir);
    return path.join(dir, `index_${year}.csv`);
}

function getTeosShardZipPath(year: number, shard: string): string {
    const dir = path.join(getPersistentTeosRoot(), "zips", String(year));
    ensureDir(dir);
    return path.join(dir, `${shard}.zip`);
}

async function listLocalCacheYears(): Promise<number[]> {
    const root = path.join(getPersistentTeosRoot(), "xml");
    let entries: fs.Dirent[];
    try {
        entries = await fsp.readdir(root, { withFileTypes: true });
    } catch {
        return [];
    }
    const years: number[] = [];
    for (const ent of entries) {
        if (!ent.isDirectory()) continue;
        if (!/^\d{4}$/.test(ent.name)) continue;
        const y = Number(ent.name);
        if (Number.isFinite(y)) years.push(y);
    }
    return years.sort((a, b) => a - b);
}

type LocalXmlIndex = {
    year: number;
    byBasename: Map<string, string>;
};

let localXmlIndex: LocalXmlIndex | null = null;

async function buildLocalXmlIndex(
    year: number,
): Promise<Map<string, string> | null> {
    const root = path.join(getPersistentTeosRoot(), "xml", String(year));
    if (!fs.existsSync(root)) return null;

    const byBasename = new Map<string, string>();
    const stack: string[] = [root];

    while (stack.length) {
        const dir = stack.pop()!;
        let entries: fs.Dirent[];
        try {
            entries = await fsp.readdir(dir, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const ent of entries) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                stack.push(p);
                continue;
            }
            if (!ent.isFile()) continue;
            if (!ent.name.endsWith("_public.xml")) continue;
            if (!byBasename.has(ent.name)) byBasename.set(ent.name, p);
        }
    }

    return byBasename;
}

async function getLocalXmlIndex(
    year: number,
): Promise<Map<string, string> | null> {
    if (localXmlIndex && localXmlIndex.year === year) {
        return localXmlIndex.byBasename;
    }
    const idx = await buildLocalXmlIndex(year);
    if (!idx) return null;
    localXmlIndex = { year, byBasename: idx };
    return idx;
}

async function upsertReturnFinancialsBestEffort(params: {
    supabaseAdmin: any;
    returnId: string;
    xmlPath: string;
}) {
    const { supabaseAdmin, returnId, xmlPath } = params;

    try {
        const fin = await parseReturnFinancialsFromXmlPath(xmlPath);
        const now = new Date().toISOString();

        const { error } = await supabaseAdmin
            .schema("irs")
            .from("return_financials")
            .upsert(
                {
                    return_id: returnId,
                    total_revenue: fin.total_revenue,
                    total_expenses: fin.total_expenses,
                    excess_or_deficit: fin.excess_or_deficit,
                    total_assets_begin: fin.total_assets_begin,
                    total_assets_end: fin.total_assets_end,
                    total_liabilities_begin: fin.total_liabilities_begin,
                    total_liabilities_end: fin.total_liabilities_end,
                    net_assets_begin: fin.net_assets_begin,
                    net_assets_end: fin.net_assets_end,
                    contributions: fin.contributions,
                    program_service_revenue: fin.program_service_revenue,
                    investment_income: fin.investment_income,
                    fundraising_gross: fin.fundraising_gross,
                    program_expenses: fin.program_expenses,
                    management_general_expenses:
                        fin.management_general_expenses,
                    fundraising_expenses: fin.fundraising_expenses,
                    source_map: fin.source_map,
                    updated_at: now,
                },
                { onConflict: "return_id" },
            );

        if (error) {
            // Don't fail ingestion if financials table isn't ready.
            console.warn(
                `WARN: return_financials upsert failed for return_id=${returnId}: ${error.message}`,
            );
        }
    } catch (e) {
        console.warn(
            `WARN: return_financials parse/upsert skipped for return_id=${returnId}: ${
                compactErr(e)
            }`,
        );
    }
}

/*
  Why JSONL first?
  - Your `irs.returns` / `irs.return_*` schema may still be evolving.
  - This gives you a deterministic, reproducible parse artifact.
  - Once schema is locked, turn on `--upsert`.

  Usage
    # Dry-run parse for a single XML (useful while mapping)
    pnpm tsx scripts/irs/import-990-bulk.ts --xml /mnt/data/202522329349301317_public.xml

    # Dry-run parse by downloading a single XML URL
    pnpm tsx scripts/irs/import-990-bulk.ts --xmlUrl <XML_URL>

    # Dry-run parse a single return by shard+objectId (downloads shard zip and extracts one XML)
    pnpm tsx scripts/irs/import-990-bulk.ts --year 2025 --shard 2025_TEOS_XML_08A --objectId 202522329349301317 --download

    # Process a TEOS year index, scoped to district EINs, write parsed JSONL
    pnpm tsx scripts/irs/import-990-bulk.ts --year 2025 --district <DISTRICT_UUID> --download

    # Process multiple TEOS index years (comma list)
    pnpm tsx scripts/irs/import-990-bulk.ts --years 2020,2021,2022,2023,2024 --district <DISTRICT_UUID> --download

    # Import by EINs directly (uses index lookups; falls back to local XML cache)
    pnpm tsx scripts/irs/import-990-bulk.ts --years 2022,2023,2024,2025 --ein 41-1839631,41-1619499 --download --upsert

    # Process an inclusive TEOS year range
    pnpm tsx scripts/irs/import-990-bulk.ts --from 2020 --to 2024 --district <DISTRICT_UUID> --download

    # Same, but also upsert into irs.returns (requires your schema to have expected columns)
    pnpm tsx scripts/irs/import-990-bulk.ts --year 2025 --district <DISTRICT_UUID> --download --upsert

  Notes
  - Index URL pattern:
      https://apps.irs.gov/pub/epostcard/990/xml/<YEAR>/index_<YEAR>.csv
  - Shard ZIP URL pattern:
      https://apps.irs.gov/pub/epostcard/990/xml/<YEAR>/<SHARD>.zip
    where <SHARD> looks like: 2025_TEOS_XML_08A
  - Each shard ZIP contains many `<OBJECT_ID>_public.xml` files.
*/

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import crypto from "node:crypto";
import readline from "node:readline";
import { spawnSync } from "node:child_process";

function has7z(): boolean {
    try {
        const r = spawnSync("7z", ["-h"], { encoding: "utf8" });
        // 7z -h often exits 1; we just care that it runs.
        return r.status === 0 || r.status === 1;
    } catch {
        return false;
    }
}

import { createClient } from "@supabase/supabase-js";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let dotenvLoaded = false;
function tryLoadDotenvOnce() {
    if (dotenvLoaded) return;
    dotenvLoaded = true;

    // In tsx/ESM, `require` is not defined unless created via `createRequire`.
    try {
        const dotenv = require("dotenv");
        const cwd = process.cwd();
        dotenv.config({ path: path.join(cwd, ".env.local") });
        dotenv.config({ path: path.join(cwd, ".env") });
    } catch {
        // dotenv is optional; scripts can still run if env is already provided.
    }
}

type IndexRow = {
    return_id: string | null;
    filing_type: string | null;
    ein: string;
    tax_period: string | null; // YYYYMM (from index)
    tax_year: string | null; // YYYY (from index)
    taxpayer_name: string | null;
    return_type: string | null; // 990, 990EZ, 990PF, etc.
    object_id: string; // long numeric
    shard: string | null; // e.g. 2025_TEOS_XML_08A
    filed_on: string | null; // YYYY-MM-DD (from index, if present)
};

type ParsedReturn = {
    ein: string;
    object_id: string;
    tax_year: number | null;
    tax_period_begin_dt: string | null; // ISO date
    tax_period_end_dt: string | null; // ISO date
    filed_on: string | null; // ISO date
    return_type: string | null;
    organization_name: string | null;
    source: {
        year?: number; // TEOS index year / release year
        shard?: string;
        index_return_id?: string | null;
        index_filing_type?: string | null;
        index_tax_period?: string | null; // YYYYMM
        index_tax_year?: string | null; // YYYY (index)
        index_taxpayer_name?: string | null;
        index_return_type?: string | null;
        index_filed_on?: string | null;
        xml_status?: "available" | "missing";
        missing_xml?: {
            reason: string;
            tried_urls: string[];
            year: number;
            object_id: string;
            shard: string | null;
            error?: string | null;
        };
    };
    xml: {
        path: string | null;
        sha256: string | null;
    };
};

const DEFAULT_BATCH_SIZE = 250;
let returnsSupportsSourceMap: boolean | null = null;
let returnsSupports990T: boolean | null = null;

function mustGetEnv(name: string): string {
    tryLoadDotenvOnce();

    const direct = process.env[name];
    if (direct) return direct;

    // Common fallbacks so scripts work across different env conventions
    const fallbacks: Record<string, string[]> = {
        NEXT_PUBLIC_SUPABASE_URL: ["SUPABASE_URL", "SUPABASE_PROJECT_URL"],
        SUPABASE_SERVICE_ROLE_KEY: [
            "SUPABASE_SERVICE_KEY",
            "SUPABASE_SERVICE_KEY_ROLE",
        ],
    };

    const keys = fallbacks[name] || [];
    for (const k of keys) {
        const v = process.env[k];
        if (v) return v;
    }

    throw new Error(`Missing env var: ${name}`);
}

function normalizeReturnTypeForEnum(input: string | null | undefined):
    | "990"
    | "990EZ"
    | "990PF"
    | "990N"
    | "990T"
    | null {
    if (!input) return null;
    const s = String(input).trim().toUpperCase();

    // Common TEOS/index and XML variants
    if (s === "990") return "990";
    if (s === "990EZ" || s === "990 EZ" || s === "990-EZ") return "990EZ";
    if (s === "990PF" || s === "990 PF" || s === "990-PF") return "990PF";
    if (s === "990N" || s === "990 N" || s === "990-N" || s === "EPOSTCARD") {
        return "990N";
    }
    if (s === "990T" || s === "990 T" || s === "990-T") return "990T";

    // If XML returned something like "ReturnTypeCd" that isn't a 990 type, ignore it.
    return null;
}

function isInvalid990TEnumError(message: string): boolean {
    const msg = String(message || "").toLowerCase();
    return msg.includes("invalid input value for enum") &&
        msg.includes("990t");
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

function readEinInputsFromFile(filePath: string): string[] {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`EIN file not found: ${resolved}`);
    }

    const raw = fs.readFileSync(resolved, "utf8");
    return raw
        .split(/\r?\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean);
}

function parseIndexDate(value: string | null | undefined): string | null {
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
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) {
        const [y, m, d] = raw.split("/");
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // ISO timestamp like 2024-05-10T00:00:00Z
    const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];

    return null;
}

function parseYearsFromArgs(args: Record<string, string | boolean>): number[] {
    const toIntYear = (v: unknown): number | null => {
        if (v == null) return null;
        const n = Number(String(v).trim());
        if (!Number.isFinite(n)) return null;
        const y = Math.trunc(n);
        if (y < 2000 || y > 2100) return null;
        return y;
    };

    // 1) Explicit list: --years 2020,2021,...
    const yearsArg = typeof args.years === "string" ? String(args.years) : null;
    if (yearsArg) {
        const years = yearsArg
            .split(",")
            .map((s) => toIntYear(s))
            .filter((y): y is number => y != null);
        const uniq = Array.from(new Set(years)).sort((a, b) => a - b);
        if (!uniq.length) {
            throw new Error(
                "--years must contain valid years, e.g. --years 2020,2021,2022",
            );
        }
        return uniq;
    }

    // 2) Range: --from YYYY --to YYYY (inclusive)
    const from = toIntYear(args.from);
    const to = toIntYear(args.to);
    if (from != null || to != null) {
        if (from == null || to == null) {
            throw new Error(
                "Provide both --from and --to (inclusive year range)",
            );
        }
        if (to < from) throw new Error("--to must be >= --from");
        const out: number[] = [];
        for (let y = from; y <= to; y++) out.push(y);
        return out;
    }

    // 3) Backward-compatible single year
    const single = toIntYear(args.year);
    if (single != null) return [single];

    throw new Error(
        "Provide --year <YYYY> or --years <YYYY,YYYY,...> or --from <YYYY> --to <YYYY>",
    );
}

function ensureDir(p: string) {
    fs.mkdirSync(p, { recursive: true });
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function compactErr(e: unknown, max = 240): string {
    const msg = (e && typeof e === "object" && "message" in e)
        ? String((e as any).message)
        : String(e);
    // collapse whitespace/newlines so unzip output doesn't spam the terminal
    const compact = msg.replace(/\s+/g, " ").trim();
    if (compact.length <= max) return compact;
    return compact.slice(0, max - 1) + "…";
}

function looksLikeContainerPath(p: string): boolean {
    return p.startsWith("/mnt/") || p.startsWith("/home/");
}

const CONNECT_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;
// Shard ZIPs are very large; allow longer timeouts specifically for ZIP downloads.
const ZIP_CONNECT_TIMEOUT_MS = 30_000;
// Shard ZIPs can be 100MB+ and slow/cached on IRS; give them a longer request window.
const ZIP_REQUEST_TIMEOUT_MS = 300_000;

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_OBJECTS = 50;

class HttpStatusError extends Error {
    statusCode: number;
    url: string;
    constructor(url: string, statusCode: number, message?: string) {
        super(message || `HTTP ${statusCode} for ${url}`);
        this.statusCode = statusCode;
        this.url = url;
    }
}

type RequestOptions = {
    method?: "GET" | "HEAD";
    connectTimeoutMs?: number;
    requestTimeoutMs?: number;
    maxRedirects?: number;
};

async function requestToFile(
    url: string,
    outPath: string | null,
    opts: RequestOptions = {},
): Promise<{ statusCode: number; url: string }> {
    const method = opts.method ?? "GET";
    const connectTimeoutMs = opts.connectTimeoutMs ?? CONNECT_TIMEOUT_MS;
    const requestTimeoutMs = opts.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
    const maxRedirects = opts.maxRedirects ?? 3;

    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const file = outPath ? fs.createWriteStream(outPath) : null;
        let settled = false;

        const cleanup = (err?: any) => {
            if (settled) return;
            settled = true;
            if (file) {
                try {
                    file.close();
                } catch {}
            }
            if (outPath) {
                try {
                    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
                } catch {}
            }
            if (err) reject(err);
        };

        if (file) {
            file.on("error", (err) => cleanup(err));
        }

        const req = https.request(
            {
                method,
                hostname: u.hostname,
                path: `${u.pathname}${u.search}`,
                headers: { "User-Agent": "UpTheAnte-IRS-Ingest/1.0" },
            },
            (res) => {
                res.on("error", (err) => cleanup(err));

                if (
                    res.statusCode &&
                    res.statusCode >= 300 &&
                    res.statusCode < 400 &&
                    res.headers.location
                ) {
                    if (maxRedirects <= 0) {
                        cleanup(
                            new Error(`Too many redirects for ${url}`),
                        );
                        return;
                    }
                    const redirected = new URL(res.headers.location, url)
                        .toString();
                    cleanup();
                    requestToFile(redirected, outPath, {
                        ...opts,
                        maxRedirects: maxRedirects - 1,
                    }).then(resolve).catch(reject);
                    return;
                }

                const statusCode = res.statusCode ?? 0;
                if (method === "HEAD") {
                    res.resume();
                    if (statusCode >= 200 && statusCode < 300) {
                        settled = true;
                        resolve({ statusCode, url });
                        return;
                    }
                    cleanup(new HttpStatusError(url, statusCode));
                    return;
                }

                if (statusCode < 200 || statusCode >= 300) {
                    res.resume();
                    cleanup(new HttpStatusError(url, statusCode));
                    return;
                }

                if (!file) {
                    res.resume();
                    settled = true;
                    resolve({ statusCode, url });
                    return;
                }

                res.pipe(file);
                file.on("finish", () => {
                    file.close(() => {
                        if (settled) return;
                        settled = true;
                        resolve({ statusCode, url });
                    });
                });
            },
        );

        const overallTimer = setTimeout(() => {
            req.destroy(
                new Error(`Request timeout after ${requestTimeoutMs}ms`),
            );
        }, requestTimeoutMs);

        req.on("socket", (socket) => {
            if (socket.connecting) {
                const connectTimer = setTimeout(() => {
                    req.destroy(
                        new Error(
                            `Connect timeout after ${connectTimeoutMs}ms`,
                        ),
                    );
                }, connectTimeoutMs);
                socket.on("connect", () => clearTimeout(connectTimer));
            }
        });

        req.on("error", (err) => cleanup(err));
        req.on("close", () => clearTimeout(overallTimer));
        req.end();
    });
}

async function downloadFile(url: string, outPath: string): Promise<void> {
    await requestToFile(url, outPath);
}

function isLikelyZipFile(p: string): boolean {
    try {
        const fd = fs.openSync(p, "r");
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        // ZIP local file header signature starts with PK\x03\x04
        return buf[0] === 0x50 && buf[1] === 0x4b;
    } catch {
        return false;
    }
}

function testZip(zipPath: string): { ok: boolean; message?: string } {
    // Validate zip integrity.
    // Primary: `unzip -tqq` (strict). Fallback: `7z t` (more forgiving with some IRS shards).

    // Basic size sanity check (TEOS shards are large; a tiny file is almost certainly bad)
    try {
        const st = fs.statSync(zipPath);
        if (st.size < 1024) {
            return {
                ok: false,
                message: `ZIP too small (${st.size} bytes); likely truncated`,
            };
        }
    } catch (e) {
        return {
            ok: false,
            message: `ZIP stat failed: ${(e as any)?.message || e}`,
        };
    }

    const unzipRes = spawnSync("unzip", ["-tqq", zipPath], {
        encoding: "utf8",
    });
    const unzipStdout = String(unzipRes.stdout || "").trim();
    const unzipStderr = String(unzipRes.stderr || "").trim();
    const unzipCombined = [unzipStdout, unzipStderr].filter(Boolean).join("\n");

    // If unzip succeeded and was quiet, we're good.
    if (unzipRes.status === 0 && !unzipCombined) {
        return { ok: true };
    }

    // If unzip printed warnings or failed, try 7z as a fallback (some shards unzip dislikes).
    if (has7z()) {
        const zRes = spawnSync("7z", ["t", zipPath], { encoding: "utf8" });
        const zStdout = String(zRes.stdout || "").trim();
        const zStderr = String(zRes.stderr || "").trim();
        const zCombined = [zStdout, zStderr].filter(Boolean).join("\n");

        // 7z prints "Everything is Ok" on success.
        if (zRes.status === 0 && /Everything is Ok/i.test(zCombined)) {
            return {
                ok: true,
                message: unzipCombined
                    ? `unzip reported warnings but 7z validated OK: ${
                        unzipCombined.slice(0, 500)
                    }`
                    : undefined,
            };
        }

        if (zRes.status !== 0) {
            return {
                ok: false,
                message: (zCombined || unzipCombined || "zip validation failed")
                    .slice(
                        0,
                        2000,
                    ),
            };
        }
    }

    // No 7z available or it didn't validate.
    if (unzipRes.status !== 0) {
        return {
            ok: false,
            message: (unzipCombined || "unzip -t failed").slice(0, 2000),
        };
    }

    // unzip exited 0 but printed warnings; treat as invalid unless 7z said OK.
    const suspicious =
        /(error|expected central|zipfile|extra bytes|corrupt|cannot find|invalid)/i;
    if (suspicious.test(unzipCombined)) {
        return {
            ok: false,
            message: (unzipCombined || "zip reported warnings").slice(0, 2000),
        };
    }

    // If unzip printed something non-suspicious, allow it.
    return { ok: true };
}

function looksLikeCorruptZipMessage(input: string): boolean {
    const msg = String(input || "").toLowerCase();
    if (!msg) return false;
    return /(central directory|zipfile|corrupt|invalid|extra bytes|stzip|end-of-central|bad zip)/i
        .test(
            msg,
        );
}

async function downloadFileAtomic(url: string, outPath: string): Promise<void> {
    // Write to a temp file first, then rename (prevents partial files being treated as valid).
    const tmpPath = `${outPath}.tmp-${Date.now()}-${
        Math.random().toString(16).slice(2)
    }`;
    try {
        await downloadFile(url, tmpPath);
        atomicWriteFile(tmpPath, outPath);
    } catch (e) {
        try {
            await fsp.rm(tmpPath, { force: true });
        } catch {}
        throw e;
    }
}

async function downloadFileWithRetry(
    url: string,
    outPath: string,
    maxAttempts = DEFAULT_MAX_RETRIES,
): Promise<void> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await downloadFileAtomic(url, outPath);
            return;
        } catch (e) {
            lastErr = e;
            if (e instanceof HttpStatusError) {
                if (e.statusCode === 403 || e.statusCode === 404) {
                    throw e;
                }
            }
            if (attempt < maxAttempts) {
                console.warn(
                    `WARN: download failed (attempt ${attempt}/${maxAttempts}) for ${url}: ${
                        compactErr(e)
                    }`,
                );
                await sleep(300 * attempt);
                continue;
            }
        }
    }
    console.warn(`WARN: giving up after ${maxAttempts} attempts for ${url}`);
    throw lastErr;
}

async function downloadZipWithRetry(
    url: string,
    outPath: string,
    maxAttempts = 5,
): Promise<void> {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // ZIPs are large; use longer request timeout than normal XML/CSV fetches.
            const tmpPath = `${outPath}.tmp-${Date.now()}-${
                Math.random().toString(16).slice(2)
            }`;
            try {
                await requestToFile(url, tmpPath, {
                    method: "GET",
                    connectTimeoutMs: ZIP_CONNECT_TIMEOUT_MS,
                    requestTimeoutMs: ZIP_REQUEST_TIMEOUT_MS,
                });
                await fsp.rename(tmpPath, outPath);
            } catch (e) {
                try {
                    await fsp.rm(tmpPath, { force: true });
                } catch {}
                throw e;
            }

            // Quick signature check first (catches HTML/error pages masquerading as zip)
            if (!isLikelyZipFile(outPath)) {
                const head = fs.readFileSync(outPath, { encoding: "utf8" })
                    .slice(0, 200);
                throw new Error(
                    `Downloaded file does not look like a ZIP (missing PK header). First bytes: ${
                        JSON.stringify(head)
                    }`,
                );
            }

            const t = testZip(outPath);
            if (!t.ok) {
                throw new Error(`ZIP validation failed: ${t.message}`);
            }
            if (t.message) {
                console.warn(`WARN: ${t.message}`);
            }

            return;
        } catch (e) {
            lastErr = e;
            try {
                await fsp.rm(outPath, { force: true });
            } catch {}
            if (attempt < maxAttempts) {
                console.warn(
                    `WARN: download/zip validation failed (attempt ${attempt}/${maxAttempts}) for ${url}: ${
                        compactErr(e)
                    }`,
                );
                // small backoff helps if IRS is serving partial/cached maintenance responses
                await sleep(400 * attempt);
                continue;
            }
        }
    }

    throw new Error(
        `Failed to download a valid ZIP after ${maxAttempts} attempts: ${url}. Last error: ${
            compactErr(lastErr, 600)
        }`,
    );
}

function sha256File(p: string): string {
    const hash = crypto.createHash("sha256");
    const data = fs.readFileSync(p);
    hash.update(data);
    return hash.digest("hex");
}

function zipHasMember(zipPath: string, memberName: string): boolean {
    // Fast existence check without extracting.
    // IMPORTANT: do NOT list the whole ZIP (some shards have 80k+ entries and spawnSync buffers will overflow).
    // Instead, use a narrow pattern search.

    const target = memberName.toLowerCase();
    const patterns = [memberName, `*/${memberName}`, `*${memberName}`];

    // Prefer unzip pattern listing.
    for (const pat of patterns) {
        try {
            const r = spawnSync("unzip", ["-l", zipPath, pat], {
                encoding: "utf8",
            });
            const out = String(r.stdout || "");
            const err = String(r.stderr || "");
            const combined = (out + "\n" + err).toLowerCase();
            // When a match exists, unzip -l prints it; don't require exact column parsing.
            if (r.status === 0 && combined.includes(target)) return true;
        } catch {
            // ignore
        }
    }

    if (!has7z()) return false;

    // 7z pattern search (also narrow). NOTE: 7z uses include switches for patterns.
    for (const pat of patterns) {
        try {
            const r2 = spawnSync(
                "7z",
                ["l", "-ba", zipPath, `-i!${pat}`],
                { encoding: "utf8" },
            );
            const out2 = String(r2.stdout || "");
            const err2 = String(r2.stderr || "");
            const combined2 = (out2 + "\n" + err2).toLowerCase();
            if (r2.status === 0 && combined2.includes(target)) return true;
        } catch {
            // ignore
        }
    }

    return false;
}

function findZipMemberPath(zipPath: string, memberName: string): string | null {
    // Resolve the actual entry path by suffix match via full listing.
    // Required for redo-cycle subfolders (e.g., 2022Redo_cycle01_41/...).

    const target = memberName.toLowerCase();

    try {
        const r = spawnSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
        if (r.status !== 0) return null;
        const lines = String(r.stdout || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        for (const line of lines) {
            if (line.toLowerCase().endsWith(target)) return line;
        }
    } catch {
        // ignore
    }

    return null;
}

function unzipExtractSingle(
    zipPath: string,
    memberName: string,
    outPath: string,
) {
    // Some IRS shards trigger unzip warnings (non-zero) even when extraction is possible.
    // Also, 7z may exit with code 1 (warnings) but still produce valid output.
    ensureDir(path.dirname(outPath));

    // The IRS shard zips sometimes store XMLs inside subfolders.
    // Resolve the actual entry path by suffix match from a full listing.
    const resolvedMember = findZipMemberPath(zipPath, memberName) || memberName;

    // Prefer 7z first if available (more forgiving for odd central-directory warnings).
    if (has7z()) {
        // 1) Most robust: match by basename anywhere in the archive using 7z include patterns.
        //    This avoids needing to know subfolder paths inside the shard.
        const r2a = spawnSync(
            "7z",
            ["e", "-so", zipPath, `-ir!${memberName}`],
            { encoding: "buffer" },
        );
        if ((r2a.status === 0 || r2a.status === 1) && r2a.stdout) {
            const buf = Buffer.from(r2a.stdout);
            if (buf.length > 0) {
                fs.writeFileSync(outPath, buf);
                return;
            }
        }

        // 2) Fallback: attempt extraction using the resolved entry path.
        const r2 = spawnSync("7z", ["e", "-so", zipPath, resolvedMember], {
            encoding: "buffer",
        });

        if ((r2.status === 0 || r2.status === 1) && r2.stdout) {
            const buf = Buffer.from(r2.stdout);
            if (buf.length > 0) {
                fs.writeFileSync(outPath, buf);
                return;
            }
        }
    }

    // Fallback: system unzip to stdout
    const r = spawnSync("unzip", ["-p", zipPath, resolvedMember], {
        encoding: "buffer",
    });

    if ((r.status === 0 || r.status === 1) && r.stdout && r.stdout.length > 0) {
        fs.writeFileSync(outPath, r.stdout);
        return;
    }

    // Last attempt: if 7z exists but we didn't succeed above (e.g. stdout empty), capture stderr for debugging.
    let stderr2 = "";
    let status2: number | null = null;
    if (has7z()) {
        const r2b = spawnSync(
            "7z",
            ["e", "-so", zipPath, `-ir!${memberName}`],
            { encoding: "buffer" },
        );
        status2 = r2b.status;
        stderr2 = (r2b.stderr || Buffer.from("")).toString("utf8").trim();

        // If the include-pattern form didn't produce a clear error, also try the resolved path.
        if (!stderr2) {
            const r2c = spawnSync("7z", ["e", "-so", zipPath, resolvedMember], {
                encoding: "buffer",
            });
            status2 = r2c.status;
            stderr2 = (r2c.stderr || Buffer.from("")).toString("utf8").trim();
        }
    }

    const stderr1 = (r.stderr || Buffer.from("")).toString("utf8").trim();

    throw new Error(
        `Failed to extract ${resolvedMember} from ${zipPath}. ` +
            `unzip status=${r.status} stderr=${stderr1.slice(0, 400)} ` +
            (has7z()
                ? `| 7z status=${status2} stderr=${stderr2.slice(0, 400)}`
                : ""),
    );
}

// Minimal CSV parser (handles quoted fields and commas inside quotes)
function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
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

        if (ch === ",") {
            out.push(cur);
            cur = "";
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            continue;
        }

        cur += ch;
    }

    out.push(cur);
    return out.map((s) => s.trim());
}

function summarizeKeptRows(rows: IndexRow[]) {
    const byType: Record<string, number> = {};
    for (const r of rows) {
        const t = String(r.return_type || r.filing_type || "unknown");
        byType[t] = (byType[t] || 0) + 1;
    }
    const top = Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([k, v]) => `${k}:${v}`)
        .join(", ");

    console.log(`Kept row types: ${top || "<none>"}`);

    if (rows.length && rows.length <= 50) {
        console.log("Kept rows (object_id ein return_type tax_period shard):");
        for (const r of rows) {
            console.log(
                `- ${r.object_id} ${r.ein} ${
                    r.return_type || r.filing_type || "?"
                } ${r.tax_period || "?"} ${r.shard || "?"}`,
            );
        }
    }
}

function directXmlUrl(year: number, objectId: string): string {
    // Primary AWS Public Dataset endpoint (virtual-hosted style)
    // Bucket: irs-form-990 (us-east-1)
    return `https://irs-form-990.s3.amazonaws.com/${objectId}_public.xml`;
}

function directXmlUrlFallback(year: number, objectId: string): string {
    // Path-style fallback (some networks behave differently with virtual-hosted style)
    return `https://s3.amazonaws.com/irs-form-990/${objectId}_public.xml`;
}

function directXmlCandidateUrls(year: number, objectId: string): string[] {
    // Keep signature for logging/context; URLs ignore the year.
    const urls = [
        directXmlUrl(year, objectId),
        directXmlUrlFallback(year, objectId),
    ];

    const seen = new Set<string>();
    return urls.filter((u) => {
        if (seen.has(u)) return false;
        seen.add(u);
        return true;
    });
}

type DirectXmlAttemptResult = {
    ok: boolean;
    tried_urls: string[];
    reason: "available" | "not_found" | "error";
    error?: string;
};

// NOTE: HEAD checks proved unreliable in some environments; direct XML downloads now use GET-first logic.
async function headWithRetry(
    url: string,
    maxAttempts = DEFAULT_MAX_RETRIES,
): Promise<number> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await requestToFile(url, null, {
                method: "HEAD",
                connectTimeoutMs: 10_000,
                requestTimeoutMs: 10_000,
            });
            return res.statusCode;
        } catch (e) {
            lastErr = e;
            if (e instanceof HttpStatusError) {
                return e.statusCode;
            }
            if (attempt < maxAttempts) {
                console.warn(
                    `WARN: HEAD failed (attempt ${attempt}/${maxAttempts}) for ${url}: ${
                        compactErr(e)
                    }`,
                );
                await sleep(300 * attempt);
                continue;
            }
        }
    }
    throw lastErr;
}

// (resolveDirectXmlUrl removed; no longer used)

async function downloadDirectXmlWithMeta(
    year: number,
    objectId: string,
    outPath: string,
): Promise<DirectXmlAttemptResult> {
    // IMPORTANT: Some environments/proxies (and occasionally the IRS/S3 edge) make HEAD unreliable.
    // So we try GET directly against the known endpoints.
    const urls = directXmlCandidateUrls(year, objectId);

    let lastErr: unknown = null;
    let sawNotFoundHttp = false;

    for (const url of urls) {
        try {
            ensureDir(path.dirname(outPath));
            await downloadFileWithRetry(url, outPath, DEFAULT_MAX_RETRIES);

            if (!(await looksLikeReturnXml(outPath))) {
                const head = (await fsp.readFile(outPath))
                    .subarray(0, 200)
                    .toString("utf8");
                throw new Error(
                    `Direct XML download did not look like a Return XML. url=${url} head=${
                        JSON.stringify(head)
                    }`,
                );
            }

            return { ok: true, tried_urls: urls, reason: "available" };
        } catch (e) {
            lastErr = e;

            // Treat 403/404 as “not found” and try the next known endpoint.
            if (e instanceof HttpStatusError) {
                if (e.statusCode === 403 || e.statusCode === 404) {
                    sawNotFoundHttp = true;
                    continue;
                }
            }

            // For other errors (timeouts, transient network), try next endpoint if any.
            // If this was the last endpoint, surface the error.
            const isLast = url === urls[urls.length - 1];
            if (isLast) {
                return {
                    ok: false,
                    tried_urls: urls,
                    reason: "error",
                    error: compactErr(e, 600),
                };
            }
        }
    }

    // All candidate endpoints were 403/404 (or otherwise treated as not-found).
    if (lastErr instanceof HttpStatusError || sawNotFoundHttp) {
        const tried = urls.length;
        console.warn(
            `WARN: direct XML not found after trying ${tried} candidate URLs for object_id=${objectId} (start_year=${year}). ` +
                `This can happen if the IRS/AWS dataset has not published this index year yet.`,
        );
        return { ok: false, tried_urls: urls, reason: "not_found" };
    }

    // If we got here with a non-HTTP error, treat as not found (callers decide fallback behavior).
    return {
        ok: false,
        tried_urls: urls,
        reason: "error",
        error: compactErr(lastErr, 600),
    };
}

async function downloadDirectXml(
    year: number,
    objectId: string,
    outPath: string,
): Promise<boolean> {
    const res = await downloadDirectXmlWithMeta(year, objectId, outPath);
    return res.ok;
}

async function looksLikeReturnXml(filePath: string): Promise<boolean> {
    try {
        const buf = await fsp.readFile(filePath);
        if (!buf || buf.length < 50) return false;
        const head = buf.subarray(0, Math.min(buf.length, 4096)).toString(
            "utf8",
        );
        if (!head.trim().startsWith("<")) return false;
        return head.includes("<Return") || head.includes(":Return") ||
            head.includes("Return xmlns");
    } catch {
        return false;
    }
}

async function downloadXmlFallback(params: { url: string; outPath: string }) {
    const { url, outPath } = params;
    ensureDir(path.dirname(outPath));
    await downloadFileWithRetry(url, outPath, DEFAULT_MAX_RETRIES);
    if (!(await looksLikeReturnXml(outPath))) {
        const head = (await fsp.readFile(outPath)).subarray(0, 200).toString(
            "utf8",
        );
        throw new Error(
            `Direct XML download did not look like a Return XML. url=${url} head=${
                JSON.stringify(head)
            }`,
        );
    }
}

function indexUrlForYear(year: number): string {
    return `https://apps.irs.gov/pub/epostcard/990/xml/${year}/index_${year}.csv`;
}

function shardUrl(year: number, shard: string): string {
    const shardZipName = normalizeShard(shard);
    return `https://apps.irs.gov/pub/epostcard/990/xml/${year}/${shardZipName}.zip`;
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

function findCol(header: string[], ...candidates: string[]): number {
    for (const c of candidates) {
        const idx = header.indexOf(c.toLowerCase());
        if (idx !== -1) return idx;
    }
    return -1;
}

function extractShardFromUrl(input: string | null | undefined): string | null {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;

    // Already a shard token?
    if (/^\d{4}_TEOS_XML_/i.test(s)) return normalizeShard(s);

    // Full URL containing .../<SHARD>.zip
    const m1 = s.match(/\/(\d{4}_TEOS_XML_[0-9A-Z]+)\.zip/i);
    if (m1) return normalizeShard(m1[1]);

    // Bare filename like 2025_TEOS_XML_05A.zip
    const m2 = s.match(/^(\d{4}_TEOS_XML_[0-9A-Z]+)\.zip$/i);
    if (m2) return normalizeShard(m2[1]);

    // Token anywhere
    const m3 = s.match(/(\d{4}_TEOS_XML_[0-9A-Z]+)/i);
    if (m3) return normalizeShard(m3[1]);

    return null;
}

function normalizeShard(shard: string): string {
    return shard.replace(
        /_([0-9]{2})([a-z])$/i,
        (_match, n, letter) => `_${n}${String(letter).toUpperCase()}`,
    );
}

function inferIndexRow(params: {
    cols: string[];
    colIndex: {
        iEin: number;
        iType: number;
        iTaxPeriod: number;
        iObjectId: number;
        iShard: number;
        iReturnId: number;
        iFilingType: number;
        iTaxYear: number;
        iTaxpayerName: number;
        iUrl: number;
        iFiledOn: number;
    };
}): IndexRow | null {
    const { cols, colIndex } = params;

    const ein = normalizeEinInput(cols[colIndex.iEin]);
    if (!ein) return null;

    const objectId = String(cols[colIndex.iObjectId] || "").trim();
    let shard = colIndex.iShard !== -1
        ? String(cols[colIndex.iShard] || "").trim()
        : "";

    if (!shard && colIndex.iUrl !== -1) {
        shard = extractShardFromUrl(cols[colIndex.iUrl]) || "";
    }

    if (!shard) {
        // Some TEOS index variants embed the shard zip name or URL in an unexpected column.
        // As a last resort, scan the entire row for a TEOS shard token.
        for (const cell of cols) {
            const guess = extractShardFromUrl(cell);
            if (guess) {
                shard = guess;
                break;
            }
        }
    }

    if (shard) shard = normalizeShard(shard);

    if (!objectId) return null;

    return {
        return_id: colIndex.iReturnId !== -1
            ? (cols[colIndex.iReturnId] ||
                null)
            : null,
        filing_type: colIndex.iFilingType !== -1
            ? (cols[colIndex.iFilingType] ||
                null)
            : null,
        ein,
        tax_period: colIndex.iTaxPeriod !== -1
            ? (cols[colIndex.iTaxPeriod] || null)
            : null,
        tax_year: colIndex.iTaxYear !== -1
            ? (cols[colIndex.iTaxYear] || null)
            : null,
        taxpayer_name: colIndex.iTaxpayerName !== -1
            ? (cols[colIndex.iTaxpayerName] || null)
            : null,
        return_type: colIndex.iType !== -1
            ? (cols[colIndex.iType] || null)
            : null,
        object_id: objectId,
        shard: shard || null,
        filed_on: colIndex.iFiledOn !== -1
            ? (parseIndexDate(cols[colIndex.iFiledOn]) || null)
            : null,
    };
}

function yyyyMmToIsoEndDate(taxPeriod: string | null): string | null {
    // taxPeriod is often YYYYMM where month is the ending month; day unknown.
    // We'll interpret as the last day of that month.
    if (!taxPeriod) return null;
    const m = String(taxPeriod).trim().match(/^(\d{4})(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(y) || !Number.isFinite(mm) || mm < 1 || mm > 12) {
        return null;
    }
    const lastDay = new Date(Date.UTC(y, mm, 0)).getUTCDate();
    const iso = `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`;
    return iso;
}

function deriveTaxYear(
    indexTaxYear: string | number | null | undefined,
    taxPeriod: string | null | undefined,
): number | null {
    if (indexTaxYear != null) {
        const n = Number(String(indexTaxYear).trim());
        if (Number.isFinite(n) && n >= 1900 && n <= 3000) return n;
    }
    if (taxPeriod) {
        const m = String(taxPeriod).trim().match(/^(\d{4})\d{2}$/);
        if (m) {
            const n = Number(m[1]);
            if (Number.isFinite(n) && n >= 1900 && n <= 3000) return n;
        }
    }
    return null;
}

function resolveCacheDir(cacheDirArg: string | null | undefined): string {
    return path.resolve(cacheDirArg || path.join(process.cwd(), "data", "irs-cache"));
}

function buildXmlCachePath(params: {
    cacheDir: string;
    objectId?: string | null;
    url?: string | null;
    ein?: string | null;
}): string {
    const key = makeCacheKey({
        objectId: params.objectId,
        url: params.url,
        ein: params.ein,
    });
    return getXmlCachePath(key, params.cacheDir);
}

function parseTaxPeriodRank(
    taxPeriod: string | null | undefined,
    fallbackTaxYear: string | number | null | undefined,
): number {
    if (taxPeriod) {
        const m = String(taxPeriod).trim().match(/^(\d{4})(\d{2})$/);
        if (m) {
            const y = Number(m[1]);
            const mm = Number(m[2]);
            if (
                Number.isFinite(y) &&
                Number.isFinite(mm) &&
                mm >= 1 &&
                mm <= 12
            ) {
                return (y * 100) + mm;
            }
        }
    }

    const y = deriveTaxYear(fallbackTaxYear, taxPeriod);
    return y ? (y * 100) : 0;
}

function parseFiledOnRank(filedOn: string | null | undefined): number {
    if (!filedOn) return 0;
    const ts = Date.parse(String(filedOn).trim());
    return Number.isFinite(ts) ? ts : 0;
}

function compareNumericLikeStrings(a: string, b: string): number {
    const aNorm = String(a || "").replace(/\D/g, "");
    const bNorm = String(b || "").replace(/\D/g, "");
    if (aNorm.length !== bNorm.length) return aNorm.length - bNorm.length;
    if (aNorm === bNorm) return 0;
    return aNorm > bNorm ? 1 : -1;
}

function compareRowsByRecency(a: IndexRow, b: IndexRow): number {
    const aYear = deriveTaxYear(a.tax_year, a.tax_period) ?? 0;
    const bYear = deriveTaxYear(b.tax_year, b.tax_period) ?? 0;
    if (aYear !== bYear) return aYear - bYear;

    const aPeriod = parseTaxPeriodRank(a.tax_period, a.tax_year);
    const bPeriod = parseTaxPeriodRank(b.tax_period, b.tax_year);
    if (aPeriod !== bPeriod) return aPeriod - bPeriod;

    const aFiled = parseFiledOnRank(a.filed_on);
    const bFiled = parseFiledOnRank(b.filed_on);
    if (aFiled !== bFiled) return aFiled - bFiled;

    return compareNumericLikeStrings(a.object_id, b.object_id);
}

function selectLatestRowsPerEin(params: {
    rows: IndexRow[];
    excludeEins?: Set<string> | null;
}): IndexRow[] {
    const { rows, excludeEins } = params;

    const latestByEin = new Map<string, IndexRow>();
    for (const row of rows) {
        if (excludeEins?.has(row.ein)) continue;

        const existing = latestByEin.get(row.ein);
        if (!existing || compareRowsByRecency(row, existing) > 0) {
            latestByEin.set(row.ein, row);
        }
    }

    const selected = Array.from(latestByEin.values());
    selected.sort((a, b) => {
        const einCmp = a.ein.localeCompare(b.ein);
        if (einCmp !== 0) return einCmp;
        const recencyCmp = compareRowsByRecency(b, a);
        if (recencyCmp !== 0) return recencyCmp;
        return a.object_id.localeCompare(b.object_id);
    });

    return selected;
}

async function parseXmlToReturn(
    xmlPath: string,
    fallback: Partial<ParsedReturn>,
): Promise<ParsedReturn> {
    const xml = await fsp.readFile(xmlPath, "utf8");

    // Try fast-xml-parser if available, otherwise fall back to regex.
    let ein: string | null = null;
    let orgName: string | null = null;
    let returnType: string | null = fallback.return_type ?? null;
    let taxYear: number | null = (fallback.tax_year ?? null) as number | null;
    let taxPeriodBegin: string | null = (fallback as any).tax_period_begin_dt ??
        null;
    let taxPeriodEnd: string | null = (fallback as any).tax_period_end_dt ??
        null;
    let filedOn: string | null = (fallback as any).filed_on ?? null;

    try {
        const { XMLParser } = require("fast-xml-parser");
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            removeNSPrefix: true,
        });

        const doc = parser.parse(xml);
        // Typical structure: Return/ReturnHeader/Filer/EIN
        const filer = doc?.Return?.ReturnHeader?.Filer ||
            doc?.Return?.ReturnHeader?.ReturnFiler ||
            doc?.Return?.ReturnHeader?.Filer ||
            null;

        const einRaw = filer?.EIN || filer?.EIN?.[0] || null;
        ein = normalizeEinInput(einRaw);

        // Business name is often nested
        const bname = filer?.BusinessName ||
            filer?.BusinessNameLine1Txt ||
            doc?.Return?.ReturnHeader?.Filer?.BusinessName ||
            null;

        if (typeof bname === "string") {
            orgName = bname.trim() || null;
        } else if (bname && typeof bname === "object") {
            const line1 = bname?.BusinessNameLine1Txt ||
                bname?.BusinessNameLine1 ||
                bname?.["BusinessNameLine1Txt"] ||
                null;
            const line2 = bname?.BusinessNameLine2Txt ||
                bname?.BusinessNameLine2 ||
                bname?.["BusinessNameLine2Txt"] ||
                null;
            const joined = [line1, line2].filter(Boolean).join(" ").trim();
            orgName = joined || null;
        }

        const rh = doc?.Return?.ReturnHeader || null;

        // Tax year / period end are usually in ReturnHeader
        const taxYrRaw = rh?.TaxYr || rh?.TaxYear || rh?.TaxYrTxt || null;
        const taxBeginRaw = rh?.TaxPeriodBeginDt || rh?.TaxPeriodBeginDate ||
            rh?.TaxPeriodBeginDtTxt || null;
        const taxEndRaw = rh?.TaxPeriodEndDt || rh?.TaxPeriodEndDate ||
            rh?.TaxPeriodEndDtTxt || null;
        const returnTsRaw = rh?.ReturnTs || rh?.ReturnTsTxt ||
            rh?.ReturnTimestamp || null;

        if (taxYrRaw != null) {
            const n = Number(String(taxYrRaw).trim());
            if (Number.isFinite(n) && n > 1900 && n < 3000) taxYear = n;
        }

        if (typeof taxBeginRaw === "string" && taxBeginRaw.trim()) {
            taxPeriodBegin = taxBeginRaw.trim();
        }

        if (typeof taxEndRaw === "string" && taxEndRaw.trim()) {
            // Often already YYYY-MM-DD
            const s = taxEndRaw.trim();
            taxPeriodEnd = s;
        }

        if (returnTsRaw != null) {
            const parsed = parseIndexDate(String(returnTsRaw));
            if (parsed) filedOn = parsed;
        }

        // Return type can often be inferred from ReturnHeader/ReturnTypeCd or return version
        const rt = rh?.ReturnTypeCd ||
            rh?.ReturnType ||
            doc?.Return?.ReturnData?.IRS990?.["@_documentId"] ||
            doc?.Return?.ReturnData?.IRS990EZ?.["@_documentId"] ||
            doc?.Return?.ReturnData?.IRS990PF?.["@_documentId"] ||
            null;

        if (typeof rt === "string" && rt.trim()) {
            returnType = rt.trim();
        } else {
            // Infer from which ReturnData node exists
            if (doc?.Return?.ReturnData?.IRS990) {
                returnType = returnType || "990";
            }
            if (doc?.Return?.ReturnData?.IRS990EZ) {
                returnType = returnType || "990EZ";
            }
            if (doc?.Return?.ReturnData?.IRS990PF) {
                returnType = returnType || "990PF";
            }
        }
    } catch {
        // Regex fallback (less reliable but good enough for EIN + name)
        const einMatch = xml.match(/<\s*EIN\s*>\s*(\d{9})\s*<\s*\/\s*EIN\s*>/i);
        if (einMatch) ein = normalizeEinInput(einMatch[1]);

        const nameMatch = xml.match(
            /<\s*BusinessNameLine1Txt\s*>\s*([^<]+)\s*<\s*\/\s*BusinessNameLine1Txt\s*>/i,
        ) ||
            xml.match(
                /<\s*BusinessNameLine1\s*>\s*([^<]+)\s*<\s*\/\s*BusinessNameLine1\s*>/i,
            );
        if (nameMatch) orgName = String(nameMatch[1]).trim() || null;

        const taxYrMatch = xml.match(
            /<\s*TaxYr\s*>\s*(\d{4})\s*<\s*\/\s*TaxYr\s*>/i,
        );
        if (taxYrMatch) {
            const n = Number(taxYrMatch[1]);
            if (Number.isFinite(n) && n > 1900 && n < 3000) taxYear = n;
        }

        const taxBeginMatch = xml.match(
            /<\s*TaxPeriodBeginDt\s*>\s*([^<]+)\s*<\s*\/\s*TaxPeriodBeginDt\s*>/i,
        );
        if (taxBeginMatch) {
            taxPeriodBegin = String(taxBeginMatch[1]).trim() || taxPeriodBegin;
        }

        const taxEndMatch = xml.match(
            /<\s*TaxPeriodEndDt\s*>\s*([^<]+)\s*<\s*\/\s*TaxPeriodEndDt\s*>/i,
        );
        if (taxEndMatch) {
            taxPeriodEnd = String(taxEndMatch[1]).trim() || taxPeriodEnd;
        }

        const returnTsMatch = xml.match(
            /<\s*ReturnTs\s*>\s*([^<]+)\s*<\s*\/\s*ReturnTs\s*>/i,
        );
        if (returnTsMatch) {
            const parsed = parseIndexDate(returnTsMatch[1]);
            if (parsed) filedOn = parsed;
        }

        if (!returnType) {
            if (/<\s*IRS990\b/i.test(xml)) returnType = "990";
            if (/<\s*IRS990EZ\b/i.test(xml)) returnType = "990EZ";
            if (/<\s*IRS990PF\b/i.test(xml)) returnType = "990PF";
        }
    }

    const einN = ein || fallback.ein;
    if (!einN) {
        throw new Error(`Could not parse EIN from XML: ${xmlPath}`);
    }

    const sha = sha256File(xmlPath);

    return {
        ein: einN,
        object_id: fallback.object_id!,
        tax_year: taxYear,
        tax_period_begin_dt: taxPeriodBegin,
        tax_period_end_dt: taxPeriodEnd,
        filed_on: filedOn,
        return_type: returnType,
        organization_name: orgName || fallback.organization_name || null,
        source: fallback.source || {},
        xml: { path: xmlPath, sha256: sha },
    };
}

// Ensure parent org rows exist for TEOS returns upsert (to satisfy FK irs.returns.ein -> irs.organizations.ein)
async function ensureOrganizationsExist(
    supabaseAdmin: any,
    rows: ParsedReturn[],
) {
    if (!rows.length) return;

    // The FK error you hit (returns_ein_fkey) means `irs.returns.ein` must reference an existing row
    // in `irs.organizations`.
    // TEOS can surface a return before we have an organizations row, so we upsert a minimal org record.

    // De-dupe EINs.
    const byEin = new Map<string, ParsedReturn>();
    for (const r of rows) {
        const ein = r.ein;
        if (!ein) continue;
        if (!byEin.has(ein)) byEin.set(ein, r);
    }

    const now = new Date().toISOString();

    const payload = Array.from(byEin.entries()).map(([ein, r]) => {
        // IMPORTANT:
        // - `ein` is the stable unique key (9-digit string)
        // - keep other fields minimal/nullable so we don't fight schema evolution
        return {
            ein,
            legal_name: r.organization_name ?? null,
            last_seen_at: now,
        };
    });

    if (!payload.length) return;

    // We only need org rows to exist so `irs.returns.ein` FK is satisfied.
    // If rows already exist, we should NOT fail ingestion.
    // Prefer UPSERT on the stable unique key (ein).

    // Try the most likely unique key first.
    try {
        const { error } = await supabaseAdmin
            .schema("irs")
            .from("organizations")
            .upsert(payload, { onConflict: "ein" });

        if (error) {
            // If the conflict target is wrong, fall through.
            throw error;
        }

        return;
    } catch (e) {
        const msg = String(
            e instanceof Error ? e.message : e,
        );

        // If this was simply a primary key duplicate, that means the org row already exists.
        // That's fine for our FK precondition.
        if (
            /duplicate key value violates unique constraint\s+"organizations_pkey"/i
                .test(msg)
        ) {
            return;
        }

        // Fallback: upsert using `ein` as conflict target (common schema variant).
        const { error: error2 } = await supabaseAdmin
            .schema("irs")
            .from("organizations")
            .upsert(payload, { onConflict: "ein" });

        if (error2) {
            const msg2 = String(error2?.message || error2);

            // Again: if org already exists by PK, that's fine.
            if (
                /duplicate key value violates unique constraint\s+"organizations_pkey"/i
                    .test(msg2)
            ) {
                return;
            }

            // Don't hard-fail the whole ingestion; warn so we can continue parsing JSONL.
            console.warn(
                `WARN: ensureOrganizationsExist failed; returns upsert may fail FK. ${msg2}`,
            );
        }
    }
}

async function upsertReturns(supabaseAdmin: any, rows: ParsedReturn[]) {
    if (!rows.length) return { upserted: 0 };

    // Ensure parent org rows exist so the FK on irs.returns.ein is satisfied.
    await ensureOrganizationsExist(supabaseAdmin, rows);

    // Existing irs.returns schema columns we write:
    // - irs_object_id (text) UNIQUE
    // - ein (text)               (we store normalized 9-digit EIN)
    // - return_type (enum irs.return_type)
    // - tax_year (int)
    // - tax_period_start (date)
    // - tax_period_end (date)
    // - filed_on (date)          (from TEOS index or XML ReturnTs when available)
    // - source_system (text)     (set to "teos")
    // - return_name (text)       (we use parsed organization name)
    // Plus optional TEOS/XML provenance columns if present:
    // - teos_index_year, teos_tax_period_yyyymm, teos_return_id, teos_filing_type,
    //   teos_tax_year, teos_taxpayer_name, teos_return_type, teos_shard,
    //   xml_sha256, xml_path

    const payloadInputs = rows.map((r) => {
        const returnType = normalizeReturnTypeForEnum(r.return_type) ||
            normalizeReturnTypeForEnum(r.source.index_return_type ?? null);
        const normalizedTaxYear = r.tax_year ??
            deriveTaxYear(
                r.source.index_tax_year ?? null,
                r.source.index_tax_period ?? null,
            );
        const xmlStatus = r.source.xml_status ||
            (r.xml.path ? "available" : "missing");
        const sourceMap: Record<string, any> = {
            xml_status: xmlStatus,
        };
        if (r.source.missing_xml) {
            sourceMap.missing_xml = r.source.missing_xml;
        }

        return {
            r,
            returnType,
            normalizedTaxYear,
            sourceMap,
        };
    }).filter((p) => p.normalizedTaxYear != null);

    const skippedMissingTaxYear = rows.length - payloadInputs.length;
    if (skippedMissingTaxYear > 0) {
        console.warn(
            `WARN: skipping ${skippedMissingTaxYear.toLocaleString()} return upsert(s) with null tax_year after fallback.`,
        );
    }

    if (!payloadInputs.length) return { upserted: 0 };

    const hasPotential990T = payloadInputs.some((p) => p.returnType === "990T");
    let includeSourceMap = returnsSupportsSourceMap !== false;
    let downgrade990T = returnsSupports990T === false;

    while (true) {
        const payload = payloadInputs.map(({ r, returnType, normalizedTaxYear, sourceMap }) => {
            const returnTypeForDb = !returnType
                ? "unknown"
                : downgrade990T && returnType === "990T"
                ? "unknown"
                : returnType;

            return {
                // Core identity
                irs_object_id: r.object_id,
                ein: r.ein,

                // Filing basics
                return_type: returnTypeForDb,
                tax_year: normalizedTaxYear,
                tax_period_start: r.tax_period_begin_dt,
                tax_period_end: r.tax_period_end_dt,
                filed_on: r.filed_on ?? null,

                // Optional / provenance
                source_system: "teos",
                source_priority: "xml",
                return_name: r.organization_name,
                ...(includeSourceMap ? { source_map: sourceMap } : {}),

                // TEOS/index metadata (only works if columns exist)
                teos_index_year: r.source.year ?? null,
                teos_tax_period_yyyymm: r.source.index_tax_period ?? null,
                teos_return_id: r.source.index_return_id ?? null,
                teos_filing_type: r.source.index_filing_type ?? null,
                teos_tax_year: r.source.index_tax_year ?? null,
                teos_taxpayer_name: r.source.index_taxpayer_name ?? null,
                teos_return_type: r.source.index_return_type ?? null,
                teos_shard: r.source.shard ?? null,

                xml_sha256: r.xml.sha256,
                xml_path: r.xml.path,
            };
        });

        const { error } = await supabaseAdmin
            .schema("irs")
            .from("returns")
            .upsert(payload, { onConflict: "irs_object_id" });

        if (!error) {
            if (returnsSupportsSourceMap == null && includeSourceMap) {
                returnsSupportsSourceMap = true;
            }
            if (returnsSupports990T == null && hasPotential990T && !downgrade990T) {
                returnsSupports990T = true;
            }
            return { upserted: payload.length };
        }

        const msg = String(error.message || "");
        const msgLower = msg.toLowerCase();
        const missingSourceMap = includeSourceMap &&
            msgLower.includes("source_map") &&
            msgLower.includes("could not find");
        if (missingSourceMap) {
            returnsSupportsSourceMap = false;
            includeSourceMap = false;
            console.warn(
                "WARN: irs.returns.source_map column not found; retrying upsert without source_map payload.",
            );
            continue;
        }

        if (!downgrade990T && isInvalid990TEnumError(msg)) {
            returnsSupports990T = false;
            downgrade990T = true;
            console.warn(
                'WARN: irs.irs_return_type does not include "990T"; retrying with return_type="unknown" for 990-T filings.',
            );
            continue;
        }

        throw new Error(`Upsert into irs.returns failed: ${error.message}`);
    }
}

async function processYear(params: {
    year: number;
    districtEntityId: string | null;
    statuses: string[];
    download: boolean;
    upsert: boolean;
    debug: boolean;
    debugRow: string | null;
    batchSize: number;
    maxObjects: number;
    scopedEinOverride?: Set<string> | null;
    latestOnly?: boolean;
    latestOnlyExcludeEins?: Set<string> | null;
    cacheDir: string;
    forceDownload?: boolean;
}) {
    const {
        year,
        districtEntityId,
        statuses,
        download,
        upsert,
        debug,
        debugRow,
        batchSize,
        maxObjects,
        scopedEinOverride,
        latestOnly,
        latestOnlyExcludeEins,
        cacheDir,
        forceDownload,
    } = params;

    if (!Number.isFinite(year)) {
        throw new Error("Provide --year <YYYY> (or --years/--from/--to)");
    }

    const needsSupabase = upsert ||
        (Boolean(districtEntityId) && !scopedEinOverride);
    const supabaseAdmin = needsSupabase
        ? createClient(
            mustGetEnv("NEXT_PUBLIC_SUPABASE_URL"),
            mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"),
            { auth: { persistSession: false } },
        )
        : null;

    if (needsSupabase && !supabaseAdmin) {
        throw new Error(
            "Supabase client was required but could not be created.",
        );
    }

    let scopedEinSet: Set<string> | null = null;
    if (scopedEinOverride && scopedEinOverride.size) {
        scopedEinSet = scopedEinOverride;
        console.log(
            `Using explicit EIN filter: ${scopedEinSet.size.toLocaleString()} EIN(s)`,
        );
    } else if (districtEntityId) {
        console.log(
            `Loading scoped EINs for district_entity_id=${districtEntityId} statuses=${
                statuses.join(",")
            }`,
        );
        scopedEinSet = await loadScopedEinSet({
            supabaseAdmin: supabaseAdmin!,
            districtEntityId,
            statuses,
        });
        console.log(
            `Scoped EINs loaded: ${scopedEinSet.size.toLocaleString()}`,
        );
        if (scopedEinSet.size) {
            const einList = Array.from(scopedEinSet).sort();
            const dashed = einList.map((ein) => {
                try {
                    return formatEinDashed(ein);
                } catch {
                    return ein;
                }
            });
            const einCsv = dashed.join(",");
            const maxInline = 200;

            if (dashed.length <= maxInline) {
                console.log(`EINs (--ein): ${einCsv}`);
            } else {
                console.log(
                    `EINs (--ein): ${dashed.length.toLocaleString()} total (too many to print inline)`,
                );
            }

            const einDir = path.join(getPersistentTeosRoot(), "ein");
            ensureDir(einDir);
            const einPath = path.join(
                einDir,
                `ein_list_${districtEntityId}_${year}.txt`,
            );
            fs.writeFileSync(einPath, einCsv, "utf8");
            console.log(`EIN list written: ${einPath}`);
        }
    }

    // 1) Download index CSV
    const indexUrl = indexUrlForYear(year);
    const indexPath = getTeosIndexPath(year);
    const hasLocalIndex = isValidCachedFile(indexPath);

    if (forceDownload || !hasLocalIndex) {
        if (!download) {
            throw new Error(
                `Missing local index file ${indexPath}. Pass --download to fetch it.`,
            );
        }
        console.log(`Downloading index: ${indexUrl}`);
        await downloadFileWithRetry(indexUrl, indexPath, DEFAULT_MAX_RETRIES);
    } else {
        console.log(`Using local index: ${indexPath}`);
    }

    // 2) Parse index CSV and filter
    const rl = readline.createInterface({
        input: fs.createReadStream(indexPath, { encoding: "utf8" }),
        crlfDelay: Infinity,
    });

    let isHeader = true;
    let colIndex: {
        iEin: number;
        iType: number;
        iTaxPeriod: number;
        iObjectId: number;
        iShard: number;
        iReturnId: number;
        iFilingType: number;
        iTaxYear: number;
        iTaxpayerName: number;
        iUrl: number;
    } | null = null;
    const neededByShard = new Map<string, IndexRow[]>();
    const directRows: IndexRow[] = [];
    const keptRows: IndexRow[] = [];
    let totalIndexRows = 0;
    let totalScopedKept = 0;

    for await (const lineRaw of rl) {
        const line = String(lineRaw || "");
        if (!line.trim()) continue;

        // skip header
        if (isHeader) {
            isHeader = false;
            const header = parseCsvLine(line).map((h) =>
                h.trim().toLowerCase()
            );

            const iEin = findCol(header, "ein");
            const iType = findCol(header, "return_type", "returntype");
            const iTaxPeriod = findCol(header, "tax_period", "taxperiod");
            const iObjectId = findCol(header, "object_id", "objectid");
            const iShard = findCol(
                header,
                "shard",
                "shard_num",
                "shardnum",
                "shard_number",
                "shardnumber",
                "zip_shard",
                "zipshard",
                "zip",
                "zip_name",
                "zipname",
                "shard_zip",
                "shardzip",
            );
            const iReturnId = findCol(header, "return_id", "returnid");
            const iFilingType = findCol(header, "filing_type", "filingtype");
            const iTaxYear = findCol(
                header,
                "tax_year",
                "taxyear",
                "tax_yr",
                "taxyr",
            );
            const iTaxpayerName = findCol(
                header,
                "taxpayer_name",
                "taxpayername",
            );
            const iFiledOn = findCol(
                header,
                "filed_on",
                "filed_date",
                "filed_dt",
                "filing_date",
                "date_filed",
                "date_received",
                "received_date",
                "received_dt",
                "submitted_date",
                "submission_date",
                "return_received",
            );
            const iUrl = findCol(
                header,
                "url",
                "return_url",
                "xml_url",
                "file_url",
                "filelocation",
                "file_location",
                "file_loc",
                "download_url",
                "downloadurl",
                "zip_url",
                "zipurl",
                "shard/url",
                "shard_url",
                "shardurl",
                "xmlurl",
                "fileurl",
            );

            const missing: string[] = [];
            if (iEin === -1) missing.push("EIN");
            if (iTaxPeriod === -1) missing.push("TAX_PERIOD");
            if (iType === -1) missing.push("RETURN_TYPE");
            if (iObjectId === -1) missing.push("OBJECT_ID");

            if (missing.length) {
                console.error("Index header columns:", header.join(", "));
                throw new Error(
                    `Index CSV missing required columns: ${
                        missing.join(
                            ", ",
                        )
                    }`,
                );
            }

            if (iShard === -1 && iUrl === -1) {
                console.log(
                    "INFO: no shard columns in index; using direct XML downloads by object_id",
                );
            }

            colIndex = {
                iEin,
                iType,
                iTaxPeriod,
                iObjectId,
                iShard,
                iReturnId,
                iFilingType,
                iTaxYear,
                iTaxpayerName,
                iFiledOn,
                iUrl,
            };
            continue;
        }

        totalIndexRows++;
        const cols = parseCsvLine(line);
        if (!colIndex) {
            throw new Error("Index CSV header was not parsed.");
        }
        const row = inferIndexRow({ cols, colIndex });
        if (!row) continue;

        if (debug && debugRow && cols.join(",").includes(debugRow)) {
            console.log("DEBUG row sample:", {
                ein: cols[colIndex.iEin],
                taxPeriod: colIndex.iTaxPeriod !== -1
                    ? cols[colIndex.iTaxPeriod]
                    : null,
                returnType: colIndex.iType !== -1 ? cols[colIndex.iType] : null,
                objectId: cols[colIndex.iObjectId],
                shard: colIndex.iShard !== -1
                    ? cols[colIndex.iShard]
                    : (extractShardFromUrl(
                        colIndex.iUrl !== -1 ? cols[colIndex.iUrl] : null,
                    )),
            });
        }

        if (scopedEinSet && scopedEinSet.size) {
            if (!scopedEinSet.has(row.ein)) continue;
        }

        totalScopedKept++;
        keptRows.push(row);
        if (row.shard) {
            const arr = neededByShard.get(row.shard) || [];
            arr.push(row);
            neededByShard.set(row.shard, arr);
        } else {
            directRows.push(row);
        }
    }

    console.log(
        `Index parsed. total_rows=${totalIndexRows.toLocaleString()} kept=${totalScopedKept.toLocaleString()} shards=${neededByShard.size.toLocaleString()} direct=${directRows.length.toLocaleString()}`,
    );
    if (latestOnly) {
        console.log("latestOnly mode: selecting one most-recent row per EIN.");
    }
    summarizeKeptRows(keptRows);

    if (debug) {
        // Debug: shard histogram + exact kept rows per shard
        const shardCounts = Array.from(neededByShard.entries())
            .map(([shard, rs]) => ({ shard, count: rs.length }))
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.shard.localeCompare(b.shard);
            });

        console.log("\nDEBUG: shard match histogram (top 25)");
        for (const { shard, count } of shardCounts.slice(0, 25)) {
            console.log(`  ${shard}: ${count.toLocaleString()}`);
        }

        console.log("\nDEBUG: kept rows by shard");
        const shardsSorted = Array.from(neededByShard.keys()).sort((a, b) =>
            a.localeCompare(b)
        );
        for (const shard of shardsSorted) {
            const rs = neededByShard.get(shard) || [];
            console.log(`\n  ${shard} (${rs.length.toLocaleString()} matches)`);
            for (const r of rs) {
                const tp = r.tax_period ? ` tax_period=${r.tax_period}` : "";
                const rt = r.return_type ? ` return_type=${r.return_type}` : "";
                console.log(
                    `    ein=${r.ein} object_id=${r.object_id}${rt}${tp}`,
                );
            }
        }
        console.log("");
    }

    if (totalScopedKept === 0) {
        console.log("No matching index rows after filtering; nothing to do.");
        return { selectedEins: new Set<string>() };
    }

    const selectedRows = latestOnly
        ? selectLatestRowsPerEin({
            rows: keptRows,
            excludeEins: latestOnlyExcludeEins,
        })
        : keptRows;
    const selectedEins = new Set<string>(selectedRows.map((r) => r.ein));

    if (latestOnly) {
        const excludedByPriorYears = totalScopedKept - selectedRows.length;
        console.log(
            `latestOnly selected=${selectedRows.length.toLocaleString()} excluded_by_prior_or_older=${
                excludedByPriorYears.toLocaleString()
            }`,
        );
    }

    if (!selectedRows.length) {
        console.log(
            "No rows selected for this year after latestOnly filtering; nothing to do.",
        );
        return { selectedEins };
    }

    // 3) For each shard, download zip once, extract matching XMLs, parse, write JSONL.
    const jsonlDir = path.join(getPersistentTeosRoot(), "jsonl");
    ensureDir(jsonlDir);
    const outJsonl = path.join(
        jsonlDir,
        `teos_${year}_${districtEntityId ? districtEntityId : "all"}.jsonl`,
    );
    // Overwrite per run so these don't stack up forever.
    const outStream = fs.createWriteStream(outJsonl, { flags: "w" });
    console.log(`Writing JSONL: ${outJsonl}`);

    let parsedCount = 0;
    let upsertCount = 0;
    let returnsKeptCount = 0;
    let xmlFoundCount = 0;
    let xmlMissingDirectCount = 0;
    let xmlMissingShardCount = 0;
    let zipCorruptDetected = 0;
    let zipRedownloaded = 0;
    let zipRecovered = 0;
    let zipFailedFinal = 0;
    const upsertBatch: ParsedReturn[] = [];

    async function handleParsedReturn(parsed: ParsedReturn) {
        outStream.write(`${JSON.stringify(parsed)}\n`);
        parsedCount++;

        if (!upsert) return;

        upsertBatch.push(parsed);
        if (upsertBatch.length < batchSize) return;

        const res = await upsertReturns(supabaseAdmin!, upsertBatch);
        upsertCount += res.upserted;

        // Best-effort: populate irs.return_financials while XML is on disk.
        for (const r2 of upsertBatch) {
            if (!r2.xml.path) continue;
            const returnUuid = await resolveReturnUuidByObjectId(
                supabaseAdmin!,
                r2.object_id,
            );
            if (returnUuid) {
                await upsertReturnFinancialsBestEffort({
                    supabaseAdmin: supabaseAdmin!,
                    returnId: returnUuid,
                    xmlPath: r2.xml.path,
                });
            }
        }

        upsertBatch.length = 0;
        process.stdout.write(
            `\rUpserted ${upsertCount.toLocaleString()} returns...`,
        );
    }

    const shardCache = new Map<
        string,
        { zipPath: string; ready: boolean; failed: boolean; retried: boolean }
    >();

    function sourceBaseFromIndex(
        r: IndexRow,
        effectiveShard: string | null,
    ): ParsedReturn["source"] {
        return {
            year,
            shard: effectiveShard ?? undefined,
            index_return_id: r.return_id,
            index_filing_type: r.filing_type,
            index_tax_period: r.tax_period,
            index_tax_year: r.tax_year,
            index_taxpayer_name: r.taxpayer_name,
            index_return_type: r.return_type,
            index_filed_on: r.filed_on ?? null,
        };
    }

    function buildMissingParsedReturn(params: {
        row: IndexRow;
        effectiveShard: string | null;
        reason: string;
        triedUrls?: string[];
        error?: string | null;
    }): ParsedReturn {
        const { row, effectiveShard, reason, triedUrls, error } = params;
        const derivedTaxYear = deriveTaxYear(row.tax_year, row.tax_period);
        return {
            ein: row.ein,
            object_id: row.object_id,
            tax_year: derivedTaxYear,
            tax_period_begin_dt: null,
            tax_period_end_dt: yyyyMmToIsoEndDate(row.tax_period),
            filed_on: row.filed_on ?? null,
            return_type: row.return_type || null,
            organization_name: row.taxpayer_name || null,
            source: {
                ...sourceBaseFromIndex(row, effectiveShard),
                xml_status: "missing",
                missing_xml: {
                    reason,
                    tried_urls: triedUrls ?? [],
                    year,
                    object_id: row.object_id,
                    shard: effectiveShard,
                    error: error ?? null,
                },
            },
            xml: {
                path: null,
                sha256: null,
            },
        };
    }

    async function redownloadShardZip(
        shard: string,
        zipPath: string,
    ): Promise<{ ok: boolean; error?: string }> {
        try {
            await fsp.rm(zipPath, { force: true });
        } catch {}
        zipRedownloaded++;
        try {
            await downloadZipWithRetry(shardUrl(year, shard), zipPath, 3);
            return { ok: true };
        } catch (e) {
            return { ok: false, error: compactErr(e, 700) };
        }
    }

    async function ensureShardZip(shard: string): Promise<string | null> {
        const existing = shardCache.get(shard);
        if (existing?.ready) return existing.zipPath;
        if (existing?.failed) return null;

        const zipPath = getTeosShardZipPath(year, shard);
        shardCache.set(shard, {
            zipPath,
            ready: false,
            failed: false,
            retried: false,
        });

        try {
            if (fs.existsSync(zipPath)) {
                const validation = testZip(zipPath);
                if (!validation.ok) {
                    zipCorruptDetected++;
                    console.warn(
                        `WARN: shard ZIP failed integrity test: ${zipPath} (${
                            validation.message || "unknown reason"
                        })`,
                    );
                    const redownload = await redownloadShardZip(shard, zipPath);
                    if (!redownload.ok) {
                        zipFailedFinal++;
                        shardCache.set(shard, {
                            zipPath,
                            ready: false,
                            failed: true,
                            retried: true,
                        });
                        console.warn(
                            `WARN: failed to recover corrupt shard ZIP ${shard}: ${
                                redownload.error
                            }`,
                        );
                        return null;
                    }
                    zipRecovered++;
                }

                shardCache.set(shard, {
                    zipPath,
                    ready: true,
                    failed: false,
                    retried: false,
                });
                return zipPath;
            }
            const url = shardUrl(year, shard);
            console.log(`Downloading shard ${shard}`);
            await downloadZipWithRetry(url, zipPath, 3);
            shardCache.set(shard, {
                zipPath,
                ready: true,
                failed: false,
                retried: false,
            });
            return zipPath;
        } catch (e) {
            console.warn(
                `WARN: failed to download/validate shard ${shard}. Error: ${
                    compactErr(e, 600)
                }`,
            );
            shardCache.set(shard, {
                zipPath,
                ready: false,
                failed: true,
                retried: false,
            });
            return null;
        }
    }

    async function extractShardMemberWithRecovery(params: {
        shard: string;
        member: string;
        xmlOut: string;
    }): Promise<{ ok: boolean; reason?: string; error?: string }> {
        const { shard, member, xmlOut } = params;
        const zipPath = await ensureShardZip(shard);
        if (!zipPath) {
            return {
                ok: false,
                reason: "missing_shard_zip",
                error: `Shard ZIP unavailable for ${shard}`,
            };
        }

        try {
            unzipExtractSingle(zipPath, member, xmlOut);
            return { ok: true };
        } catch (e) {
            const firstErr = compactErr(e, 700);
            const firstLooksCorrupt = looksLikeCorruptZipMessage(firstErr);
            if (!firstLooksCorrupt) {
                return {
                    ok: false,
                    reason: "shard_extract_failed",
                    error: firstErr,
                };
            }

            zipCorruptDetected++;
            console.warn(
                `WARN: shard extraction looks corrupt for ${shard} (${zipPath}): ${firstErr}`,
            );

            const cached = shardCache.get(shard);
            if (cached?.retried) {
                zipFailedFinal++;
                return { ok: false, reason: "corrupt_zip", error: firstErr };
            }
            if (cached) cached.retried = true;

            const redownload = await redownloadShardZip(shard, zipPath);
            if (!redownload.ok) {
                zipFailedFinal++;
                if (cached) cached.failed = true;
                return {
                    ok: false,
                    reason: "corrupt_zip",
                    error: redownload.error || firstErr,
                };
            }

            try {
                unzipExtractSingle(zipPath, member, xmlOut);
                zipRecovered++;
                if (cached) {
                    cached.ready = true;
                    cached.failed = false;
                }
                return { ok: true };
            } catch (e2) {
                const secondErr = compactErr(e2, 700);
                const looksCorruptAgain = looksLikeCorruptZipMessage(secondErr);
                if (looksCorruptAgain) {
                    zipFailedFinal++;
                    if (cached) cached.failed = true;
                    return { ok: false, reason: "corrupt_zip", error: secondErr };
                }
                return {
                    ok: false,
                    reason: "shard_extract_failed",
                    error: secondErr,
                };
            }
        }
    }

    function listLocalZipPathsForYear(y: number): string[] {
        const dir = path.join(getPersistentTeosRoot(), "zips", String(y));
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            return entries
                .filter((e) =>
                    e.isFile() && e.name.toLowerCase().endsWith(".zip")
                )
                .map((e) => path.join(dir, e.name));
        } catch {
            return [];
        }
    }

    function shardNameFromZipPath(zipPath: string): string {
        const base = path.basename(zipPath, path.extname(zipPath));
        return base || "LOCAL_ZIP";
    }

    function findLocalZipContainingMember(params: {
        y: number;
        memberName: string;
    }): { zipPath: string; shard: string } | null {
        const { y, memberName } = params;
        const zips = listLocalZipPathsForYear(y);
        if (!zips.length) return null;

        for (const zp of zips) {
            try {
                if (zipHasMember(zp, memberName)) {
                    return { zipPath: zp, shard: shardNameFromZipPath(zp) };
                }
            } catch {
                // keep searching
            }
        }

        return null;
    }

    if (latestOnly && maxObjects > 0) {
        console.log("INFO: --latestOnly set; ignoring --maxObjects.");
    }
    const keptRowsLimited = latestOnly
        ? selectedRows
        : maxObjects > 0
        ? selectedRows.slice(0, maxObjects)
        : selectedRows;
    returnsKeptCount = keptRowsLimited.length;

    function inferShardFromXmlPath(p: string): string | null {
        const m = String(p || "").match(
            /(?:^|[\\/])(\d{4}_TEOS_XML_[0-9A-Z]+)(?:[\\/]|$)/i,
        );
        return m?.[1] ? String(m[1]) : null;
    }

    for (const r of keptRowsLimited) {
        // `effectiveShard` is the shard we actually used (can differ when we locate the XML inside a local ZIP).
        let effectiveShard: string | null = r.shard || null;

        const member = `${r.object_id}_public.xml`;
        const xmlOut = buildXmlCachePath({
            cacheDir,
            objectId: r.object_id,
            ein: r.ein,
        });
        let xmlPath = xmlOut;
        let available = !forceDownload && isValidCachedFile(xmlOut);
        let missingReason: string | null = null;
        let missingError: string | null = null;
        let triedUrls: string[] = [];

        if (!available && !forceDownload) {
            // First, honor any already-extracted local XML cache regardless of shard presence.
            const localIdxAny = await getLocalXmlIndex(year);
            const localPathAny = localIdxAny ? (localIdxAny.get(member) || null) : null;
            if (localPathAny) {
                try {
                    fs.mkdirSync(path.dirname(xmlOut), { recursive: true });
                    fs.copyFileSync(localPathAny, xmlOut);
                    xmlPath = xmlOut;
                } catch {
                    xmlPath = localPathAny;
                }
                effectiveShard = inferShardFromXmlPath(localPathAny) || effectiveShard;
                available = isValidCachedFile(xmlPath);
                console.warn(
                    `WARN: using local cache XML for object_id=${r.object_id}: ${localPathAny}`,
                );
            }
        }

        if (!available) {
            if (r.shard) {
                // Shard-first for indexed rows with shard metadata.
                const fromShard = await extractShardMemberWithRecovery({
                    shard: r.shard,
                    member,
                    xmlOut,
                });
                if (fromShard.ok) {
                    xmlPath = xmlOut;
                    effectiveShard = r.shard;
                    available = true;
                } else if (fromShard.reason === "corrupt_zip") {
                    missingReason = "corrupt_zip";
                    missingError = fromShard.error || null;
                } else {
                    // Fallback to direct XML endpoints before declaring missing.
                    const direct = await downloadDirectXmlWithMeta(
                        year,
                        r.object_id,
                        xmlOut,
                    );
                    triedUrls = direct.tried_urls;
                    if (direct.ok) {
                        xmlPath = xmlOut;
                        available = true;
                    } else {
                        // Last resort: scan any local year ZIP for this member.
                        const found = findLocalZipContainingMember({
                            y: year,
                            memberName: member,
                        });
                        if (found) {
                            effectiveShard = found.shard;
                            try {
                                unzipExtractSingle(found.zipPath, member, xmlOut);
                                xmlPath = xmlOut;
                                available = true;
                                console.warn(
                                    `WARN: extracted object_id=${r.object_id} from fallback local zip ${
                                        path.basename(found.zipPath)
                                    } (${found.shard})`,
                                );
                            } catch (e) {
                                missingReason = "shard_local_zip_extract_failed";
                                missingError = compactErr(e, 700);
                            }
                        } else {
                            missingReason = fromShard.reason === "missing_shard_zip"
                                ? "missing_shard_zip"
                                : "shard_extract_failed";
                            missingError = fromShard.error || direct.error || null;
                        }
                    }
                }
            } else {
                // No shard metadata: local cache/local ZIP fallback + direct candidate URLs.
                const localIdx = forceDownload ? null : await getLocalXmlIndex(year);
                const localPath = forceDownload
                    ? null
                    : localIdx
                    ? (localIdx.get(member) || null)
                    : null;
                if (localPath) {
                    try {
                        fs.mkdirSync(path.dirname(xmlOut), { recursive: true });
                        fs.copyFileSync(localPath, xmlOut);
                        xmlPath = xmlOut;
                    } catch {
                        xmlPath = localPath;
                    }
                    effectiveShard = inferShardFromXmlPath(localPath);
                    available = isValidCachedFile(xmlPath);
                    console.warn(
                        `WARN: no shard info for object_id=${r.object_id}; using local cache at ${localPath}`,
                    );
                } else {
                    const direct = await downloadDirectXmlWithMeta(
                        year,
                        r.object_id,
                        xmlOut,
                    );
                    triedUrls = direct.tried_urls;
                    if (direct.ok) {
                        xmlPath = xmlOut;
                        available = true;
                    } else {
                        const found = findLocalZipContainingMember({
                            y: year,
                            memberName: member,
                        });
                        if (found) {
                            effectiveShard = found.shard;
                            try {
                                unzipExtractSingle(found.zipPath, member, xmlOut);
                                xmlPath = xmlOut;
                                available = true;
                                console.warn(
                                    `WARN: no shard info for object_id=${r.object_id}; extracted from local zip ${
                                        path.basename(found.zipPath)
                                    } (${found.shard})`,
                                );
                            } catch (e) {
                                missingReason = "no_shard_local_zip_extract_failed";
                                missingError = compactErr(e, 700);
                            }
                        } else {
                            missingReason = "no_shard_direct_not_found";
                            missingError = direct.error || null;
                        }
                    }
                }
            }
        }

        if (!available) {
            const reason = missingReason || (r.shard
                ? "missing_shard_zip"
                : "no_shard_direct_not_found");
            if (r.shard) {
                xmlMissingShardCount++;
            } else {
                xmlMissingDirectCount++;
            }

            const missingParsed = buildMissingParsedReturn({
                row: r,
                effectiveShard,
                reason,
                triedUrls,
                error: missingError,
            });
            await handleParsedReturn(missingParsed);
            continue;
        }
        xmlFoundCount++;

        const parsed = await parseXmlToReturn(xmlPath, {
            ein: r.ein,
            object_id: r.object_id,
            tax_year: deriveTaxYear(r.tax_year, r.tax_period),
            tax_period_begin_dt: null,
            tax_period_end_dt: yyyyMmToIsoEndDate(r.tax_period),
            filed_on: r.filed_on ?? null,
            return_type: r.return_type || null,
            organization_name: null,
            source: {
                ...sourceBaseFromIndex(r, effectiveShard),
                xml_status: "available",
            },
        });

        await handleParsedReturn(parsed);
    }

    async function resolveReturnUuidByObjectId(
        supabaseAdmin: any,
        objectId: string,
    ): Promise<string | null> {
        const { data, error } = await supabaseAdmin
            .schema("irs")
            .from("returns")
            .select("id")
            .eq("irs_object_id", String(objectId))
            .limit(1)
            .maybeSingle();
        if (error) return null;
        return data?.id ? String(data.id) : null;
    }

    if (upsert && upsertBatch.length) {
        const res = await upsertReturns(supabaseAdmin!, upsertBatch);
        upsertCount += res.upserted;
        // Best-effort: populate irs.return_financials while XML is on disk.
        for (const r2 of upsertBatch) {
            if (!r2.xml.path) continue;
            const returnUuid = await resolveReturnUuidByObjectId(
                supabaseAdmin!,
                r2.object_id,
            );
            if (returnUuid) {
                await upsertReturnFinancialsBestEffort({
                    supabaseAdmin: supabaseAdmin!,
                    returnId: returnUuid,
                    xmlPath: r2.xml.path,
                });
            }
        }
        upsertBatch.length = 0;
    }

    outStream.end();
    if (upsert) process.stdout.write("\n");

    const xmlMissingTotal = xmlMissingDirectCount + xmlMissingShardCount;
    console.log(
        `Done. parsed=${parsedCount.toLocaleString()} jsonl=${outJsonl}`,
    );
    console.log(
        `Year ${year} summary: returns_kept=${returnsKeptCount.toLocaleString()} xml_found=${xmlFoundCount.toLocaleString()} xml_missing_direct=${xmlMissingDirectCount.toLocaleString()} xml_missing_shard=${xmlMissingShardCount.toLocaleString()} xml_missing_total=${xmlMissingTotal.toLocaleString()} zip_corrupt_detected=${zipCorruptDetected.toLocaleString()} zip_redownloaded=${zipRedownloaded.toLocaleString()} zip_recovered=${zipRecovered.toLocaleString()} zip_failed_final=${zipFailedFinal.toLocaleString()}`,
    );
    if (upsert) {
        console.log(
            `Upserted into irs.returns: ${upsertCount.toLocaleString()}`,
        );
    }

    return { selectedEins };
}

async function main() {
    const args = parseArgs(process.argv);

    const xmlArg = args.xml ? String(args.xml) : null;
    const xmlUrlArg = args.xmlUrl ? String(args.xmlUrl) : null;
    const yearArg = args.year ? Number(args.year) : null;
    const shardArg = args.shard ? String(args.shard) : null;
    const objectIdArg = args.objectId
        ? String(args.objectId)
        : args["object-id"]
        ? String(args["object-id"])
        : null;
    const districtEntityId = args.district ? String(args.district) : null;
    const einArg = args.ein
        ? String(args.ein)
        : args.eins
        ? String(args.eins)
        : null;
    const einsFileArg = args.einsFile
        ? String(args.einsFile)
        : args["eins-file"]
        ? String(args["eins-file"])
        : null;
    const statuses = parseCommaList(
        args.statuses ? String(args.statuses) : "candidate,active",
    );

    const download = Boolean(args.download);
    const upsert = Boolean(args.upsert);
    const latestOnly = Boolean(args.latestOnly);
    const forceDownload = Boolean(args.forceDownload);
    const cacheDirArg = args.cacheDir ? String(args.cacheDir) : null;
    const cacheDir = resolveCacheDir(cacheDirArg);
    const debug = Boolean(args.debug);
    const debugRow = args.debugRow ? String(args.debugRow) : null;
    const einInputs = [
        ...parseCommaList(einArg),
        ...(einsFileArg ? readEinInputsFromFile(einsFileArg) : []),
    ];
    const einList = einInputs
        .map((s) => normalizeEinInput(s))
        .filter((s): s is string => Boolean(s));
    const einSet = einList.length ? new Set(einList) : null;
    if (einsFileArg) {
        console.log(
            `Loaded EIN filter file: ${path.resolve(einsFileArg)} (normalized EINs=${einSet?.size ?? 0})`,
        );
    }
    const batchSize = args.batchSize
        ? Number(args.batchSize)
        : DEFAULT_BATCH_SIZE;
    const maxObjectsRaw = args.maxObjects
        ? Number(args.maxObjects)
        : args["max-objects"]
        ? Number(args["max-objects"])
        : null;
    const maxObjectsDefault = einList.length ? 0 : DEFAULT_MAX_OBJECTS;
    const maxObjects = Number.isFinite(maxObjectsRaw as number)
        ? Number(maxObjectsRaw)
        : maxObjectsDefault;
    if (latestOnly && maxObjects > 0) {
        console.log("INFO: --latestOnly set; --maxObjects will be ignored.");
    }
    console.log(`XML cache dir: ${cacheDir}`);

    // Single-XML mode (local file or downloaded URL)
    if (xmlArg || xmlUrlArg) {
        let p: string;

        if (xmlUrlArg) {
            const cachedByUrl = buildXmlCachePath({
                cacheDir,
                url: xmlUrlArg,
            });
            const useCached = !forceDownload && isValidCachedFile(cachedByUrl);
            if (useCached) {
                p = cachedByUrl;
            } else {
                await downloadFileWithRetry(
                    xmlUrlArg,
                    cachedByUrl,
                    DEFAULT_MAX_RETRIES,
                );
                if (!(await looksLikeReturnXml(cachedByUrl))) {
                    const head = (await fsp.readFile(cachedByUrl)).subarray(
                        0,
                        200,
                    ).toString("utf8");
                    throw new Error(
                        `Downloaded XML did not look like Return XML. url=${xmlUrlArg} head=${
                            JSON.stringify(head)
                        }`,
                    );
                }
                p = cachedByUrl;
            }
        } else {
            p = path.resolve(String(xmlArg));
        }

        if (!fs.existsSync(p)) {
            const hint = looksLikeContainerPath(p)
                ? "\nHint: `/mnt/...` is a container path. On your Mac, use the real local file path, or use --xmlUrl to download an XML, or use --year/--shard/--objectId with --download."
                : "";
            throw new Error(`XML not found: ${p}${hint}`);
        }

        const parsed = await parseXmlToReturn(p, {
            ein: "000000000",
            object_id: path.basename(p).replace(/_public\.xml$/i, "").replace(
                /\.xml$/i,
                "",
            ),
            tax_year: null,
            tax_period_begin_dt: null,
            tax_period_end_dt: null,
            return_type: null,
            organization_name: null,
            source: { year: yearArg ?? undefined },
        });

        console.log(JSON.stringify(parsed, null, 2));
        if (upsert) {
            const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
            const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
            const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
                auth: { persistSession: false },
            });
            await upsertReturns(supabaseAdmin, [parsed]);
            console.log("Upserted 1 return into irs.returns");
        }
        return;
    }

    // Single-return-by-object-id mode (direct XML from S3)
    if (yearArg && objectIdArg && !shardArg) {
        if (!download) {
            throw new Error(
                "For --year/--object-id mode, pass --download to fetch the XML.",
            );
        }

        const member = `${objectIdArg}_public.xml`;
        const xmlOut = buildXmlCachePath({
            cacheDir,
            objectId: objectIdArg,
        });
        if (forceDownload || !isValidCachedFile(xmlOut)) {
            // 1) Try S3-direct first.
            let ok = false;
            try {
                ok = await downloadDirectXml(yearArg, objectIdArg, xmlOut);
            } catch (e) {
                console.warn(
                    `WARN: direct XML download error for object_id=${objectIdArg}: ${
                        compactErr(e, 600)
                    }`,
                );
            }

            if (!ok) {
                // 2) Fall back: locate the row in the year index, then extract from shard zip.
                const idxUrl = indexUrlForYear(yearArg);
                const idxPath = getTeosIndexPath(yearArg);
                console.log(
                    `Direct XML not found; searching index for object_id=${objectIdArg} (${idxUrl})`,
                );
                await downloadFileWithRetry(
                    idxUrl,
                    idxPath,
                    DEFAULT_MAX_RETRIES,
                );

                const rl2 = readline.createInterface({
                    input: fs.createReadStream(idxPath, { encoding: "utf8" }),
                    crlfDelay: Infinity,
                });

                let headerDone = false;
                let col2: any = null;
                let found: IndexRow | null = null;

                for await (const lineRaw of rl2) {
                    const line = String(lineRaw || "");
                    if (!line.trim()) continue;

                    if (!headerDone) {
                        headerDone = true;
                        const header = parseCsvLine(line).map((h) =>
                            h.trim().toLowerCase()
                        );

                        const iEin = findCol(header, "ein");
                        const iType = findCol(
                            header,
                            "return_type",
                            "returntype",
                        );
                        const iTaxPeriod = findCol(
                            header,
                            "tax_period",
                            "taxperiod",
                        );
                        const iObjectId = findCol(
                            header,
                            "object_id",
                            "objectid",
                        );
                        const iShard = findCol(
                            header,
                            "shard",
                            "shard_num",
                            "shardnum",
                            "shard_number",
                            "shardnumber",
                            "zip_shard",
                            "zipshard",
                            "zip",
                            "zip_name",
                            "zipname",
                            "shard_zip",
                            "shardzip",
                        );
                        const iReturnId = findCol(
                            header,
                            "return_id",
                            "returnid",
                        );
                        const iFilingType = findCol(
                            header,
                            "filing_type",
                            "filingtype",
                        );
                        const iTaxYear = findCol(
                            header,
                            "tax_year",
                            "taxyear",
                            "tax_yr",
                            "taxyr",
                        );
                        const iTaxpayerName = findCol(
                            header,
                            "taxpayer_name",
                            "taxpayername",
                        );
                        const iUrl = findCol(
                            header,
                            "url",
                            "return_url",
                            "xml_url",
                            "file_url",
                            "filelocation",
                            "file_location",
                            "file_loc",
                            "download_url",
                            "downloadurl",
                            "zip_url",
                            "zipurl",
                            "shard/url",
                            "shard_url",
                            "shardurl",
                            "xmlurl",
                            "fileurl",
                        );

                        if (iEin === -1 || iObjectId === -1) {
                            throw new Error(
                                `Index CSV missing required columns for object lookup (EIN/OBJECT_ID). Header: ${
                                    header.join(", ")
                                }`,
                            );
                        }

                        col2 = {
                            iEin,
                            iType,
                            iTaxPeriod,
                            iObjectId,
                            iShard,
                            iReturnId,
                            iFilingType,
                            iTaxYear,
                            iTaxpayerName,
                            iUrl,
                        };
                        continue;
                    }

                    const cols = parseCsvLine(line);
                    const oid = String(cols[col2.iObjectId] || "").trim();
                    if (oid !== String(objectIdArg)) continue;

                    found = inferIndexRow({ cols, colIndex: col2 });
                    break;
                }

                if (!found) {
                    throw new Error(
                        `Direct XML not found and object_id not found in index_${yearArg}.csv: ${objectIdArg}`,
                    );
                }

                if (!found.shard) {
                    throw new Error(
                        `Direct XML not found and index row had no shard/url info for object_id=${objectIdArg}`,
                    );
                }

                const shardName = normalizeShard(found.shard);
                const zipUrl = shardUrl(yearArg, shardName);
                const zipPath = getTeosShardZipPath(yearArg, shardName);
                console.log(`Falling back to shard extraction: ${zipUrl}`);
                await downloadZipWithRetry(zipUrl, zipPath, 3);

                unzipExtractSingle(zipPath, member, xmlOut);
            }
        }

        const parsed = await parseXmlToReturn(xmlOut, {
            ein: "000000000",
            object_id: String(objectIdArg),
            tax_year: Number.isFinite(yearArg) ? yearArg : null,
            tax_period_begin_dt: null,
            tax_period_end_dt: null,
            return_type: null,
            organization_name: null,
            source: { year: yearArg },
        });

        console.log(JSON.stringify(parsed, null, 2));
        if (upsert) {
            const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
            const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
            const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
                auth: { persistSession: false },
            });
            await upsertReturns(supabaseAdmin, [parsed]);
            console.log("Upserted 1 return into irs.returns");
        }
        return;
    }

    // Single-return-by-shard mode (download one shard zip, extract one object)
    if (yearArg && shardArg && objectIdArg) {
        if (!download) {
            throw new Error(
                "For --year/--shard/--objectId mode, pass --download to fetch the shard zip.",
            );
        }

        const normalizedShardArg = normalizeShard(shardArg);
        const url = shardUrl(yearArg, normalizedShardArg);
        const zipPath = getTeosShardZipPath(yearArg, normalizedShardArg);
        console.log(`Downloading shard: ${url}`);
        await downloadZipWithRetry(url, zipPath, 3);

        const member = `${objectIdArg}_public.xml`;
        const xmlOut = buildXmlCachePath({
            cacheDir,
            objectId: objectIdArg,
        });
        if (forceDownload || !isValidCachedFile(xmlOut)) {
            unzipExtractSingle(zipPath, member, xmlOut);
        }

        const parsed = await parseXmlToReturn(xmlOut, {
            ein: "000000000",
            object_id: String(objectIdArg),
            tax_year: Number.isFinite(yearArg) ? yearArg : null,
            tax_period_begin_dt: null,
            tax_period_end_dt: null,
            return_type: null,
            organization_name: null,
            source: { year: yearArg, shard: normalizedShardArg },
        });

        console.log(JSON.stringify(parsed, null, 2));
        if (upsert) {
            const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
            const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
            const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
                auth: { persistSession: false },
            });
            await upsertReturns(supabaseAdmin, [parsed]);
            console.log("Upserted 1 return into irs.returns");
        }

        return;
    }

    if (einSet && einSet.size) {
        if (districtEntityId) {
            console.warn(
                "WARN: --ein provided; ignoring --district filter in EIN mode.",
            );
        }
        if (!download) {
            throw new Error(
                "For --ein mode, pass --download to fetch yearly index files.",
            );
        }

        const hasYearArgs = Boolean(
            args.year || args.years || args.from || args.to,
        );
        const years = hasYearArgs
            ? parseYearsFromArgs(args)
            : await listLocalCacheYears();

        if (!years.length) {
            throw new Error(
                "For --ein mode, provide --year/--years/--from/--to (or ensure local cache has year folders).",
            );
        }

        if (!hasYearArgs) {
            console.log(
                `No year args provided; using local cache years: ${
                    years.join(
                        ", ",
                    )
                }`,
            );
        }

        const yearOrder = latestOnly ? [...years].sort((a, b) => b - a) : years;
        console.log(
            `Years to import (EIN filter): ${yearOrder.join(", ")}${
                latestOnly ? " [latestOnly order]" : ""
            }`,
        );
        const latestOnlySeenEins = latestOnly ? new Set<string>() : null;
        const failedYears: Array<{ year: number; error: string }> = [];
        for (const year of yearOrder) {
            console.log(`\n=== Import year ${year} (EIN filter) ===`);
            try {
                const res = await processYear({
                    year,
                    districtEntityId: null,
                    statuses,
                    download,
                    upsert,
                    debug,
                    debugRow,
                    batchSize,
                    maxObjects,
                    scopedEinOverride: einSet,
                    latestOnly,
                    latestOnlyExcludeEins: latestOnlySeenEins,
                    cacheDir,
                    forceDownload,
                });
                if (latestOnlySeenEins) {
                    for (const ein of res.selectedEins) latestOnlySeenEins.add(ein);
                    console.log(
                        `latestOnly coverage: ${latestOnlySeenEins.size.toLocaleString()}/${einSet.size.toLocaleString()} EINs`,
                    );
                    if (latestOnlySeenEins.size >= einSet.size) {
                        console.log(
                            "latestOnly satisfied all requested EINs; stopping older years.",
                        );
                        break;
                    }
                }
            } catch (e) {
                const msg = compactErr(e, 600);
                console.warn(`WARN: failed to process year ${year}: ${msg}`);
                failedYears.push({ year, error: msg });
            }
        }
        if (failedYears.length) {
            const summary = failedYears
                .map((f) => `${f.year}: ${f.error}`)
                .join(" | ");
            throw new Error(
                `Failed to process ${failedYears.length} year(s): ${summary}`,
            );
        }
        return;
    }

    const years = parseYearsFromArgs(args);
    const yearOrder = latestOnly ? [...years].sort((a, b) => b - a) : years;
    console.log(
        `Years to import: ${yearOrder.join(", ")}${
            latestOnly ? " [latestOnly order]" : ""
        }`,
    );
    const latestOnlySeenEins = latestOnly ? new Set<string>() : null;
    const failedYears: Array<{ year: number; error: string }> = [];

    for (const year of yearOrder) {
        console.log(`\n=== Import year ${year} ===`);
        try {
            const res = await processYear({
                year,
                districtEntityId,
                statuses,
                download,
                upsert,
                debug,
                debugRow,
                batchSize,
                maxObjects,
                latestOnly,
                latestOnlyExcludeEins: latestOnlySeenEins,
                cacheDir,
                forceDownload,
            });
            if (latestOnlySeenEins) {
                for (const ein of res.selectedEins) latestOnlySeenEins.add(ein);
                console.log(
                    `latestOnly coverage so far: ${latestOnlySeenEins.size.toLocaleString()} EINs`,
                );
            }
        } catch (e) {
            const msg = compactErr(e, 600);
            console.warn(`WARN: failed to process year ${year}: ${msg}`);
            failedYears.push({ year, error: msg });
        }
    }

    if (failedYears.length) {
        const summary = failedYears.map((f) => `${f.year}: ${f.error}`).join(
            " | ",
        );
        throw new Error(
            `Failed to process ${failedYears.length} year(s): ${summary}`,
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
