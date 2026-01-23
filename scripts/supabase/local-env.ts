import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const supabaseCmd = process.platform === "win32" ? "supabase.cmd" : "supabase";

type Step = {
    name: string;
    command: string;
    args: string[];
};

const steps: Step[] = [
    { name: "supabase start", command: supabaseCmd, args: ["start"] },
    {
        name: "supabase db reset --local",
        command: supabaseCmd,
        args: ["db", "reset", "--local"],
    },
    { name: "seed local", command: npmCmd, args: ["run", "seed:local"] },
    {
        name: "verify local",
        command: npmCmd,
        args: ["run", "verify:local"],
    },
    { name: "generate types", command: npmCmd, args: ["run", "types:local"] },
];

function runStep(step: Step) {
    console.log(`\n==> ${step.name}`);
    const start = performance.now();

    const result = spawnSync(step.command, step.args, {
        stdio: "inherit",
        env: process.env,
    });

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);

    if (result.error) {
        console.error(result.error);
        process.exit(1);
    }

    if (result.status !== 0) {
        console.error(`Step failed: ${step.name}`);
        process.exit(result.status ?? 1);
    }

    console.log(`OK: ${step.name} (${elapsed}s)`);
}

for (const step of steps) {
    runStep(step);
}
