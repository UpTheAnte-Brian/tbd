/**
 * IRS Import Master (single EIN)
 *
 * Runs the IRS ingest pipeline for exactly one EIN:
 *  1) 990-N import (optional)
 *  2) 990 XML bulk import for a year range (optional)
 *  3) Parse returns into normalized tables (optional)
 *
 * Usage:
 *   pnpm tsx scripts/irs/irs-import-master-ein.ts \
 *     --ein 411839631 \
 *     --from 2022 --to 2026 \
 *     --download --upsert
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { normalizeEinInput } from "./lib/ein";

type Args = {
    ein?: string;
    from?: string;
    to?: string;
    latestOnly?: boolean;
    cacheDir?: string;
    forceDownload?: boolean;
    download?: boolean;
    upsert?: boolean;
    skip990n?: boolean;
    skip990?: boolean;
    skipParse?: boolean;
    dryRun?: boolean;
    maxObjects?: string;
    logFile?: string;
};

type Logger = {
    filePath: string;
    write: (msg: string | Buffer) => void;
    writeErr: (msg: string | Buffer) => void;
    log: (msg: string) => void;
    logErr: (msg: string) => void;
    close: () => void;
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

        const value = argv[i + 1];
        if (!value || value.startsWith("--")) {
            throw new Error(`Missing value for --${key}`);
        }
        i++;

        if (key === "ein") args.ein = value;
        else if (key === "from") args.from = value;
        else if (key === "to") args.to = value;
        else if (key === "cacheDir") args.cacheDir = value;
        else if (key === "maxObjects") args.maxObjects = value;
        else if (key === "logFile") args.logFile = value;
        else throw new Error(`Unknown arg: --${key}`);
    }
    return args;
}

function requireArg<T extends string>(name: string, value: T | undefined): T {
    if (!value) throw new Error(`Missing required arg: --${name}`);
    return value;
}

function defaultLogPath(ein: string): string {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    return path.join(
        process.cwd(),
        "data",
        "irs-logs",
        `irs-import-master-ein-${ein}-${ts}.log`,
    );
}

function createLogger(filePath: string): Logger {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const stream = fs.createWriteStream(filePath, { flags: "a" });

    const write = (msg: string | Buffer) => {
        process.stdout.write(msg);
        stream.write(msg);
    };

    const writeErr = (msg: string | Buffer) => {
        process.stderr.write(msg);
        stream.write(msg);
    };

    return {
        filePath,
        write,
        writeErr,
        log: (msg: string) => write(`${msg}\n`),
        logErr: (msg: string) => writeErr(`${msg}\n`),
        close: () => stream.end(),
    };
}

function run(
    cmd: string,
    cmdArgs: string[],
    logger: Logger,
    opts: { dryRun?: boolean } = {},
): Promise<void> {
    const printable = [cmd, ...cmdArgs].join(" ");
    logger.log(`\n▶ ${printable}`);
    if (opts.dryRun) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const child = spawn(cmd, cmdArgs, { env: process.env });

        child.stdout?.on("data", (chunk) => logger.write(chunk));
        child.stderr?.on("data", (chunk) => logger.writeErr(chunk));

        child.on("error", (err) => reject(err));
        child.on("close", (code) => {
            if (code && code !== 0) {
                reject(
                    new Error(
                        `Command failed (${code ?? "unknown"}): ${printable}`,
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

    const normalizedEin = normalizeEinInput(requireArg("ein", args.ein));
    if (!normalizedEin) {
        throw new Error(`Invalid EIN: ${String(args.ein ?? "")}`);
    }

    const from = args.from ?? "2022";
    const to = args.to ?? String(new Date().getFullYear());
    const download = Boolean(args.download);
    const upsert = Boolean(args.upsert);
    const maxObjects = args.maxObjects ?? "0";

    const logger = createLogger(args.logFile ?? defaultLogPath(normalizedEin));
    logger.log(`Log file: ${logger.filePath}`);
    logger.log(`EIN: ${normalizedEin}`);
    logger.log(`Years: ${from}-${to}`);

    try {
        if (!args.skip990n) {
            const cmdArgs = [
                "tsx",
                "scripts/irs/import-irs-990n.ts",
                "--ein",
                normalizedEin,
            ];
            if (download) cmdArgs.push("--download");
            await run("pnpm", cmdArgs, logger, { dryRun: args.dryRun });
        } else {
            logger.log("\n↷ Skipping 990-N import (step 1) due to --skip990n");
        }

        if (!args.skip990) {
            const cmdArgs = [
                "tsx",
                "scripts/irs/import-990-bulk.ts",
                "--from",
                from,
                "--to",
                to,
                "--ein",
                normalizedEin,
                "--maxObjects",
                maxObjects,
            ];

            if (download) cmdArgs.push("--download");
            if (upsert) cmdArgs.push("--upsert");
            if (args.latestOnly) cmdArgs.push("--latestOnly");
            if (args.forceDownload) cmdArgs.push("--forceDownload");
            if (args.cacheDir) cmdArgs.push("--cacheDir", args.cacheDir);

            await run("pnpm", cmdArgs, logger, { dryRun: args.dryRun });
        } else {
            logger.log("\n↷ Skipping 990 bulk import (step 2) due to --skip990");
        }

        if (!args.skipParse) {
            await run(
                "pnpm",
                ["tsx", "scripts/irs/parse-990-return.ts", "--ein", normalizedEin],
                logger,
                { dryRun: args.dryRun },
            );
        } else {
            logger.log("\n↷ Skipping return parsing (step 3) due to --skipParse");
        }

        logger.log("\n✅ EIN import pipeline complete.");
    } finally {
        logger.close();
    }
}

main().catch((e) => {
    const msg = e && typeof e === "object" && "message" in e
        ? String((e as { message: unknown }).message)
        : String(e);
    console.error(`ERROR: ${msg}`);
    process.exit(1);
});
