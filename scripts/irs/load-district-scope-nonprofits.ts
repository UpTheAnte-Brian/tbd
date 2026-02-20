/*
  Load superintendent scope nonprofit candidates directly from EO BMF CSV.

  Purpose
  - This script does NOT read irs.organizations.
  - It scans EO BMF (eo_<state>.csv), name-matches organizations to district-friendly
    district names, and upserts candidates into public.superintendent_scope_nonprofits.

  Usage
    # Dry run
    pnpm tsx scripts/irs/load-district-scope-nonprofits.ts --stateCode mn --dry --districtLimit 10

    # Insert candidates
    pnpm tsx scripts/irs/load-district-scope-nonprofits.ts --stateCode mn --batchSize 1000
*/

import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { createClient } from "@supabase/supabase-js";

type DistrictRow = {
    id: string;
    name: string;
};

type DistrictVariant = {
    districtId: string;
    districtName: string;
    variant: string;
    variantNorm: string;
    rareToken: string;
};

type BestMatch = {
    district_entity_id: string;
    district_name: string;
    ein: string;
    legal_name: string;
    city: string | null;
    state: string | null;
    matched_variant: string;
    matched_variant_norm: string;
    score: number;
};

type ScopeUpsertRow = {
    district_entity_id: string;
    ein: string;
    status: "candidate";
    label: string | null;
    source_system?: "eobmf_name_match";
    source_ref?: string;
};

const STOPWORDS = new Set([
    "A",
    "AN",
    "AND",
    "ASSOCIATION",
    "BOARD",
    "CO",
    "COMMITTEE",
    "CORP",
    "CORPORATION",
    "COUNCIL",
    "COUNTY",
    "DISTRICT",
    "ED",
    "EDUCATION",
    "FOR",
    "FOUNDATION",
    "INC",
    "INCORPORATED",
    "INDEPENDENT",
    "ISD",
    "OF",
    "ORG",
    "ORGANIZATION",
    "PUBLIC",
    "SCH",
    "SCHOOL",
    "SCHOOLS",
    "THE",
    "USD",
]);

function mustGetEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
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

function parseBool(input: string | boolean | undefined, defaultValue: boolean): boolean {
    if (input === undefined) return defaultValue;
    if (typeof input === "boolean") return input;
    const t = String(input).trim().toLowerCase();
    if (["0", "false", "no", "n", "off"].includes(t)) return false;
    if (["1", "true", "yes", "y", "on"].includes(t)) return true;
    return defaultValue;
}

function uniq<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

