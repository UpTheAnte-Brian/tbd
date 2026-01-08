const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

const eitherKeys = [
  {
    primary: "NEXT_PUBLIC_SITE_URL",
    fallback: "NEXT_PUBLIC_HOST",
  },
];

const optionalKeys = [
  "NEXT_PUBLIC_GOOGLE_LIBRARIES",
  "NEXT_PUBLIC_GOOGLE_MAP_ID",
  "NEXT_PUBLIC_BRANDING_DEBUG",
  "NEXT_PUBLIC_SUPABASE_STORAGE_LOGO_PATH",
  "EMAIL_FROM",
  "MAILTRAP_HOST",
  "MAILTRAP_PORT",
  "MAILTRAP_USER",
  "MAILTRAP_PASS",
];

const missingRequired = requiredKeys.filter((key) => !process.env[key]);
const missingEither = eitherKeys.filter(
  ({ primary, fallback }) => !process.env[primary] && !process.env[fallback],
);
const missingOptional = optionalKeys.filter((key) => !process.env[key]);

const strict = process.argv.includes("--strict");

if (missingRequired.length === 0 && missingEither.length === 0) {
  console.log("Env check: all required keys are set.");
} else {
  console.warn("Env check: missing required keys.");
  if (missingRequired.length > 0) {
    console.warn(`- ${missingRequired.join(", ")}`);
  }
  for (const { primary, fallback } of missingEither) {
    console.warn(`- ${primary} (or ${fallback})`);
  }
}

if (missingOptional.length > 0) {
  console.log("Env check: optional keys not set.");
  console.log(`- ${missingOptional.join(", ")}`);
}

if (strict && (missingRequired.length > 0 || missingEither.length > 0)) {
  process.exit(1);
}
