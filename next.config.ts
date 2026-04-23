import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the Turbopack root so it ignores a stray lockfile that lives at
  // ~/package-lock.json (not part of this project).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