function normalizeNameBase(name: string): string {
    return String(name || "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeForMatch(input: string | null | undefined): string {
    return String(input || "")
        .toUpperCase()
        .replace(/&/g, " AND ")
        .replace(/[^A-Z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenizeNormalized(input: string): string[] {
    return input
        .split(" ")
        .map((t) => t.trim())
        .filter(Boolean);
}

function normalizeEin(input: string | null | undefined): string | null {
    const digits = String(input || "").replace(/\D+/g, "");
    return digits.length === 9 ? digits : null;
}

function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
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

function buildDistrictNameVariants(districtName: string): string[] {
    const base = normalizeNameBase(districtName);
    if (!base) return [];

    const variants: string[] = [];
    variants.push(base);

    const cleaned = base
        .replace(/\b(public|school|schools)\b/gi, " ")
        .replace(/\b(independent)\b/gi, " ")
        .replace(/\b(school\s*district|isd|district)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (cleaned && cleaned.length >= 3) variants.push(cleaned);

    const n = base.match(/\b(\d{2,4})\b/)?.[1] ?? null;
    if (n) {
        variants.push(`ISD ${n}`);
        variants.push(`Independent School District ${n}`);
        variants.push(`School District ${n}`);
        variants.push(`District ${n}`);
        variants.push(`${n}`);
    }

    const firstWord = base.split(" ").filter(Boolean)[0];
    if (firstWord && firstWord.length >= 4) {
        variants.push(firstWord);
    }

    return uniq(variants)
        .map((v) => normalizeNameBase(v))
        .filter((v) => v.length >= 3);
}

function pickRareToken(variantNorm: string): string | null {
    const tokens = tokenizeNormalized(variantNorm).filter((t) => t.length >= 2);
    if (!tokens.length) return null;

    const preferred = tokens.filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    const list = preferred.length ? preferred : tokens;

    let best = list[0];
    for (let i = 1; i < list.length; i++) {
        const t = list[i];
        if (t.length > best.length) {
            best = t;
        }
    }

    return best || null;
}

function scoreVariantMatch(orgNorm: string, variantNorm: string): number {
    if (!orgNorm || !variantNorm) return 0;

    const orgPad = ` ${orgNorm} `;
    const variantPad = ` ${variantNorm} `;

    if (orgPad.includes(variantPad)) return 1.0;
    if (orgNorm.includes(variantNorm)) return 0.8;
    return 0;
}

function toHeaderIndex(headers: string[]): Record<string, number> {
    const out: Record<string, number> = {};
    headers.forEach((h, i) => {
        const key = String(h ?? "")
            .replace(/^\uFEFF/, "")
            .trim()
            .toUpperCase();
        if (key) out[key] = i;
    });
    return out;
}

function pick(cols: string[], idx: number | undefined): string | null {
    if (idx == null || idx < 0 || idx >= cols.length) return null;
    const t = String(cols[idx] ?? "").trim();
    return t.length ? t : null;
}

async function downloadCsv(params: {
    url: string;
    stateCode: string;
}): Promise<{ filePath: string; tempDir: string }> {
    const { url, stateCode } = params;

    const tempDir = path.join(os.tmpdir(), `eobmf-${stateCode}-${Date.now()}`);
    await fsp.mkdir(tempDir, { recursive: true });

    const outPath = path.join(tempDir, `eo_${stateCode}.csv`);

    const res = await fetch(url);
    if (!res.ok || !res.body) {
        throw new Error(`Failed to download EO BMF (${res.status}) from ${url}`);
    }

    await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(outPath));
    return { filePath: outPath, tempDir };
}

async function loadDistricts(params: {
    supabaseAdmin: any;
    districtId?: string | null;
    districtLimit?: number;
}): Promise<DistrictRow[]> {
    const { supabaseAdmin, districtId, districtLimit } = params;

    let q = supabaseAdmin
        .schema("public")
        .from("entities")
        .select("id,name")
        .eq("entity_type", "district")
        .order("name", { ascending: true });

    if (districtId) q = q.eq("id", districtId);
    if (districtLimit != null) q = q.limit(districtLimit);

    const { data, error } = await q;
    if (error) {
        throw new Error(`Failed to load districts: ${error.message}`);
    }

    return (data || []) as DistrictRow[];
}

function buildVariantIndex(districts: DistrictRow[]): {
    variants: DistrictVariant[];
    tokenIndex: Map<string, DistrictVariant[]>;
} {
    const variants: DistrictVariant[] = [];
    const tokenIndex = new Map<string, DistrictVariant[]>();

    for (const d of districts) {
        const rawVariants = buildDistrictNameVariants(d.name);

        for (const variant of rawVariants) {
            const variantNorm = normalizeForMatch(variant);
            if (!variantNorm) continue;

            const rareToken = pickRareToken(variantNorm);
            if (!rareToken) continue;

            const record: DistrictVariant = {
                districtId: d.id,
                districtName: d.name,
                variant,
                variantNorm,
                rareToken,
            };

            variants.push(record);

            const cur = tokenIndex.get(rareToken) || [];
            cur.push(record);
            tokenIndex.set(rareToken, cur);
        }
    }

    return { variants, tokenIndex };
}

async function scanEobmfCsv(params: {
    filePath: string;
    minScore: number;
    tokenIndex: Map<string, DistrictVariant[]>;
}): Promise<{
    bestByDistrict: Map<string, Map<string, BestMatch>>;
    totalLines: number;
    matchedRows: number;
}> {
    const { filePath, minScore, tokenIndex } = params;

    const bestByDistrict = new Map<string, Map<string, BestMatch>>();

    const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: "utf8" }),
        crlfDelay: Infinity,
    });

    let totalLines = 0;
    let matchedRows = 0;
    let headerIdx: Record<string, number> | null = null;

    for await (const lineRaw of rl) {
        const line = String(lineRaw ?? "").trimEnd();
        if (!line) continue;

        if (!headerIdx) {
            headerIdx = toHeaderIndex(parseCsvLine(line));
            if (headerIdx["EIN"] == null || headerIdx["NAME"] == null) {
                throw new Error(
                    "EO BMF header missing required columns EIN/NAME",
                );
            }
            continue;
        }

        totalLines++;
        const cols = parseCsvLine(line);

        const ein = normalizeEin(pick(cols, headerIdx["EIN"]));
        if (!ein) continue;

        const legalName = pick(cols, headerIdx["NAME"]);
        if (!legalName) continue;

        const orgNorm = normalizeForMatch(legalName);
        if (!orgNorm) continue;

        const city = pick(cols, headerIdx["CITY"]);
        const stateRaw = pick(cols, headerIdx["STATE"]);
        const state = stateRaw ? stateRaw.toUpperCase() : null;

        const orgTokens = uniq(tokenizeNormalized(orgNorm));
        const candidateVariantsByKey = new Map<string, DistrictVariant>();

        for (const token of orgTokens) {
            const variants = tokenIndex.get(token);
            if (!variants || !variants.length) continue;

            for (const variant of variants) {
                const key = `${variant.districtId}\u0000${variant.variantNorm}`;
                if (!candidateVariantsByKey.has(key)) {
                    candidateVariantsByKey.set(key, variant);
                }
            }
        }

        if (!candidateVariantsByKey.size) continue;

        let rowMatched = false;

        for (const variant of candidateVariantsByKey.values()) {
            const score = scoreVariantMatch(orgNorm, variant.variantNorm);
            if (score < minScore) continue;

            rowMatched = true;

            let districtMap = bestByDistrict.get(variant.districtId);
            if (!districtMap) {
                districtMap = new Map<string, BestMatch>();
                bestByDistrict.set(variant.districtId, districtMap);
            }

            const current = districtMap.get(ein);
            if (
                !current ||
                score > current.score ||
                (score === current.score &&
                    variant.variantNorm.length > current.matched_variant_norm.length)
            ) {
                districtMap.set(ein, {
                    district_entity_id: variant.districtId,
                    district_name: variant.districtName,
                    ein,
                    legal_name: legalName,
                    city,
                    state,
                    matched_variant: variant.variant,
                    matched_variant_norm: variant.variantNorm,
                    score,
                });
            }
        }

        if (rowMatched) matchedRows++;

        if (totalLines % 25000 === 0) {
            process.stdout.write(
                `\rScanned ${totalLines.toLocaleString()} EO BMF rows; matched rows ${matchedRows.toLocaleString()}...   `,
            );
        }
    }

    process.stdout.write("\n");
    return { bestByDistrict, totalLines, matchedRows };
}

