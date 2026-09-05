/**
 * @umcp/config — Environment configuration with Zod validation.
 * Validates all required env vars at startup and exports a strongly typed config object.
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import { resolve } from 'path';

import { existsSync } from 'fs';

// Load .env from process.cwd() or monorepo root
const cwdEnv = resolve(process.cwd(), '.env');
const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(cwdEnv)) {
  dotenvConfig({ path: cwdEnv });
} else if (existsSync(rootEnv)) {
  dotenvConfig({ path: rootEnv });
} else {
  dotenvConfig();
}

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('universal-mcp-cloud'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Magic Link
  MAGIC_LINK_SECRET: z.string().min(16).default('dev-magic-link-secret-change-in-production'),
  MAGIC_LINK_EXPIRY: z.string().default('15m'),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().url().default('http://localhost:4000/api/v1/auth/google/callback'),

  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  GITHUB_CALLBACK_URL: z.string().url().default('http://localhost:4000/api/v1/auth/github/callback'),

  // WebAuthn
  WEBAUTHN_RP_NAME: z.string().default('Universal MCP Cloud'),
  WEBAUTHN_RP_ID: z.string().default('localhost'),
  WEBAUTHN_ORIGIN: z.string().url().default('http://localhost:3000'),

  // Encryption
  ENCRYPTION_MASTER_KEY: z.string().length(64).regex(/^[0-9a-f]+$/i, 'Must be 64 hex characters'),

  // Email / SMTP
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('noreply@umcp.dev'),

  // S3 / MinIO
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('umcp_minio'),
  S3_SECRET_KEY: z.string().default('umcp_minio_secret'),
  S3_BUCKET: z.string().default('umcp-storage'),

  // OpenSearch
  OPENSEARCH_URL: z.string().default('http://localhost:9200'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PRICE_STARTER: z.string().default(''),
  STRIPE_PRICE_PRO: z.string().default(''),
  STRIPE_PRICE_BUSINESS: z.string().default(''),
  STRIPE_PRICE_ENTERPRISE: z.string().default(''),

  // Sentry
  SENTRY_DSN: z.string().default(''),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // MCP
  MCP_ENDPOINT_BASE: z.string().default('http://localhost:4000/mcp'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${errors}`);
  }

  return result.data;
}

let _config: EnvConfig | null = null;

/**
 * Get the validated environment configuration.
 * Lazy-loaded and cached on first access.
 */
export function getConfig(): EnvConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

/**
 * Check if the app is running in production.
 */
export function isProduction(): boolean {
  return getConfig().NODE_ENV === 'production';
}

/**
 * Check if the app is running in development.
 */
export function isDevelopment(): boolean {
  return getConfig().NODE_ENV === 'development';
}

/**
 * Check if the app is running in test mode.
 */
export function isTest(): boolean {
  return getConfig().NODE_ENV === 'test';
}

export default getConfig;
