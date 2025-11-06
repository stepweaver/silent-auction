/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Mark plivo as an external package for server components
  // This prevents Next.js from trying to bundle it during build
  serverComponentsExternalPackages: ['plivo'],
};

module.exports = nextConfig;
