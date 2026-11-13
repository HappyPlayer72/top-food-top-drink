import type { NextConfig } from 'next';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Cheile (DATABASE_URL etc.) stau în .env-ul din rădăcina repo-ului, comun cu backend-ul
const rootEnv = resolve(__dirname, '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Pachetele backend-ului sunt TypeScript sursă (workspace-uri npm)
  transpilePackages: [
    '@tftd/api',
    '@tftd/db',
    '@tftd/accounts',
    '@tftd/ingestion',
    '@tftd/leaderboard',
    '@tftd/loyalty',
    '@tftd/matching',
    '@tftd/moderation',
    '@tftd/monetization',
    '@tftd/owner',
    '@tftd/review-analysis',
    '@tftd/scoring',
  ],
};

export default nextConfig;
