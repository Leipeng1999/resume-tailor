/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse requires Node.js runtime, disable edge for API routes
  experimental: {},
  webpack: (config) => {
    // Fix for pdf-parse module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

export default nextConfig;
