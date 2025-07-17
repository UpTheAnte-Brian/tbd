import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compiler: {
    styledComponents: true,
  },
  typescript: {
    tsconfigPath: "./tsconfig.next.json",
  },
};

export default nextConfig;
