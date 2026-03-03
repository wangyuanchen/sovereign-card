/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Vercel deployment optimisations
  poweredByHeader: false,
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  webpack: (config) => {
    // Fix: MetaMask SDK tries to import react-native-async-storage (browser doesn't need it)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'react-native': false,
    };
    config.externals.push('pino-pretty', 'encoding');
    // Suppress the @react-native-async-storage warning
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

export default nextConfig;
