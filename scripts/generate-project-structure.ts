import fs from "node:fs/promises";
import path from "node:path";

type TreeNode = {
  type: "directory" | "file";
  name: string;
  contents?: TreeNode[];
};

const DEFAULT_DEPTH = 7;
const DEFAULT_ROOTS = ["app", "domain", "components", "lib", "data", "hooks"];
const ALWAYS_FILES = [
  "README.md",
  "package.json",
  "tsconfig.json",
  ".env.example",
  "AGENT.md",
];

const EXCLUDED_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  ".turbo",
  ".vercel",
  "dist",
  "build",
  "coverage",
  ".supabase",
]);

const EXCLUDED_DIR_PATHS = new Set(["supabase/.branches"]);

function parseArgs() {
  const args = process.argv.slice(2);
  let depth = DEFAULT_DEPTH;
  let rootsArg: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg?.startsWith("--depth=")) {
      const value = Number.parseInt(arg.split("=")[1] ?? "", 10);
      if (Number.isFinite(value) && value >= 0) {
        depth = value;
      }
      continue;
    }

    if (arg === "--depth") {
      const value = Number.parseInt(args[i + 1] ?? "", 10);
      if (Number.isFinite(value) && value >= 0) {
        depth = value;
        i += 1;
      }
      continue;
    }

    if (arg?.startsWith("--roots=")) {
      rootsArg = arg.split("=")[1];
      continue;
    }

    if (arg === "--roots") {
      rootsArg = args[i + 1];
      i += 1;
    }
  }

  return { depth, rootsArg };
}

async function statSafe(targetPath: string) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
}

async function isDirectory(targetPath: string) {
  const stats = await statSafe(targetPath);
  return stats?.isDirectory() ?? false;
}

async function isFile(targetPath: string) {
  const stats = await statSafe(targetPath);
  return stats?.isFile() ?? false;
}

function shouldSkipDir(name: string, parentRel: string) {
  if (EXCLUDED_DIRS.has(name)) {
    return true;
  }

  const rel = parentRel ? path.posix.join(parentRel, name) : name;
  return EXCLUDED_DIR_PATHS.has(rel);
}

function shouldSkipFile(name: string) {
  return name.endsWith(".log");
}

async function buildDirectoryNode(
  absPath: string,
  relPath: string,
  name: string,
  depth: number,
  maxDepth: number
): Promise<TreeNode> {
  if (depth >= maxDepth) {
    return { type: "directory", name, contents: [] };
  }

  const entries = await fs.readdir(absPath, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    const entryName = entry.name;
    if (entry.isDirectory()) {
      if (shouldSkipDir(entryName, relPath)) {
        continue;
      }

      const nextAbs = path.join(absPath, entryName);
      const nextRel = relPath ? path.posix.join(relPath, entryName) : entryName;
      const dirNode = await buildDirectoryNode(
        nextAbs,
        nextRel,
        entryName,
        depth + 1,
        maxDepth
      );
      nodes.push(dirNode);
      continue;
    }

    if (entry.isFile()) {
      if (shouldSkipFile(entryName)) {
        continue;
      }

      nodes.push({ type: "file", name: entryName });
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return { type: "directory", name, contents: nodes };
}

async function resolveRoots(rootPath: string, rootsArg?: string) {
  const requestedRoots = rootsArg
    ? rootsArg
        .split(",")
        .map((root) => root.trim())
        .filter(Boolean)
    : DEFAULT_ROOTS;

  const roots: string[] = [];
  for (const root of requestedRoots) {
    const abs = path.join(rootPath, root);
    if (await isDirectory(abs)) {
      roots.push(root);
    }
  }

  return roots;
}

async function buildRootContents(rootPath: string, depth: number, rootsArg?: string) {
  if (depth <= 0) {
    return [] as TreeNode[];
  }

  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const entryLookup = new Map(entries.map((entry) => [entry.name, entry]));
  const fileNodes: TreeNode[] = [];
  const seenFiles = new Set<string>();

  for (const fileName of ALWAYS_FILES) {
    const entry = entryLookup.get(fileName);
    if (entry?.isFile()) {
      fileNodes.push({ type: "file", name: fileName });
      seenFiles.add(fileName);
    }
  }

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (seenFiles.has(entry.name)) {
      continue;
    }

    if (/^next\.config\./.test(entry.name)) {
      fileNodes.push({ type: "file", name: entry.name });
      seenFiles.add(entry.name);
    }
  }

  const roots = await resolveRoots(rootPath, rootsArg);
  const dirNodes: TreeNode[] = [];

  for (const root of roots) {
    if (shouldSkipDir(root, "")) {
      continue;
    }

    const abs = path.join(rootPath, root);
    dirNodes.push(
      await buildDirectoryNode(abs, root, root, 1, depth)
    );
  }

  dirNodes.sort((a, b) => a.name.localeCompare(b.name));
  fileNodes.sort((a, b) => a.name.localeCompare(b.name));

  return [...dirNodes, ...fileNodes];
}

async function main() {
  const { depth, rootsArg } = parseArgs();
  const rootPath = process.cwd();

  const contents = await buildRootContents(rootPath, depth, rootsArg);
  const tree: TreeNode[] = [
    {
      type: "directory",
      name: ".",
      contents,
    },
  ];

  const outputPath = path.join(rootPath, "project-structure.json");
  await fs.writeFile(outputPath, JSON.stringify(tree, null, 2));

  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error("Failed to generate project structure.");
  console.error(error);
  process.exit(1);
});
