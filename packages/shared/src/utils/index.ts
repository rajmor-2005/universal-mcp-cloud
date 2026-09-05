/**
 * @umcp/shared — Utility functions used across the platform.
 */

import { randomBytes, createHash } from 'crypto';
import { AUTH_CONSTANTS } from '../constants/index';

/**
 * Generate a cryptographically secure random string of the given byte length,
 * returned as a hex string (2 chars per byte).
 */
export function generateSecureToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Generate an API key with the standard prefix.
 * Format: umcp_<48 hex chars>
 */
export function generateApiKey(): { key: string; hash: string } {
  const raw = generateSecureToken(AUTH_CONSTANTS.API_KEY_LENGTH / 2);
  const key = `${AUTH_CONSTANTS.API_KEY_PREFIX}${raw}`;
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, hash };
}

/**
 * Create a workspace-scoped MCP endpoint URL.
 */
export function buildMcpEndpoint(baseUrl: string, workspaceId: string): string {
  return `${baseUrl}/u/${workspaceId}`;
}

/**
 * Namespace a tool name with its connector slug.
 * Example: github.create_issue
 */
export function namespaceTool(connectorSlug: string, toolName: string): string {
  return `${connectorSlug}_${toolName}`;
}

/**
 * Parse a namespaced tool name into connector slug and tool name.
 * Supports both dot (.) and underscore (_) separators.
 */
export function parseNamespacedTool(namespacedName: string): {
  connectorSlug: string;
  toolName: string;
} {
  const dotIndex = namespacedName.indexOf('.');
  if (dotIndex !== -1) {
    return {
      connectorSlug: namespacedName.slice(0, dotIndex),
      toolName: namespacedName.slice(dotIndex + 1),
    };
  }

  const underscoreIndex = namespacedName.indexOf('_');
  if (underscoreIndex !== -1) {
    return {
      connectorSlug: namespacedName.slice(0, underscoreIndex),
      toolName: namespacedName.slice(underscoreIndex + 1),
    };
  }

  throw new Error(`Invalid namespaced tool name: ${namespacedName}`);
}

/**
 * Slugify a string for use in URLs.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Mask a secret for display (show first 4 and last 4 characters).
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 12) {
    return `${'*'.repeat(secret.length)}`;
  }
  return `${secret.slice(0, 4)}${'*'.repeat(secret.length - 8)}${secret.slice(-4)}`;
}

/**
 * Calculate a usage period string from a date.
 * Format: YYYY-MM
 */
export function getUsagePeriod(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Retry a function with exponential backoff.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000, onRetry } = options;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        const jitter = delay * 0.1 * Math.random();
        onRetry?.(attempt + 1, lastError);
        await sleep(delay + jitter);
      }
    }
  }
  throw lastError;
}

/**
 * Sleep for the specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chunk an array into smaller arrays of the specified size.
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deep freeze an object to prevent mutations.
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value as object);
    }
  }
  return obj;
}

/**
 * Create a deferred promise that can be resolved/rejected externally.
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Generate a correlation ID for request tracing.
 */
export function generateCorrelationId(): string {
  return `req_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`;
}

/**
 * Check if a value is a non-null object.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Omit specified keys from an object.
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Pick specified keys from an object.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
