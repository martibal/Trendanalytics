import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   // webpack: (config) => {
//   //   config.resolve = config.resolve || {};
//   //   config.resolve.symlinks = false;
//   //   return config;
//   // },
// };

const nextConfig: NextConfig = {
  // Enable Turbopack
  turbopack: {},
  
  // Remove or comment out webpack config if you have it
  // webpack: (config) => { ... }
};

export default nextConfig;
