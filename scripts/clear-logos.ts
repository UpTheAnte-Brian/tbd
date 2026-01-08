/**
 * Deletes all objects from the Supabase "logos" bucket.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm ts-node scripts/clear-logos.ts [--dry-run]
 *
 * The service role key is required because storage deletes need elevated perms.
 */
import { createClient } from "@supabase/supabase-js";

const bucket = "logos";
const dryRun = process.argv.includes("--dry-run");

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL; // TODO: remove SUPABASE_URL fallback after migration
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL (preferred) or SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY env vars.",
  );
  process.exit(1);
}

type Item = {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at?: string;
  metadata?: Record<string, unknown>;
};

async function listAllFiles(prefix = ""): Promise<string[]> {
  const supabase = createClient(url, serviceKey);
  const pageSize = 100;
  let offset = 0;
  const files: string[] = [];

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) break;

    for (const item of data as Item[]) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      // Directories have no dot and are not files; recurse into them.
      if (!item.name.includes(".") && !item.name.includes("-") && item.name === "") {
        continue;
      }
      if ((item as { name?: string }).name?.endsWith("/")) {
        // unlikely with storage list, but skip if present
        continue;
      }
      // Supabase lists "folders" as entries without a dot; we need to recurse.
      if (!item.name.includes(".") && !item.name.includes("-")) {
        const nested = await listAllFiles(fullPath);
        files.push(...nested);
      } else {
        files.push(fullPath);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return files;
}

async function main() {
  const supabase = createClient(url, serviceKey);
  const files = await listAllFiles("");

  if (files.length === 0) {
    console.log(`Bucket "${bucket}" is already empty.`);
    return;
  }

  console.log(`Found ${files.length} file(s) in bucket "${bucket}".`);

  if (dryRun) {
    console.log("Dry run enabled; not deleting. Sample paths:");
    console.log(files.slice(0, 20));
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove(files);
  if (error) {
    throw error;
  }

  console.log(`Deleted ${files.length} file(s) from bucket "${bucket}".`);
}

main().catch((err) => {
  console.error("Error clearing logos bucket:", err);
  process.exit(1);
});
