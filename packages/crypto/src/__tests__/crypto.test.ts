import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptWithContext,
  decryptWithContext,
  hashPassword,
  verifyPassword,
  createHmacSignature,
  verifyHmacSignature,
  signWebhookPayload,
  verifyWebhookPayload,
} from '../index';

describe('@umcp/crypto', () => {
  const masterKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  describe('AES-256-GCM Encryption & Decryption', () => {
    it('should encrypt and decrypt a plaintext string correctly', () => {
      const plaintext = 'super-secret-api-key-12345';
      const encrypted = encrypt(plaintext, masterKey);
      expect(encrypted).not.toBe(plaintext);

      const decrypted = decrypt(encrypted, masterKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption if master key is invalid', () => {
      const encrypted = encrypt('test-secret', masterKey);
      const wrongKey = '1111111111111111111111111111111111111111111111111111111111111111';
      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should encrypt and decrypt with AAD context binding', () => {
      const plaintext = 'workspace-oauth-token-xyz';
      const workspaceId = 'ws_12345';

      const encrypted = encryptWithContext(plaintext, masterKey, workspaceId);
      const decrypted = decryptWithContext(encrypted, masterKey, workspaceId);
      expect(decrypted).toBe(plaintext);

      // Decrypting with wrong context should fail
      expect(() => decryptWithContext(encrypted, masterKey, 'ws_wrong')).toThrow();
    });
  });

  describe('Password Hashing (bcrypt)', () => {
    it('should hash and verify passwords', async () => {
      const raw = 'SecurePassword123!';
      const hash = await hashPassword(raw, 4); // 4 rounds for fast tests

      const isValid = await verifyPassword(raw, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('HMAC & Webhook Signing', () => {
    const secret = 'webhook-secret-key-999';

    it('should create and verify HMAC signatures using timingSafeEqual', () => {
      const data = 'payload-data-to-sign';
      const sig = createHmacSignature(data, secret);

      expect(verifyHmacSignature(data, secret, sig)).toBe(true);
      expect(verifyHmacSignature(data, secret, 'invalid_sig')).toBe(false);
    });

    it('should sign and verify webhook payloads with timestamp tolerance', () => {
      const payload = JSON.stringify({ event: 'tool.executed', status: 'success' });
      const timestamp = Math.floor(Date.now() / 1000);

      const signature = signWebhookPayload(payload, secret, timestamp);
      const isValid = verifyWebhookPayload(payload, secret, timestamp, signature, 300);

      expect(isValid).toBe(true);
    });

    it('should reject expired webhook signatures outside tolerance window', () => {
      const payload = JSON.stringify({ event: 'tool.executed' });
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 mins ago

      const signature = signWebhookPayload(payload, secret, expiredTimestamp);
      const isValid = verifyWebhookPayload(payload, secret, expiredTimestamp, signature, 300);

      expect(isValid).toBe(false);
    });
  });
});
