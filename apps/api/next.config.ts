import type { NextConfig } from 'next';
import { loadEnvConfig } from '@next/env';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Next.js normally searches from apps/api. Load the one ignored root env file
// so the API can consume DATABASE_URL without duplicating credentials.
loadEnvConfig(monorepoRoot);

const nextConfig: NextConfig = {};

export default nextConfig;
