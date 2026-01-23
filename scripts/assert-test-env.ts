import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!url) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

// Customize this string check to match your TEST project ref or URL pattern.
const mustInclude = "ynuqfzamakmiqzluuhnr"; // or your test project ref
if (!url.includes(mustInclude)) {
  console.error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL does not look like TEST.\nURL=${url}`,
  );
  process.exit(1);
}

console.log("OK: looks like TEST");
