import { SubscriptionPlan } from '../types/index';
import type { PlanLimits } from '../types/index';

// ─── API Versioning ─────────────────────────────────

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// ─── Authentication ─────────────────────────────────

export const AUTH_CONSTANTS = {
  BCRYPT_ROUNDS: 12,
  ACCESS_TOKEN_EXPIRY_SECONDS: 15 * 60,
  REFRESH_TOKEN_EXPIRY_SECONDS: 7 * 24 * 60 * 60,
  MAGIC_LINK_EXPIRY_SECONDS: 15 * 60,
  INVITATION_EXPIRY_DAYS: 7,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  SESSION_COOKIE_NAME: 'umcp_session',
  REFRESH_COOKIE_NAME: 'umcp_refresh',
  TOTP_ISSUER: 'UniversalMCPCloud',
  TOTP_ALGORITHM: 'SHA1' as const,
  TOTP_DIGITS: 6,
  TOTP_PERIOD: 30,
  PASSKEY_CHALLENGE_TIMEOUT_MS: 60000,
  API_KEY_PREFIX: 'umcp_',
  API_KEY_LENGTH: 48,
} as const;

// ─── Rate Limiting ──────────────────────────────────

export const RATE_LIMITS = {
  AUTH_LOGIN: { windowMs: 15 * 60 * 1000, max: 10 },
  AUTH_REGISTER: { windowMs: 60 * 60 * 1000, max: 5 },
  AUTH_MAGIC_LINK: { windowMs: 15 * 60 * 1000, max: 5 },
  API_DEFAULT: { windowMs: 60 * 1000, max: 100 },
  API_WRITE: { windowMs: 60 * 1000, max: 30 },
  MCP_TOOL_CALL: { windowMs: 60 * 1000, max: 60 },
  WEBHOOK: { windowMs: 60 * 1000, max: 100 },
  CONNECTOR_CALL: { windowMs: 60 * 1000, max: 30 },
} as const;

// ─── Pagination ─────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ─── Plan Limits ────────────────────────────────────

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  [SubscriptionPlan.FREE]: {
    maxConnectedApps: 3,
    maxToolCallsPerMonth: 1_000,
    maxWorkspaces: 1,
    maxSeats: 1,
    maxStorageMb: 100,
    analyticsRetentionDays: 7,
    supportLevel: 'community',
  },
  [SubscriptionPlan.STARTER]: {
    maxConnectedApps: 10,
    maxToolCallsPerMonth: 10_000,
    maxWorkspaces: 3,
    maxSeats: 5,
    maxStorageMb: 1_000,
    analyticsRetentionDays: 30,
    supportLevel: 'email',
  },
  [SubscriptionPlan.PRO]: {
    maxConnectedApps: 25,
    maxToolCallsPerMonth: 100_000,
    maxWorkspaces: 10,
    maxSeats: 20,
    maxStorageMb: 10_000,
    analyticsRetentionDays: 90,
    supportLevel: 'priority',
  },
  [SubscriptionPlan.BUSINESS]: {
    maxConnectedApps: 100,
    maxToolCallsPerMonth: 1_000_000,
    maxWorkspaces: 50,
    maxSeats: 100,
    maxStorageMb: 100_000,
    analyticsRetentionDays: 365,
    supportLevel: 'dedicated',
  },
  [SubscriptionPlan.ENTERPRISE]: {
    maxConnectedApps: Infinity,
    maxToolCallsPerMonth: Infinity,
    maxWorkspaces: Infinity,
    maxSeats: Infinity,
    maxStorageMb: Infinity,
    analyticsRetentionDays: Infinity,
    supportLevel: 'custom',
  },
} as const;

// ─── Connector ──────────────────────────────────────

export const CONNECTOR_CONSTANTS = {
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY_MS: 1000,
  HEALTH_CHECK_INTERVAL_MS: 5 * 60 * 1000,
  TOKEN_REFRESH_BUFFER_SECONDS: 300,
  MAX_TOOL_EXECUTION_TIMEOUT_MS: 30_000,
  DEFAULT_RATE_LIMIT_PER_MINUTE: 60,
} as const;

// ─── MCP ────────────────────────────────────────────

export const MCP_CONSTANTS = {
  PROTOCOL_VERSION: '2024-11-05',
  SERVER_NAME: 'universal-mcp-cloud',
  SERVER_VERSION: '0.1.0',
  MAX_TOOLS_PER_RESPONSE: 1000,
  HEARTBEAT_INTERVAL_MS: 30_000,
} as const;

// ─── Encryption ─────────────────────────────────────

export const CRYPTO_CONSTANTS = {
  ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16,
  SALT_LENGTH: 32,
  KEY_LENGTH: 32,
  PBKDF2_ITERATIONS: 100_000,
  HASH_ALGORITHM: 'sha256' as const,
} as const;

// ─── Events ─────────────────────────────────────────

export const EVENT_CONSTANTS = {
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_BACKOFF_MULTIPLIER: 2,
  DEAD_LETTER_QUEUE: 'umcp:dlq',
  EVENTS_CHANNEL: 'umcp:events',
} as const;

// ─── Webhook ────────────────────────────────────────

export const WEBHOOK_CONSTANTS = {
  MAX_DELIVERY_ATTEMPTS: 5,
  DELIVERY_TIMEOUT_MS: 10_000,
  SIGNATURE_HEADER: 'x-umcp-signature-256',
  TIMESTAMP_HEADER: 'x-umcp-timestamp',
  ID_HEADER: 'x-umcp-webhook-id',
  MAX_PAYLOAD_SIZE_BYTES: 256 * 1024,
} as const;
