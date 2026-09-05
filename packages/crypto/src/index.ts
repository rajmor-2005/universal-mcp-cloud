/**
 * @umcp/crypto — Encryption, hashing, and key derivation utilities.
 *
 * Uses AES-256-GCM for symmetric encryption with authenticated data.
 * Secrets are stored as: base64(iv + authTag + ciphertext)
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import bcrypt from 'bcryptjs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;

// ─── AES-256-GCM Encryption ────────────────────────

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a base64 encoded string containing: iv + authTag + ciphertext
 */
export function encrypt(plaintext: string, masterKeyHex: string): string {
  const key = Buffer.from(masterKeyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Master key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars)`);
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack: iv (16) + authTag (16) + ciphertext (variable)
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64 encoded AES-256-GCM ciphertext.
 */
export function decrypt(encryptedBase64: string, masterKeyHex: string): string {
  const key = Buffer.from(masterKeyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Master key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars)`);
  }

  const packed = Buffer.from(encryptedBase64, 'base64');
  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data: too short');
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Encrypt with an additional associated data (AAD) context.
 * Useful for binding ciphertext to a specific workspace or user.
 */
export function encryptWithContext(
  plaintext: string,
  masterKeyHex: string,
  context: string,
): string {
  const key = Buffer.from(masterKeyHex, 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  cipher.setAAD(Buffer.from(context, 'utf8'));

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt with an additional associated data (AAD) context.
 */
export function decryptWithContext(
  encryptedBase64: string,
  masterKeyHex: string,
  context: string,
): string {
  const key = Buffer.from(masterKeyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Master key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars)`);
  }

  const packed = Buffer.from(encryptedBase64, 'base64');
  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data: too short');
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(context, 'utf8'));

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

// ─── Password Hashing ───────────────────────────────

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string, rounds: number = 12): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── HMAC ───────────────────────────────────────────

/**
 * Create an HMAC-SHA256 signature.
 */
export function createHmacSignature(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify an HMAC-SHA256 signature using constant-time comparison.
 */
export function verifyHmacSignature(
  data: string,
  secret: string,
  signature: string,
): boolean {
  const expected = createHmacSignature(data, secret);
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || sigBuf.length === 0) {
    return false;
  }
  return timingSafeEqual(expBuf, sigBuf);
}

// ─── Key Derivation ─────────────────────────────────

/**
 * Derive a key from a password using PBKDF2.
 */
export function deriveKey(
  password: string,
  salt?: Buffer,
): { key: Buffer; salt: Buffer } {
  const actualSalt = salt || randomBytes(SALT_LENGTH);
  const key = pbkdf2Sync(password, actualSalt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
  return { key, salt: actualSalt };
}

// ─── Token Generation ───────────────────────────────

/**
 * Generate a cryptographically secure random token.
 */
export function generateToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Generate a URL-safe base64 token.
 */
export function generateUrlSafeToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

// ─── Webhook Signing ────────────────────────────────

/**
 * Sign a webhook payload for delivery verification.
 */
export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number,
): string {
  const signatureInput = `${timestamp}.${payload}`;
  return createHmacSignature(signatureInput, secret);
}

/**
 * Verify a webhook payload signature.
 */
export function verifyWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number,
  signature: string,
  toleranceSeconds: number = 300,
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const signatureInput = `${timestamp}.${payload}`;
  return verifyHmacSignature(signatureInput, secret, signature);
}
