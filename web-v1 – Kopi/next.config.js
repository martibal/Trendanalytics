// D:\css\main\web-v1\next.config.js
import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix: Next inferred wrong workspace root due to multiple lockfiles.
  // This pins tracing root to this project directory.
  outputFileTracingRoot: path.join(process.cwd()),

  images: {
    // Mitigation: disables Next.js image optimization pipeline
    unoptimized: true,
  },
};

export default nextConfig;