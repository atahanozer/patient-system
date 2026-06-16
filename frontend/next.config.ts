import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' is for the self-hosted Docker image (docker-compose). Netlify's Next
  // runtime serves the default .next output and breaks on 'standalone' (every route
  // 404s), so we skip it there. Netlify sets NETLIFY=true during its build.
  output: process.env.NETLIFY ? undefined : "standalone",
};

export default nextConfig;
