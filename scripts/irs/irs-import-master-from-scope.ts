/**
 * IRS Import Master (scope-driven)
 *
 * Reads EINs from public.superintendent_scope_nonprofits and runs
 * the single-EIN master pipeline with bounded concurrency.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { normalizeEinInput } from "./lib/ein";

type Args = {
    from?: string;
    to?: string;
    status?: string;
    district?: string;
    limit?: string;
    maxObjects?: string;
    concurrency?: string;
    latestOnly?: boolean;
    cacheDir?: string;
    forceDownload?: boolean;
    download?: boolean;
    upsert?: boolean;
    skip990n?: boolean;
    skip990?: boolean;
    skipParse?: boolean;
    dryRun?: boolean;
    logDir?: string;
};

type EinRunResult = {
    ein: string;
    ok: boolean;
    code: number | null;
    logFile: string;
    error?: string;
    elapsedMs: number;
};

function parseArgs(argv: string[]): Args {
    const args: Args = {};
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;
        const key = token.slice(2);

        if (
            key === "download" ||
            key === "upsert" ||
            key === "latestOnly" ||
            key === "forceDownload" ||
            key === "skip990n" ||
            key === "skip990" ||
            key === "skipParse" ||
            key === "dryRun"
        ) {
            (args as Record<string, boolean>)[key] = true;
            continue;
        }

        if (key === "noDownload") {
            args.download = false;
            continue;
        }
        if (key === "noUpsert") {
            args.upsert = false;
            continue;
        }

        const value = argv[i + 1];
        if (!value || value.startsWith("--")) {
            throw new Error(`Missing value for --${key}`);
        }
        i++;

        if (key === "from") args.from = value;
        else if (key === "to") args.to = value;
        else if (key === "status") args.status = value;
        else if (key === "district") args.district = value;
        else if (key === "limit") args.limit = value;
        else if (key === "maxObjects") args.maxObjects = value;
        else if (key === "concurrency") args.concurrency = value;
        else if (key === "cacheDir") args.cacheDir = value;
        else if (key === "logDir") args.logDir = value;
        else throw new Error(`Unknown arg: --${key}`);
    }
    return args;
}

function mustGetEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing env var: ${name}`);
    return value;
}

function parseCommaList(input: string | null | undefined): string[] {
    if (!input) return [];
    return String(input)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

async function loadScopedEins(params: {
    statuses: string[];
    districtEntityId: string | null;
}): Promise<string[]> {
    const { statuses, districtEntityId } = params;

    const supabaseAdmin = createClient(
        mustGetEnv("NEXT_PUBLIC_SUPABASE_URL"),
        mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"),
        { auth: { persistSession: false } },
    );

    const pageSize = 1000;
    const set = new Set<string>();
    let from = 0;

    while (true) {
        let q = supabaseAdmin
            .schema("public")
            .from("superintendent_scope_nonprofits")
            .select("ein")
            .order("ein", { ascending: true })
            .range(from, from + pageSize - 1);

        if (statuses.length) q = q.in("status", statuses);
        if (districtEntityId) q = q.eq("district_entity_id", districtEntityId);

        const { data, error } = await q;
        if (error) {
            throw new Error(`Failed to load scoped EINs: ${error.message}`);
        }

        const rows = (data ?? []) as Array<{ ein: string | null }>;
        for (const row of rows) {
            const normalized = normalizeEinInput(row.ein ?? "");
            if (normalized) set.add(normalized);
        }

        if (rows.length < pageSize) break;
        from += pageSize;
    }

    return Array.from(set).sort();
}

function runChildWithLogFile(params: {
    cmd: string;
    cmdArgs: string[];
    logFile: string;
}): Promise<number> {
    const { cmd, cmdArgs, logFile } = params;
    fs.mkdirSync(path.dirname(logFile), { recursive: true });

    return new Promise((resolve, reject) => {
        const out = fs.createWriteStream(logFile, { flags: "a" });
        out.write(`[cmd] ${cmd} ${cmdArgs.join(" ")}\n`);

        const child = spawn(cmd, cmdArgs, {
            env: process.env,
            stdio: ["ignore", "pipe", "pipe"],
        });

        child.stdout?.on("data", (chunk) => out.write(chunk));
        child.stderr?.on("data", (chunk) => out.write(chunk));

        child.on("error", (err) => {
            try {
                out.write(
                    `\n[spawn_error] ${String((err as any)?.message ?? err)}\n`,
                );
            } catch {
                // ignore
            }
            out.end();
            reject(err);
        });

        child.on("close", (code) => {
            out.write(`\n[exit] ${code ?? 0}\n`);
            out.end();
            resolve(code ?? 0);
        });
    });
}

async function runSingleCommandWithLog(params: {
    cmd: string;
    cmdArgs: string[];
    logFile: string;
    dryRun?: boolean;
}): Promise<{ ok: boolean; code: number | null; error?: string }> {
    const { cmd, cmdArgs, logFile, dryRun } = params;
    fs.mkdirSync(path.dirname(logFile), { recursive: true });

    if (dryRun) {
        fs.writeFileSync(
            logFile,
            `[dryRun]\n[cmd] ${cmd} ${cmdArgs.join(" ")}\n`,
            { encoding: "utf8" },
        );
        return { ok: true, code: 0 };
    }

    try {
        const code = await runChildWithLogFile({ cmd, cmdArgs, logFile });
        return { ok: code === 0, code };
    } catch (e) {
        const msg = e && typeof e === "object" && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
        return { ok: false, code: null, error: msg };
    }
}

async function runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<void>,
) {
    if (!items.length) return;
    const size = Math.max(1, Math.min(concurrency, items.length));
    let cursor = 0;

    async function runWorker() {
        while (true) {
            const index = cursor;
            cursor += 1;
            if (index >= items.length) break;
            await worker(items[index], index);
        }
    }

    await Promise.all(Array.from({ length: size }, () => runWorker()));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const from = args.from ?? "2022";
    const to = args.to ?? String(new Date().getFullYear());
    const statuses = parseCommaList(args.status ?? "candidate,active");
    const districtEntityId = args.district ? String(args.district) : null;
    const concurrencyRaw = args.concurrency ? Number(args.concurrency) : 2;
    const concurrency = Number.isFinite(concurrencyRaw) && concurrencyRaw > 0
        ? Math.floor(concurrencyRaw)
        : 2;
    const download = args.download ?? true;
    const upsert = args.upsert ?? true;
    const dryRun = Boolean(args.dryRun);

    const limitRaw = args.limit ? Number(args.limit) : null;
    const limit =
        Number.isFinite(limitRaw as number) && (limitRaw as number) > 0
            ? Math.floor(limitRaw as number)
            : null;

    const maxObjectsRaw = args.maxObjects ? Number(args.maxObjects) : null;
    const maxObjects =
        Number.isFinite(maxObjectsRaw as number) &&
            (maxObjectsRaw as number) > 0
            ? Math.floor(maxObjectsRaw as number)
            : null;

    const baseLogDir = path.resolve(
        args.logDir ?? path.join("data", "irs-logs", "from-scope"),
    );
    const runTs = new Date().toISOString().replace(/[:.]/g, "-");
    const runDir = path.join(baseLogDir, runTs);
    fs.mkdirSync(runDir, { recursive: true });

    console.log(
        `Loading EINs from superintendent_scope_nonprofits statuses=${
            statuses.join(",") || "<any>"
        }${districtEntityId ? ` district=${districtEntityId}` : ""}`,
    );
    const loadedEins = await loadScopedEins({
        statuses,
        districtEntityId,
    });

    const eins = limit ? loadedEins.slice(0, limit) : loadedEins;
    const einsFile = path.join(runDir, "eins.txt");
    fs.writeFileSync(einsFile, `${eins.join("\n")}\n`, "utf8");
    console.log(
        `Scoped EINs loaded=${loadedEins.length.toLocaleString()} queued=${eins.length.toLocaleString()} concurrency=${concurrency}`,
    );
    console.log(`EIN list file: ${einsFile}`);
    if (dryRun && eins.length <= 50) {
        console.log(`Dry run EIN list: ${eins.join(", ")}`);
    }

    const startedAt = Date.now();
    const results: EinRunResult[] = new Array(eins.length);

    let bulk990Result:
        | { ok: boolean; code: number | null; error?: string; logFile: string }
        | null = null;

    if (!args.skip990) {
        const bulkLogFile = path.join(runDir, "bulk-990.log");
        const bulkArgs = [
            "tsx",
            "scripts/irs/import-990-bulk.ts",
            "--from",
            from,
            "--to",
            to,
            "--einsFile",
            einsFile,
        ];

        if (maxObjects) bulkArgs.push("--maxObjects", String(maxObjects));
        if (args.latestOnly) bulkArgs.push("--latestOnly");
        if (args.forceDownload) bulkArgs.push("--forceDownload");
        if (args.cacheDir) bulkArgs.push("--cacheDir", args.cacheDir);
        if (download) bulkArgs.push("--download");
        if (upsert) bulkArgs.push("--upsert");

        console.log(
            `Running shared bulk 990 import once for ${eins.length.toLocaleString()} EINs...`,
        );
        const bulkRun = await runSingleCommandWithLog({
            cmd: "pnpm",
            cmdArgs: bulkArgs,
            logFile: bulkLogFile,
            dryRun,
        });
        bulk990Result = { ...bulkRun, logFile: bulkLogFile };

        if (!bulkRun.ok) {
            console.error(
                `Shared bulk 990 import failed (code=${bulkRun.code ?? "error"}). Log: ${bulkLogFile}`,
            );
            throw new Error(
                bulkRun.error ||
                    `Shared bulk 990 import failed (code=${bulkRun.code ?? "unknown"})`,
            );
        }
        console.log(`Shared bulk 990 import complete. Log: ${bulkLogFile}`);
    } else {
        console.log("Skipping shared bulk 990 stage due to --skip990");
    }

    const needsPerEinStages = !args.skip990n || !args.skipParse;
    if (!needsPerEinStages) {
        const elapsedMs = Date.now() - startedAt;
        const summary = {
            runTs,
            startedAt: new Date(startedAt).toISOString(),
            endedAt: new Date().toISOString(),
            elapsedSeconds: Math.round(elapsedMs / 1000),
            params: {
                from,
                to,
                statuses,
                districtEntityId,
                limit,
                maxObjects,
                concurrency,
                latestOnly: Boolean(args.latestOnly),
                forceDownload: Boolean(args.forceDownload),
                cacheDir: args.cacheDir ?? null,
                download,
                upsert,
                skip990n: Boolean(args.skip990n),
                skip990: Boolean(args.skip990),
                skipParse: Boolean(args.skipParse),
                dryRun,
                logDir: runDir,
                einsFile,
            },
            counts: {
                loaded: loadedEins.length,
                queued: eins.length,
                succeeded: eins.length,
                failed: 0,
            },
            bulk990: bulk990Result,
            failures: [],
        };

        const summaryPath = path.join(runDir, "summary.json");
        fs.writeFileSync(
            summaryPath,
            JSON.stringify(summary, null, 2) + "\n",
            "utf8",
        );
        console.log(
            `\nRun complete. total=${eins.length.toLocaleString()} succeeded=${eins.length.toLocaleString()} failed=0 elapsed=${
                Math.round(elapsedMs / 1000)
            }s`,
        );
        console.log(`Summary: ${summaryPath}`);
        return;
    }

    await runWithConcurrency(eins, concurrency, async (ein, index) => {
        const position = index + 1;
        const logFile = path.join(runDir, `${ein}.log`);
        const cmdArgs = [
            "tsx",
            "scripts/irs/irs-import-master-ein.ts",
            "--ein",
            ein,
            "--from",
            from,
            "--to",
            to,
            "--logFile",
            logFile,
        ];

        if (maxObjects) {
            cmdArgs.push("--maxObjects", String(maxObjects));
        }
        // 990 bulk has already run once across all EINs in this runner.
        cmdArgs.push("--skip990");
        if (args.latestOnly) cmdArgs.push("--latestOnly");
        if (args.forceDownload) cmdArgs.push("--forceDownload");
        if (args.cacheDir) cmdArgs.push("--cacheDir", args.cacheDir);
        if (download) cmdArgs.push("--download");
        if (upsert) cmdArgs.push("--upsert");
        if (args.skip990n) cmdArgs.push("--skip990n");
        if (args.skipParse) cmdArgs.push("--skipParse");
        if (dryRun) cmdArgs.push("--dryRun");

        console.log(`[${position}/${eins.length}] EIN ${ein} starting...`);
        const startedEin = Date.now();

        if (dryRun) {
            fs.mkdirSync(path.dirname(logFile), { recursive: true });
            fs.writeFileSync(
                logFile,
                `[dryRun]\n[cmd] pnpm ${cmdArgs.join(" ")}\n`,
                { encoding: "utf8" },
            );
            results[index] = {
                ein,
                ok: true,
                code: 0,
                logFile,
                elapsedMs: Date.now() - startedEin,
            };
            console.log(
                `[dryRun ${position}/${eins.length}] EIN ${ein} skipped (no spawn)`,
            );
            return;
        }

        try {
            const code = await runChildWithLogFile({
                cmd: "pnpm",
                cmdArgs,
                logFile,
            });

            const ok = code === 0;
            results[index] = {
                ein,
                ok,
                code,
                logFile,
                elapsedMs: Date.now() - startedEin,
            };

            if (ok) {
                console.log(`[${position}/${eins.length}] EIN ${ein} done`);
            } else {
                console.error(
                    `[${position}/${eins.length}] EIN ${ein} failed (exit ${code})`,
                );
            }
        } catch (e) {
            const msg = e && typeof e === "object" && "message" in e
                ? String((e as { message: unknown }).message)
                : String(e);
            results[index] = {
                ein,
                ok: false,
                code: null,
                logFile,
                error: msg,
                elapsedMs: Date.now() - startedEin,
            };
            console.error(
                `[${position}/${eins.length}] EIN ${ein} failed: ${msg}`,
            );
        }
    });

    const elapsedMs = Date.now() - startedAt;
    const succeeded = results.filter((r) => r && r.ok).length;
    const failed = results.length - succeeded;
    const failures = results.filter((r) => r && !r.ok);

    const summary = {
        runTs,
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        elapsedSeconds: Math.round(elapsedMs / 1000),
        params: {
            from,
            to,
            statuses,
            districtEntityId,
            limit,
            maxObjects,
            concurrency,
            latestOnly: Boolean(args.latestOnly),
            forceDownload: Boolean(args.forceDownload),
            cacheDir: args.cacheDir ?? null,
            download,
            upsert,
            skip990n: Boolean(args.skip990n),
            skip990: Boolean(args.skip990),
            skipParse: Boolean(args.skipParse),
            dryRun,
            logDir: runDir,
            einsFile,
        },
        counts: {
            loaded: loadedEins.length,
            queued: eins.length,
            succeeded,
            failed,
        },
        bulk990: bulk990Result,
        failures: failures.map((r) => ({
            ein: r.ein,
            code: r.code,
            error: r.error ?? null,
            logFile: r.logFile,
        })),
    };

    const summaryPath = path.join(runDir, "summary.json");
    fs.writeFileSync(
        summaryPath,
        JSON.stringify(summary, null, 2) + "\n",
        "utf8",
    );

    console.log(
        `\nRun complete. total=${eins.length.toLocaleString()} succeeded=${succeeded.toLocaleString()} failed=${failed.toLocaleString()} elapsed=${
            Math.round(elapsedMs / 1000)
        }s`,
    );
    console.log(`Summary: ${summaryPath}`);
    if (failures.length) {
        console.log("Failed EINs:");
        for (const f of failures) {
            console.log(
                `- ${f.ein} (code=${f.code ?? "error"}) log=${f.logFile}`,
            );
        }
    }
}

main().catch((e) => {
    const msg = e && typeof e === "object" && "message" in e
        ? String((e as { message: unknown }).message)
        : String(e);
    console.error(`ERROR: ${msg}`);
    process.exit(1);
});
