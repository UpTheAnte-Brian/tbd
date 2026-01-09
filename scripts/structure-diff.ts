import fs from "node:fs";
import path from "node:path";

type TreeNode = {
  type: "directory" | "file";
  name: string;
  contents?: TreeNode[];
};

type TreeStats = {
  files: Set<string>;
  dirs: Set<string>;
};

const DEFAULT_LIMIT = 20;

function parseArgs() {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg
    ? Number.parseInt(limitArg.split("=")[1] ?? "", 10)
    : DEFAULT_LIMIT;
  const paths = args.filter((arg) => !arg.startsWith("--"));

  return {
    currentPath: paths[0],
    targetPath: paths[1],
    limit: Number.isFinite(limit) ? limit : DEFAULT_LIMIT,
  };
}

function readJson(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

function findRoot(data: unknown): TreeNode | null {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    const root = data.find(
      (node) =>
        node &&
        typeof node === "object" &&
        (node as TreeNode).type === "directory"
    );
    return (root as TreeNode) ?? null;
  }

  if (typeof data === "object" && (data as TreeNode).type === "directory") {
    return data as TreeNode;
  }

  return null;
}

function walk(node: TreeNode, basePath: string, stats: TreeStats) {
  if (node.type === "file") {
    const filePath = basePath
      ? path.posix.join(basePath, node.name)
      : node.name;
    stats.files.add(filePath);
    return;
  }

  const nextBase =
    node.name === "."
      ? basePath
      : basePath
      ? path.posix.join(basePath, node.name)
      : node.name;

  if (nextBase) {
    stats.dirs.add(nextBase);
  }

  for (const child of node.contents ?? []) {
    walk(child, nextBase, stats);
  }
}

function buildStats(root: TreeNode) {
  const stats: TreeStats = {
    files: new Set<string>(),
    dirs: new Set<string>(),
  };

  walk(root, "", stats);

  return stats;
}

function diffSets(current: Set<string>, target: Set<string>) {
  const added = Array.from(target).filter((item) => !current.has(item)).sort();
  const removed = Array.from(current)
    .filter((item) => !target.has(item))
    .sort();

  return { added, removed };
}

function printList(label: string, items: string[], limit: number) {
  if (items.length === 0) {
    return;
  }

  const shown = Math.min(limit, items.length);
  console.log(`\n${label} (showing ${shown} of ${items.length})`);
  for (const item of items.slice(0, shown)) {
    console.log(`- ${item}`);
  }
}

function main() {
  const { currentPath, targetPath, limit } = parseArgs();

  if (!currentPath || !targetPath) {
    console.error(
      "Usage: node scripts/structure-diff.ts <current.json> <target.json> [--limit=20]"
    );
    process.exit(1);
  }

  const currentRoot = findRoot(readJson(currentPath));
  const targetRoot = findRoot(readJson(targetPath));

  if (!currentRoot || !targetRoot) {
    console.error("Unable to locate a directory root in one of the JSON files.");
    process.exit(1);
  }

  const currentStats = buildStats(currentRoot);
  const targetStats = buildStats(targetRoot);

  const fileDiff = diffSets(currentStats.files, targetStats.files);
  const dirDiff = diffSets(currentStats.dirs, targetStats.dirs);

  console.log(
    `Current: ${currentStats.files.size} files, ${currentStats.dirs.size} dirs`
  );
  console.log(
    `Target: ${targetStats.files.size} files, ${targetStats.dirs.size} dirs`
  );
  console.log(`Added files: ${fileDiff.added.length}`);
  console.log(`Removed files: ${fileDiff.removed.length}`);
  console.log(`Added dirs: ${dirDiff.added.length}`);
  console.log(`Removed dirs: ${dirDiff.removed.length}`);

  printList("Added files", fileDiff.added, limit);
  printList("Removed files", fileDiff.removed, limit);
  printList("Added dirs", dirDiff.added, limit);
  printList("Removed dirs", dirDiff.removed, limit);
}

main();
