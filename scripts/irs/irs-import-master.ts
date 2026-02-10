/**
 * IRS Import Master
 *
 * Runs the standard “scoped district” IRS ingest pipeline in sequence:
 *  1) Organizations bulk import (EO BMF MN extract)
 *  2) 990 bulk download/upsert for a year range
 *  3) Parse 990 returns (derive people/narratives/financial snapshots)
 *
 * Usage:
 *   pnpm tsx scripts/irs/irs-import-master.ts \
 *     --district 7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e \
 *     --eobmfFile data/irs-eobmf/mn/eo_mn.csv \
 *     --from 2019 --to 2025 \
 *     --download --upsert
 *
 * Optional:
 *   --skipOrgs   Skip step 1
 *   --skip990n   Skip step 2 (990-N)
 *   --skip990    Skip step 3 (990 XML bulk)
 *   --skipParse  Skip step 4 (parse 990 returns)
 *   --dryRun     Print commands only
 *   --maxObjects <n>  Limits processed returns per index-year for debugging (default in master is 0 = no limit)
 */

import { spawnSync } from "node:child_process";

type Args = {
    district?: string;
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
};

function parseArgs(argv: string[]): Args {
    const args: Args = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith("--")) continue;
        const key = a.slice(2);

        // boolean flags
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

        const value = argv[i + 1];
        if (!value || value.startsWith("--")) {
            throw new Error(`Missing value for --${key}`);
        }
        i++;

        if (key === "district") args.district = value;
        else if (key === "eobmfFile") args.eobmfFile = value;
        else if (key === "from") args.from = value;
        else if (key === "to") args.to = value;
        else if (key === "maxObjects") args.maxObjects = value;
        else throw new Error(`Unknown arg: --${key}`);
    }
    return args;
}

function run(cmd: string, cmdArgs: string[], opts: { dryRun?: boolean } = {}) {
    const printable = [cmd, ...cmdArgs].join(" ");
    console.log(`\n▶ ${printable}`);
    if (opts.dryRun) return;

    const res = spawnSync(cmd, cmdArgs, {
        stdio: "inherit",
        env: process.env,
    });

    if (res.status !== 0) {
        throw new Error(
            `Command failed (${res.status ?? "unknown"}): ${printable}`,
        );
    }
}

function requireArg<T extends string>(name: string, value: T | undefined): T {
    if (!value) throw new Error(`Missing required arg: --${name}`);
    return value;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const district = requireArg("district", args.district);
    const from = args.from ?? "2019";
    const to = args.to ?? "2025";
    const download = Boolean(args.download);
    const upsert = Boolean(args.upsert);
    const maxObjects = args.maxObjects ?? "0";

    if (!args.skipOrgs) {
        const eobmfFile = requireArg("eobmfFile", args.eobmfFile);

        // Step 1: EO BMF org import (MN extract)
        run(
            "pnpm",
            [
                "tsx",
                "scripts/irs/import-irs-organizations-bulk.ts",
                "--source",
                "eobmf",
                "--file",
                eobmfFile,
                "--district",
                district,
            ],
            { dryRun: args.dryRun },
        );
    } else {
        console.log("\n↷ Skipping org import (step 1) due to --skipOrgs");
    }

    if (!args.skip990n) {
        // Step 2: 990-N bulk import
        const cmdArgs = [
            "tsx",
            "scripts/irs/import-irs-990n.ts",
            "--district",
            district,
        ];

        if (download) cmdArgs.push("--download");

        run("pnpm", cmdArgs, { dryRun: args.dryRun });
    } else {
        console.log("\n↷ Skipping 990-N import (step 2) due to --skip990n");
    }

    if (!args.skip990) {
        // Step 3: Bulk 990 download + upsert (year range)
        const cmdArgs = [
            "tsx",
            "scripts/irs/import-990-bulk.ts",
            "--from",
            from,
            "--to",
            to,
            "--district",
            district,
        ];

        if (download) cmdArgs.push("--download");
        if (upsert) cmdArgs.push("--upsert");
        cmdArgs.push("--maxObjects", maxObjects);

        run("pnpm", cmdArgs, { dryRun: args.dryRun });
    } else {
        console.log("\n↷ Skipping 990 bulk import (step 3) due to --skip990");
    }

    if (!args.skipParse) {
        // Step 4: Parse returns into normalized tables (people/narratives/financials)
        run(
            "pnpm",
            ["tsx", "scripts/irs/parse-990-return.ts", "--district", district],
            { dryRun: args.dryRun },
        );
    } else {
        console.log("\n↷ Skipping return parsing (step 3) due to --skipParse");
    }

    console.log("\n✅ IRS import pipeline complete.");
}

main();
