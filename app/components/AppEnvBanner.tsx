export default function AppEnvBanner() {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  if (env !== "local" && env !== "test") {
    return null;
  }

  const label = env === "local" ? "DEV (local)" : "TEST (staging)";
  const theme =
    env === "local"
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : "bg-blue-100 text-blue-900 border-blue-200";

  return (
    <div
      className={`w-full border-b px-4 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.3em] ${theme}`}
    >
      {label}
    </div>
  );
}
