// next.config.js
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["localhost:3000", "127.0.0.1:3000"],
};

module.exports = nextConfig;