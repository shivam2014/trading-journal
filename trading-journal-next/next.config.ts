import type { NextConfig } from "next";
import moduleAlias from 'module-alias';

moduleAlias.addAlias('punycode', 'punycode/');

const nextConfig: NextConfig = {
  env: {
    POSTGRES_URL: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side configuration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
      };
    }
    
    if (isServer) {
      console.log('Environment Variables Status:');
      console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'Set' : 'Not Set');
      console.log('POSTGRES_URL_NON_POOLING:', process.env.POSTGRES_URL_NON_POOLING ? 'Set' : 'Not Set');
    }
    return config;
  },
};

export default nextConfig;
