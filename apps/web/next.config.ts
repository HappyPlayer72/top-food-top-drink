import type { NextConfig } from 'next';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Next citește doar .env din apps/web; secretele proiectului stau în .env din rădăcină.
const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Pachetele backend se publică ca surse TypeScript (exports: ./src/index.ts).
  transpilePackages: [
    '@tftd/api',
    '@tftd/accounts',
    '@tftd/db',
    '@tftd/owner',
    '@tftd/ingestion',
    '@tftd/moderation',
    '@tftd/monetization',
    '@tftd/review-analysis',
    '@tftd/scoring',
  ],
  serverExternalPackages: ['postgres'],
  // Monorepo: rădăcina pentru tracing e repo-ul, nu apps/web.
  outputFileTracingRoot: resolve(process.cwd(), '../..'),
};

export default nextConfig;
