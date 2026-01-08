const config = {
  appName: "Ante Up Nation",
  appDescription:
    "Ante Up Nation is a platform helping local commerce work for its.",
  domainName:
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_HOST, // TODO: remove NEXT_PUBLIC_HOST fallback after migration
};

export default config;
