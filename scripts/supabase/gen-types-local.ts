import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const supabaseCmd = process.platform === "win32" ? "supabase.cmd" : "supabase";
const outputPath = path.join(process.cwd(), "database.types.ts");

const args = [
    "gen",
    "types",
    "typescript",
    "--local",
    "--schema",
    "public,branding,governance",
];

const result = spawnSync(supabaseCmd, args, { encoding: "utf8" });

if (result.error) {
    console.error(result.error);
    process.exit(1);
}

if (result.status !== 0) {
    if (result.stderr) {
        console.error(result.stderr);
    }
    process.exit(result.status ?? 1);
}

if (!result.stdout) {
    console.error("No output received from supabase gen types.");
    process.exit(1);
}

fs.writeFileSync(outputPath, result.stdout, "utf8");
console.log(`Wrote ${outputPath}`);
