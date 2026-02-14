/**
 * IRS Import Master Wrapper (multi-district)
 *
 * Reads district UUIDs from research/nonprofits.json and runs
 * scripts/irs/irs-import-master.ts once per district.
 *
 * Defaults:
 * - --download enabled
 * - --upsert enabled
 * - --eobmfFile data/irs-eobmf/mn/eo_mn.csv
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Args = {
    nonprofitsFile?: string;
    eobmfFile?: string;
    from?: string;
    to?: string;
    download?: boolean;
    upsert?: boolean;
    skipOrgs?: boolean;
    skip990n?: boolean;
    skip990?: boolean;
    skipParse?: boolean;
    dryRun?: boolean;
    maxObjects?: string;
    logDir?: string;
};

type DistrictTarget = {
    key: string;
    name: string | null;
    id: string;
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
            key === "skipOrgs" ||
            key === "skip990n" ||
            key === "skip990" ||
            key === "skipParse" ||
            key === "dryRun"
        ) {
            (args as any)[key] = true;
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

        if (key === "nonprofitsFile") args.nonprofitsFile = value;
        else if (key === "eobmfFile") args.eobmfFile = value;
        else if (key === "from") args.from = value;
        else if (key === "to") args.to = value;
        else if (key === "maxObjects") args.maxObjects = value;
        else if (key === "logDir") args.logDir = value;
        else throw new Error(`Unknown arg: --${key}`);
    }
    return args;
}

function looksLikeUuid(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        .test(s);
}

function sanitizeForFile(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function loadDistrictTargets(nonprofitsFile: string): DistrictTarget[] {
    if (!fs.existsSync(nonprofitsFile)) {
        throw new Error(`nonprofits file not found: ${nonprofitsFile}`);
    }
    const raw = fs.readFileSync(nonprofitsFile, "utf8");
    const json = JSON.parse(raw);
    const districts = json?.districts;
    if (!districts || typeof districts !== "object") {
        throw new Error(
            `Invalid nonprofits JSON shape. Expected object at "districts": ${nonprofitsFile}`,
        );
    }

    const targets: DistrictTarget[] = [];
    const seen = new Set<string>();

    for (const [key, v] of Object.entries(districts)) {
        const rec = v as { id?: unknown; name?: unknown };
        const id = rec?.id != null ? String(rec.id).trim() : "";
        if (!id || !looksLikeUuid(id) || seen.has(id)) continue;
        seen.add(id);
        const name = rec?.name != null ? String(rec.name).trim() : null;
        targets.push({ key, name: name || null, id });
    }

    if (!targets.length) {
        throw new Error(
            `No district UUIDs found under "districts.*.id": ${nonprofitsFile}`,
        );
    }
    return targets;
}

function runCommand(cmd: string, cmdArgs: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, cmdArgs, {
            env: process.env,
            stdio: "inherit",
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code && code !== 0) {
                reject(
                    new Error(
                        `Command failed (${code}): ${[cmd, ...cmdArgs].join(" ")}`,
                    ),
                );
            } else {
                resolve();
            }
        });
    });
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const nonprofitsFile = path.resolve(
        args.nonprofitsFile || path.join("research", "nonprofits.json"),
    );
    const targets = loadDistrictTargets(nonprofitsFile);

    const download = args.download ?? true;
    const upsert = args.upsert ?? true;

    const logDir = path.resolve(
        args.logDir || path.join("data", "irs-logs", "multi-district"),
    );
    fs.mkdirSync(logDir, { recursive: true });

    const eobmfFile = path.resolve(
        args.eobmfFile || path.join("data", "irs-eobmf", "mn", "eo_mn.csv"),
    );
    if (!args.skipOrgs && !fs.existsSync(eobmfFile)) {
        throw new Error(
            `EO BMF file not found: ${eobmfFile}. Pass --eobmfFile <path> or use --skipOrgs.`,
        );
    }

    const runTs = new Date().toISOString().replace(/[:.]/g, "-");

    console.log(
        `Loaded ${targets.length} district UUIDs from ${nonprofitsFile}`,
    );
    for (const t of targets) {
        console.log(`- ${t.key}: ${t.id}${t.name ? ` (${t.name})` : ""}`);
    }

    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const label = t.name || t.key;
        const slug = sanitizeForFile(t.key || label || t.id);
        const logFile = path.resolve(
            logDir,
            `${runTs}-${String(i + 1).padStart(2, "0")}-${slug}.log`,
        );

        const masterArgs = [
            "tsx",
            "scripts/irs/irs-import-master.ts",
            "--district",
            t.id,
            "--logFile",
            logFile,
        ];

        if (!args.skipOrgs) {
            masterArgs.push("--eobmfFile", eobmfFile);
        }
        if (args.from) masterArgs.push("--from", args.from);
        if (args.to) masterArgs.push("--to", args.to);
        if (download) masterArgs.push("--download");
        if (upsert) masterArgs.push("--upsert");
        if (args.skipOrgs) masterArgs.push("--skipOrgs");
        if (args.skip990n) masterArgs.push("--skip990n");
        if (args.skip990) masterArgs.push("--skip990");
        if (args.skipParse) masterArgs.push("--skipParse");
        if (args.dryRun) masterArgs.push("--dryRun");
        if (args.maxObjects) masterArgs.push("--maxObjects", args.maxObjects);

        console.log(
            `\n[${i + 1}/${targets.length}] Running IRS master for ${label} (${t.id})`,
        );
        console.log(`Log file: ${logFile}`);
        await runCommand("pnpm", masterArgs);
    }

    console.log(
        `\nCompleted IRS master wrapper for ${targets.length} districts.`,
    );
}

main().catch((e) => {
    const msg = e && typeof e === "object" && "message" in e
        ? String((e as any).message)
        : String(e);
    console.error(`ERROR: ${msg}`);
    process.exit(1);
});
