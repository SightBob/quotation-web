import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  // the project lives deep inside the home dir; pin turbopack's root to avoid scanning it
  turbopack: { root: process.cwd() },
};

export default nextConfig;
