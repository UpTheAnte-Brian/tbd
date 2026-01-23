import fs from "node:fs";
import path from "node:path";

const DEFAULT_ENV_FILES = [".env.local", ".env.development.local"];

function applyEnvLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) return;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    if (!process.env[key]) {
        process.env[key] = value;
    }
}

export function loadEnvFiles(files: string[] = DEFAULT_ENV_FILES): string[] {
    const loaded: string[] = [];

    for (const file of files) {
        const fullPath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(fullPath)) continue;

        const contents = fs.readFileSync(fullPath, "utf8");
        for (const line of contents.split(/\r?\n/)) {
            applyEnvLine(line);
        }

        loaded.push(file);
    }

    return loaded;
}