async function upsertScopeRowsInBatches(params: {
    supabaseAdmin: any;
    rows: ScopeUpsertRow[];
    batchSize: number;
}) {
    const { supabaseAdmin, rows, batchSize } = params;
    if (!rows.length) return;

    let includeProvenanceColumns = true;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        let payload: Array<Record<string, unknown>> = batch.map((r) => ({ ...r }));

        if (!includeProvenanceColumns) {
            payload = payload.map((r) => {
                const { source_system: _sourceSystem, source_ref: _sourceRef, ...rest } =
                    r;
                return rest;
            });
        }

        const { error } = await supabaseAdmin
            .schema("public")
            .from("superintendent_scope_nonprofits")
            .upsert(payload, { onConflict: "district_entity_id,ein" });

        if (
            error &&
            includeProvenanceColumns &&
            /(source_ref|source_system)/i.test(error.message || "")
        ) {
            includeProvenanceColumns = false;
            console.warn(
                "Warn: superintendent_scope_nonprofits is missing source provenance columns; retrying upsert without source_system/source_ref.",
            );

            const fallbackPayload = payload.map((r) => {
                const { source_system: _sourceSystem, source_ref: _sourceRef, ...rest } =
                    r;
                return rest;
            });

            const { error: fallbackError } = await supabaseAdmin
                .schema("public")
                .from("superintendent_scope_nonprofits")
                .upsert(fallbackPayload, { onConflict: "district_entity_id,ein" });

            if (fallbackError) {
                throw new Error(
                    `Upsert failed at batch starting ${i}: ${fallbackError.message}`,
                );
            }

            continue;
        }

        if (error) {
            throw new Error(`Upsert failed at batch starting ${i}: ${error.message}`);
        }
    }
}

