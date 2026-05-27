import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { syncLocalSupabaseEnv } from "./sync-local-env";

const supabaseCmd = process.platform === "win32" ? "supabase.cmd" : "supabase";

type StatusSnapshot = {
    isRunning: boolean;
    apiUrl?: string;
    studioUrl?: string;
    output: string;
};

function normalizeKey(input: string): string {
    return input.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function combinedOutput(result: SpawnSyncReturns<string>): string {
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    return `${stdout}\n${stderr}`.trim();
}

function extractJsonObject(text: string): Record<string, unknown> | null {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        if (parsed && typeof parsed === "object") {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }

    return null;
}

function parseKeyValueLines(text: string): Record<string, string> {
    const values: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*([^:]+):\s*(.+?)\s*$/);
        if (!match) continue;
        values[normalizeKey(match[1])] = match[2];
    }
    return values;
}

function pick(
    fields: Record<string, string>,
    ...candidates: string[]
): string | undefined {
    for (const candidate of candidates) {
        const value = fields[normalizeKey(candidate)];
        if (value) return value;
    }
    return undefined;
}

function runSupabase(args: string[]): SpawnSyncReturns<string> {
    return spawnSync(supabaseCmd, args, {
        encoding: "utf8",
        env: process.env,
    });
}

function runStatus(): SpawnSyncReturns<string> {
    const withJson = runSupabase(["status", "--output", "json"]);
    if (withJson.error) return withJson;

    const output = combinedOutput(withJson);
    const unknownFlag =
        /unknown flag: --output/i.test(output) ||
        /unknown shorthand flag: 'o'/i.test(output);
    if (!unknownFlag && withJson.status === 0) return withJson;

    const plainStatus = runSupabase(["status"]);
    if (plainStatus.status === 0) return plainStatus;
    return withJson.status === 0 ? withJson : plainStatus;
}

function parseStatus(result: SpawnSyncReturns<string>): StatusSnapshot {
    const output = combinedOutput(result);
    const fields: Record<string, string> = {};

    const json = extractJsonObject(output);
    if (json) {
        for (const [key, value] of Object.entries(json)) {
            if (typeof value === "string") {
                fields[normalizeKey(key)] = value;
            }
        }
    }

    for (const [key, value] of Object.entries(parseKeyValueLines(output))) {
        fields[key] = value;
    }

    const apiUrl = pick(fields, "API_URL", "API URL");
    const studioUrl = pick(fields, "STUDIO_URL", "Studio URL");
    const hasRunningText = /local development setup is running/i.test(output);
    const isRunning = result.status === 0 && (Boolean(apiUrl) || hasRunningText);

    return {
        isRunning,
        apiUrl,
        studioUrl,
        output,
    };
}

function isMissingCli(result: SpawnSyncReturns<string>): boolean {
    return (result.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

function isDockerNotRunning(text: string): boolean {
    return (
        /cannot connect to the docker daemon/i.test(text) ||
        /is the docker daemon running/i.test(text) ||
        /docker desktop is not running/i.test(text) ||
        /permission denied while trying to connect to the docker daemon socket/i.test(
            text,
        ) ||
        /trying to connect to the docker daemon socket/i.test(text) ||
        /error during connect/i.test(text)
    );
}

function fail(message: string, exitCode = 1): never {
    console.error(message);
    process.exit(exitCode);
}

const initialStatusResult = runStatus();
if (isMissingCli(initialStatusResult)) {
    fail(
        "[supabase] Supabase CLI not found. Install dependencies so `supabase` is available.",
    );
}
if (initialStatusResult.error) {
    fail(
        `[supabase] Failed to check local Supabase status: ${initialStatusResult.error.message}`,
    );
}

let finalStatus = parseStatus(initialStatusResult);
let startedNow = false;

if (!finalStatus.isRunning) {
    const startResult = runSupabase(["start"]);
    if (isMissingCli(startResult)) {
        fail(
            "[supabase] Supabase CLI not found. Install dependencies so `supabase` is available.",
        );
    }
    if (startResult.error) {
        fail(`[supabase] Failed to run supabase start: ${startResult.error.message}`);
    }
    if (startResult.status !== 0) {
        const output = combinedOutput(startResult);
        if (isDockerNotRunning(output)) {
            fail(
                "[supabase] Docker is not running. Start Docker Desktop (or Docker daemon) and rerun `npm run dev`.",
                startResult.status ?? 1,
            );
        }
        fail(
            "[supabase] Failed to start local Supabase. Run `supabase start` for detailed logs.",
            startResult.status ?? 1,
        );
    }

    const statusAfterStart = runStatus();
    if (statusAfterStart.error) {
        fail(
            `[supabase] Started Supabase, but failed to verify status: ${statusAfterStart.error.message}`,
        );
    }

    finalStatus = parseStatus(statusAfterStart);
    if (!finalStatus.isRunning) {
        if (isDockerNotRunning(finalStatus.output)) {
            fail(
                "[supabase] Docker is not running. Start Docker Desktop (or Docker daemon) and rerun `npm run dev`.",
                statusAfterStart.status ?? 1,
            );
        }
        fail(
            "[supabase] Supabase did not report a healthy local status after start.",
            statusAfterStart.status ?? 1,
        );
    }

    startedNow = true;
}

syncLocalSupabaseEnv({ silent: true });

const statusLabel = startedNow ? "started" : "already running";
const urls = [finalStatus.apiUrl, finalStatus.studioUrl].filter(Boolean) as string[];
if (urls.length === 2) {
    console.log(`[supabase] Local stack ${statusLabel}. API: ${urls[0]} Studio: ${urls[1]}`);
} else {
    console.log(`[supabase] Local stack ${statusLabel}.`);
}
