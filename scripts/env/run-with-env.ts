import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type ParsedArgs = {
  files: string[];
  command: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  const separatorIndex = argv.indexOf("--");
  if (separatorIndex === -1) {
    throw new Error("Missing `--` before command to execute.");
  }

  const argTokens = argv.slice(0, separatorIndex);
  const command = argv.slice(separatorIndex + 1);
  if (command.length === 0) {
    throw new Error("Missing command to execute.");
  }

  const files: string[] = [];
  for (let i = 0; i < argTokens.length; i += 1) {
    const token = argTokens[i];
    if (token !== "--file") {
      throw new Error(`Unknown argument: ${token}`);
    }

    const value = argTokens[i + 1];
    if (!value) {
      throw new Error("Missing value after --file");
    }
    files.push(value);
    i += 1;
  }

  return { files, command };
}

function parseEnvFile(filePath: string): Record<string, string> {
  const values: Record<string, string> = {};
  const contents = fs.readFileSync(filePath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function resolveCommand(command: string): string {
  if (process.platform === "win32") {
    if (command === "npm") return "npm.cmd";
    if (command === "npx") return "npx.cmd";
  }
  return command;
}

function summarizeSupabaseTarget(env: Record<string, string | undefined>) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  if (!url) return "unknown";

  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return url;
  }
}

function main() {
  const { files, command } = parseArgs(process.argv.slice(2));
  const env = { ...process.env } as Record<string, string | undefined>;
  const loadedFiles: string[] = [];

  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;

    const parsed = parseEnvFile(fullPath);
    for (const [key, value] of Object.entries(parsed)) {
      env[key] = value;
    }
    loadedFiles.push(file);
  }

  const resolvedCommand = resolveCommand(command[0]);
  console.log(
    `[env] Loaded files: ${loadedFiles.length > 0 ? loadedFiles.join(" -> ") : "(none)"}`,
  );
  console.log(
    `[env] Supabase target: ${summarizeSupabaseTarget(env)}`,
  );

  const result = spawnSync(resolvedCommand, command.slice(1), {
    stdio: "inherit",
    env,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

main();
