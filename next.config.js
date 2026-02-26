const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'api.qrserver.com',
    pathname: '/v1/create-qr-code/**',
  },
  {
    protocol: 'https',
    hostname: 'heritageguitars.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'www.fallenoaks.farm',
    pathname: '/**',
  },
];

if (supabaseUrl) {
  try {
    const { hostname } = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: 'https',
      hostname,
      pathname: '/storage/v1/object/public/item-photos/**',
    });
  } catch {
    // Ignore invalid URL; Next.js will warn during build if remote image fails
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    scrollRestoration: true,
  },
  images: {
    unoptimized: true, // Disable Vercel image optimization to avoid transformation limits
    remotePatterns,
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
