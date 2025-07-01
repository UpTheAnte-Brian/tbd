const config = {
  appName: "Ante Up Nation",
  appDescription:
    "Ante Up Nation is a platform helping local commerce work for its.",
  domainName: process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://tbd-gamma.vercel.app",
};

export default config;
