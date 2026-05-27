import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const supabaseCmd = process.platform === "win32" ? "supabase.cmd" : "supabase";
const outputPath = path.join(process.cwd(), ".env.supabase.local.generated");
type StatusSnapshot = {
    apiUrl?: string;
    anonKey?: string;
    serviceRoleKey?: string;
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

function parseStatus(text: string): StatusSnapshot {
    const json = extractJsonObject(text);
    if (json) {
        const apiUrl = typeof json.API_URL === "string" ? json.API_URL : undefined;
        const anonKey = typeof json.PUBLISHABLE_KEY === "string"
            ? json.PUBLISHABLE_KEY
            : (typeof json.ANON_KEY === "string" ? json.ANON_KEY : undefined);
        const serviceRoleKey = typeof json.SECRET_KEY === "string"
            ? json.SECRET_KEY
            : (typeof json.SERVICE_ROLE_KEY === "string"
                ? json.SERVICE_ROLE_KEY
                : undefined);

        return { apiUrl, anonKey, serviceRoleKey };
    }

    const fields = parseKeyValueLines(text);
    return {
        apiUrl: pick(fields, "API_URL", "API URL"),
        anonKey: pick(fields, "PUBLISHABLE_KEY", "Publishable key", "ANON_KEY", "anon key"),
        serviceRoleKey: pick(
            fields,
            "SECRET_KEY",
            "Secret key",
            "SERVICE_ROLE_KEY",
            "service_role key",
        ),
    };
}

function runStatus(): SpawnSyncReturns<string> {
    const withJson = spawnSync(supabaseCmd, ["status", "--output", "json"], {
        encoding: "utf8",
        env: process.env,
    });

    if (withJson.error) return withJson;

    const output = combinedOutput(withJson);
    const unknownFlag =
        /unknown flag: --output/i.test(output) ||
        /unknown shorthand flag: 'o'/i.test(output);

    if (!unknownFlag && withJson.status === 0) return withJson;

    const plainStatus = spawnSync(supabaseCmd, ["status"], {
        encoding: "utf8",
        env: process.env,
    });

    if (plainStatus.status === 0) return plainStatus;
    return withJson.status === 0 ? withJson : plainStatus;
}

function fail(message: string, exitCode = 1): never {
    console.error(message);
    process.exit(exitCode);
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

export function syncLocalSupabaseEnv(options: { silent?: boolean } = {}): void {
    const status = runStatus();
    if (status.error) {
        if ((status.error as NodeJS.ErrnoException).code === "ENOENT") {
            fail(
                "[supabase] Supabase CLI not found. Install dependencies so `supabase` is available.",
            );
        }
        fail(`[supabase] Failed to run supabase status: ${status.error.message}`);
    }

    if (status.status !== 0) {
        const output = combinedOutput(status);
        if (isDockerNotRunning(output)) {
            fail(
                "[supabase] Docker is not running. Start Docker Desktop (or Docker daemon) and rerun `npm run dev`.",
                status.status ?? 1,
            );
        }

        fail(
            "[supabase] Local Supabase is not running. Run `npm run dev` or `npm run sb:local:start` first.",
            status.status ?? 1,
        );
    }

    const parsed = parseStatus(combinedOutput(status));
    if (!parsed.apiUrl || !parsed.anonKey || !parsed.serviceRoleKey) {
        fail(
            "[supabase] Could not extract local Supabase URL/keys from `supabase status`.",
        );
    }

    const contents = [
        "# Auto-generated by scripts/supabase/sync-local-env.ts",
        "# Do not edit manually.",
        `NEXT_PUBLIC_SUPABASE_URL=${parsed.apiUrl}`,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=${parsed.anonKey}`,
        `SUPABASE_SERVICE_ROLE_KEY=${parsed.serviceRoleKey}`,
        "",
    ].join("\n");

    fs.writeFileSync(outputPath, contents, "utf8");
    if (!options.silent) {
        console.log("[supabase] Wrote .env.supabase.local.generated.");
    }
}

const isMain =
    process.argv[1] &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
    syncLocalSupabaseEnv({ silent: process.argv.includes("--silent") });
}