async function main() {
    const args = parseArgs(process.argv);

    const stateCode = String(args.stateCode || "mn").trim().toLowerCase();
    const districtId = args.district ? String(args.district) : null;
    const districtLimit = args.districtLimit ? Number(args.districtLimit) : undefined;
    const minScore = args.minScore ? Number(args.minScore) : 0.8;
    const maxPerDistrict = args.maxPerDistrict ? Number(args.maxPerDistrict) : 150;
    const batchSize = args.batchSize ? Number(args.batchSize) : 1000;
    const dry = parseBool(args.dry, false);
    const fileArg = args.file ? path.resolve(String(args.file)) : null;
    const download = parseBool(args.download, true);

    if (!/^[a-z]{2}$/.test(stateCode)) {
        throw new Error(`Invalid --stateCode: ${stateCode}`);
    }
    if (
        districtLimit !== undefined &&
        (!Number.isFinite(districtLimit) || districtLimit <= 0)
    ) {
        throw new Error(`Invalid --districtLimit: ${args.districtLimit}`);
    }
    if (!Number.isFinite(minScore) || minScore < 0 || minScore > 1) {
        throw new Error(`Invalid --minScore: ${args.minScore}`);
    }
    if (!Number.isFinite(maxPerDistrict) || maxPerDistrict <= 0) {
        throw new Error(`Invalid --maxPerDistrict: ${args.maxPerDistrict}`);
    }
    if (!Number.isFinite(batchSize) || batchSize <= 0) {
        throw new Error(`Invalid --batchSize: ${args.batchSize}`);
    }

    const sourceUrl = `https://www.irs.gov/pub/irs-soi/eo_${stateCode}.csv`;
    let csvPath: string | null = null;
    let tempDir: string | null = null;

    if (fileArg) {
        if (!fs.existsSync(fileArg)) {
            throw new Error(`EO BMF file not found: ${fileArg}`);
        }
        csvPath = fileArg;
    } else if (download) {
        const dl = await downloadCsv({ url: sourceUrl, stateCode });
        csvPath = dl.filePath;
        tempDir = dl.tempDir;
    } else {
        throw new Error("Provide --file <path> or keep --download enabled.");
    }

    const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    });

    const districts = await loadDistricts({
        supabaseAdmin,
        districtId,
        districtLimit,
    });

    if (!districts.length) {
        console.log("No districts found for provided filters.");
        return;
    }

    const { tokenIndex } = buildVariantIndex(districts);

    console.log(
        `Districts loaded=${districts.length.toLocaleString()} token_index_keys=${tokenIndex.size.toLocaleString()} stateCode=${stateCode}`,
    );
    console.log(`Scanning EO BMF file: ${csvPath}`);

    const scanResult = await scanEobmfCsv({
        filePath: csvPath,
        minScore,
        tokenIndex,
    });

    const runStartedAt = new Date().toISOString();
    const dataset = `eo_${stateCode}.csv`;

    let totalCandidates = 0;
    const allRows: ScopeUpsertRow[] = [];

    for (const d of districts) {
        const districtMap = scanResult.bestByDistrict.get(d.id);
        const sorted = districtMap
            ? Array.from(districtMap.values())
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.legal_name.localeCompare(b.legal_name);
                })
                .slice(0, maxPerDistrict)
            : [];

        totalCandidates += sorted.length;

        console.log(
            `${d.name} (${d.id}) candidates=${sorted.length.toLocaleString()}`,
        );

        if (dry) continue;

        for (const hit of sorted) {
            allRows.push({
                district_entity_id: hit.district_entity_id,
                ein: hit.ein,
                status: "candidate",
                label: hit.legal_name || null,
                source_system: "eobmf_name_match",
                source_ref: JSON.stringify({
                    run_started_at: runStartedAt,
                    dataset,
                    matched_variant: hit.matched_variant,
                    score: hit.score,
                    org_city: hit.city,
                    org_state: hit.state,
                    source_url: sourceUrl,
                }),
            });
        }
    }

    if (!dry && allRows.length) {
        await upsertScopeRowsInBatches({
            supabaseAdmin,
            rows: allRows,
            batchSize,
        });
    }

    console.log("---");
    console.log(
        `Done. dry=${dry} scanned_rows=${scanResult.totalLines.toLocaleString()} matched_rows=${scanResult.matchedRows.toLocaleString()}`,
    );
    console.log(`Total candidates selected=${totalCandidates.toLocaleString()}`);
    if (!dry) {
        console.log(`Total upserted=${allRows.length.toLocaleString()}`);
    }

    if (tempDir) {
        try {
            await fsp.rm(tempDir, { recursive: true, force: true });
        } catch {
            // no-op
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
